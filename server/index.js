import 'dotenv/config'
import path from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import cookieParser from 'cookie-parser'
import bcrypt from 'bcryptjs'
import { connectToDatabase, getDb, DB_NAME } from './db.js'
import { setSessionCookie, clearSessionCookie, readSession, requireSession } from './auth.js'
import { mintSsoToken } from './ssoToken.js'
import { getToolBaseUrl, getAllToolBaseUrls } from './toolRegistry.js'
import { getMsalClient, isMicrosoftConfigured, MSAL_SCOPES } from './msalClient.js'
import { signOAuthState, verifyOAuthState } from './oauthState.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

// Render (and most PaaS hosts) terminate HTTPS at their own edge, then
// forward the request to this container over plain HTTP, adding an
// X-Forwarded-Proto header to say what the original scheme really was.
// Express ignores that header unless told to trust it - without this,
// req.protocol always reports "http" here, even for a real https visitor.
// That breaks the self-referential URL /api/auth/logout-chain builds
// (${req.protocol}://${req.get('host')}), which gets passed to the
// inventory app's /logout?returnTo=... - its safety check there requires
// an exact HUB_URL prefix match, so a wrong "http://" scheme fails it
// silently and the chain never reaches finish-logout, leaving the Hub's
// own session cookie uncleared. "1" trusts exactly one hop of proxy
// (Render's own edge), which is what's actually in front of this app.
app.set('trust proxy', 1)

const PORT = process.env.PORT || 8787
const DIST_DIR = path.join(__dirname, '..', 'dist')

// Only accounts on this domain may sign in - checked again here even
// though the Azure app registration is itself restricted to the
// itemhound.com tenant, in case that tenant ever adds a guest account
// from another domain.
const ALLOWED_EMAIL_DOMAIN = (process.env.ALLOWED_EMAIL_DOMAIN || 'itemhound.com').toLowerCase()

// Must exactly match a Redirect URI registered on the Azure app (scheme,
// host and path all have to line up character-for-character) - deliberately
// a fixed env var rather than derived from the request, since this value
// feeds directly into the OAuth flow.
const AZURE_REDIRECT_URI = process.env.AZURE_REDIRECT_URI

// Employee numbers nobody may claim through the self-service card - an
// admin has to set these directly in MongoDB. "Admin" is here because the
// inventory app grants its admin powers to exactly that employeeId
// (constants.js there), so letting anyone type it into a public form would
// be a straight privilege escalation.
const RESERVED_EMPLOYEE_IDS = (process.env.RESERVED_EMPLOYEE_IDS || 'Admin')
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean)

// Deliberately permissive - this only rules out the shapes that would cause
// trouble downstream (empty, absurdly long, or characters that make an ID
// awkward to use in a URL or a CSV export). Loosen it here if real employee
// numbers ever need spaces or other characters.
const EMPLOYEE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$/

// The manual employee-ID + password sign-in, off unless explicitly switched
// on. It's a second door that bypasses the Microsoft domain restriction
// entirely, so "unset" has to mean closed - only the literal string 'true'
// opens it. Flipping this on Render restarts the service, which is what
// makes the change take effect; the per-request check in loadEmployee()
// means sessions handed out while it was on stop working immediately
// afterwards rather than lingering for their full 12h.
//
// Only accounts that already carry a bcrypt `password` hash can use it -
// nothing in either app creates one any more (the old registration page is
// gone), so in practice that means pre-Microsoft-SSO accounts only.
const ALLOW_PASSWORD_LOGIN = String(process.env.ALLOW_PASSWORD_LOGIN).trim().toLowerCase() === 'true'

app.use(express.json())
app.use(cookieParser())

// ---------------------------------------------------------------------
// Auth - checks the same `employees` collection the inventory app (and
// any future tool) uses, so an employee's one account works everywhere.
// This is the one deliberate exception to "each app owns its own data and
// exposes an API for it": a shared identity/permissions store is what
// every app is meant to trust, by design, not a shortcut around it.
// ---------------------------------------------------------------------

// Kicks off "Sign in with Microsoft". ?tool=<id> (set when a tool's own
// requirePageSession redirected here) travels through the whole Microsoft
// round trip inside the signed `state` param, since the browser leaves this
// domain entirely and there's no session yet to stash it in server-side.
app.get('/auth/microsoft', async (req, res) => {
  const msal = getMsalClient()
  if (!msal) {
    return res.redirect(
      '/?ssoError=' + encodeURIComponent("Microsoft sign-in isn't set up on this server yet.")
    )
  }
  const tool = typeof req.query.tool === 'string' ? req.query.tool : ''
  const state = signOAuthState({ tool })
  try {
    const url = await msal.getAuthCodeUrl({
      scopes: MSAL_SCOPES,
      redirectUri: AZURE_REDIRECT_URI,
      state,
      prompt: 'select_account',
    })
    res.redirect(url)
  } catch (err) {
    console.error('Could not start Microsoft sign-in:', err)
    res.redirect('/?ssoError=' + encodeURIComponent('Could not start Microsoft sign-in. Try again.'))
  }
})

// Where Microsoft sends the browser back after the person signs in there.
// Verifies the code, checks the account is really on this company's
// domain, and upserts the employees record before issuing this app's own
// session - Microsoft is only ever consulted here, never trusted directly
// by any other route.
app.get('/auth/microsoft/callback', async (req, res) => {
  const msal = getMsalClient()
  if (!msal) {
    return res.redirect(
      '/?ssoError=' + encodeURIComponent("Microsoft sign-in isn't set up on this server yet.")
    )
  }

  const { code, state, error, error_description: errorDescription } = req.query

  if (error) {
    return res.redirect('/?ssoError=' + encodeURIComponent(errorDescription || String(error)))
  }

  const parsedState = verifyOAuthState(typeof state === 'string' ? state : null)
  if (!code || !parsedState) {
    return res.redirect('/?ssoError=' + encodeURIComponent('Your sign-in attempt expired - try again.'))
  }

  try {
    const result = await msal.acquireTokenByCode({
      code: String(code),
      scopes: MSAL_SCOPES,
      redirectUri: AZURE_REDIRECT_URI,
    })

    const claims = result.account?.idTokenClaims || {}
    const email = String(claims.preferred_username || claims.email || '').toLowerCase()
    const name = claims.name || email
    const oid = claims.oid

    if (!email || !email.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)) {
      return res.redirect(
        '/?ssoError=' + encodeURIComponent(`Only @${ALLOWED_EMAIL_DOMAIN} accounts can sign in here.`)
      )
    }

    // One employees document per Microsoft identity (matched on email,
    // which is what an admin recognizes when tagging an account by hand).
    // employeeId is deliberately left unset on first login - see the
    // partial unique index in the inventory app's db.js, which allows any
    // number of untagged accounts to coexist. An admin assigns employeeId
    // directly in MongoDB once they know who this person is; everything
    // that strictly requires employeeId (e.g. Inventory's admin actions)
    // simply won't work for this account until then, by design.
    const employees = getDb().collection('employees')
    const now = new Date()
    await employees.updateOne(
      { email },
      { $set: { email, name, microsoftOid: oid, lastLoginAt: now }, $setOnInsert: { createdAt: now } },
      { upsert: true }
    )
    const employeeDoc = await employees.findOne({ email })

    setSessionCookie(res, { employeeId: employeeDoc.employeeId ?? null, name: employeeDoc.name, email })

    // Landing back on `/?tool=<id>` re-enters the exact same returnTool
    // hand-off flow in App.jsx that already runs when someone had a live
    // Hub session all along - nothing else needs to change for that case.
    res.redirect(parsedState.tool ? `/?tool=${encodeURIComponent(parsedState.tool)}` : '/')
  } catch (err) {
    console.error('Microsoft sign-in failed:', err)
    res.redirect('/?ssoError=' + encodeURIComponent('Microsoft sign-in failed. Try again.'))
  }
})

// Which sign-in methods the login screen should offer. Public on purpose -
// it reveals only whether a second sign-in form is switched on, which is
// visible from the form's presence anyway.
app.get('/api/auth/methods', (req, res) => {
  res.json({ microsoft: isMicrosoftConfigured(), password: ALLOW_PASSWORD_LOGIN })
})

// Manual sign-in against the bcrypt hash stored on an employees document.
// Gated by ALLOW_PASSWORD_LOGIN; when that's off this behaves as though the
// route doesn't exist, so a probe can't tell enabled-but-wrong-password
// from disabled.
app.post('/api/auth/login', async (req, res) => {
  if (!ALLOW_PASSWORD_LOGIN) {
    return res.status(404).json({ message: 'Manual sign-in is turned off. Use Microsoft sign-in.' })
  }
  try {
    const { employeeId, password } = req.body || {}
    if (!employeeId || !password) {
      return res.status(400).json({ message: 'Employee ID and password are required.' })
    }

    const employees = getDb().collection('employees')
    const employee = await employees.findOne({ employeeId: String(employeeId).trim() })

    // One message for every failure below - no account, no password set on
    // it, or the wrong password all read the same from outside, so this
    // can't be used to enumerate which employee IDs exist.
    const rejection = { message: 'Invalid Employee ID or password.' }
    if (!employee || !employee.password) {
      return res.status(401).json(rejection)
    }
    const match = await bcrypt.compare(String(password), employee.password)
    if (!match) {
      return res.status(401).json(rejection)
    }

    const identity = {
      employeeId: employee.employeeId,
      name: employee.name,
      email: employee.email,
      via: 'password',
    }
    setSessionCookie(res, identity)
    res.json(identity)
  } catch (err) {
    res.status(500).json({ message: 'Server error while signing in.', error: err.message })
  }
})

app.post('/api/auth/logout', (req, res) => {
  clearSessionCookie(res)
  res.json({ ok: true })
})

// Logging out here should log out of every SSO-enabled tool too, not just
// the Hub - otherwise someone's Inventory session (a separate cookie, on a
// separate domain) would quietly outlive their Hub session for up to its
// own 12h. A background fetch to each tool's own logout endpoint can't do
// this reliably: it's a cross-site request, and browsers increasingly
// refuse to send or accept cookies on those (third-party cookie blocking,
// this cookie's own SameSite=Lax) regardless of any CORS configuration.
// A real top-level navigation to that tool's own domain has none of those
// restrictions, so instead this builds one redirect chain through every
// registered tool's own GET /logout, each hop clearing that tool's cookie
// server-side and then redirecting on to the next - finishing back here at
// /api/auth/finish-logout, which clears the Hub's own session the same way.
//
// Chained as u1/logout?returnTo=u2/logout?returnTo=...finishUrl, built from
// the end backwards so each hop's returnTo already points at the next one.
app.get('/api/auth/logout-chain', requireSession, (req, res) => {
  const selfBase = `${req.protocol}://${req.get('host')}`
  let next = `${selfBase}/api/auth/finish-logout`
  const targets = getAllToolBaseUrls()
  for (let i = targets.length - 1; i >= 0; i--) {
    next = `${targets[i]}/logout?returnTo=${encodeURIComponent(next)}`
  }
  res.json({ nextUrl: next })
})

// Reached only after every tool ahead of it in the chain has already
// cleared its own cookie (or there were none configured). No returnTo here
// - this is always the last stop, back at the Hub's own login screen.
app.get('/api/auth/finish-logout', (req, res) => {
  clearSessionCookie(res)
  res.redirect('/')
})

// The session cookie is proof of WHO signed in (an email Microsoft
// confirmed); it is not the source of truth for their employeeId, which an
// admin can change in MongoDB at any time and which the card below sets
// after the cookie was already issued. So identity is always re-read from
// the employees collection rather than trusted from the cookie's own claim
// - one cheap lookup, and no stale employeeId anywhere.
async function loadEmployee(req, res) {
  const session = readSession(req)
  if (!session) return null

  // Switching manual sign-in off has to take effect for people already
  // holding a manual session, not just for new sign-ins.
  if (session.via === 'password' && !ALLOW_PASSWORD_LOGIN) {
    clearSessionCookie(res)
    return null
  }

  // Microsoft sessions are keyed on the email Microsoft confirmed; manual
  // sessions on the employeeId that was signed in with (a legacy account
  // may have no email at all). Matching { email: undefined } would match
  // any document simply missing the field, so each case gets its own
  // explicit filter and anything with neither is treated as no session.
  let filter = null
  if (session.email) filter = { email: session.email }
  else if (session.employeeId) filter = { employeeId: session.employeeId }
  if (!filter) {
    clearSessionCookie(res)
    return null
  }

  const doc = await getDb().collection('employees').findOne(filter)
  if (!doc) {
    // Account removed since the cookie was issued.
    clearSessionCookie(res)
    return null
  }
  return {
    employeeId: doc.employeeId ?? null,
    name: doc.name,
    email: doc.email,
    via: session.via,
  }
}

app.get('/api/auth/me', async (req, res) => {
  try {
    const employee = await loadEmployee(req, res)
    if (!employee) return res.status(401).json({ message: 'Not logged in.' })
    res.json(employee)
  } catch (err) {
    res.status(500).json({ message: 'Server error while checking your session.', error: err.message })
  }
})

// Self-service half of "tag an employeeId to this Microsoft account": the
// Hub shows a card asking for it on the first sign-in (see EmployeeIdView
// on the client), and this writes it once. Deliberately write-once - a
// correction after the fact is an admin's job in MongoDB, not something
// someone can do to themselves after records already reference the old ID.
app.post('/api/auth/employee-id', requireSession, async (req, res) => {
  const employeeId = typeof req.body?.employeeId === 'string' ? req.body.employeeId.trim() : ''

  if (!employeeId) {
    return res.status(400).json({ message: 'Enter your employee number.' })
  }
  if (!EMPLOYEE_ID_PATTERN.test(employeeId)) {
    return res.status(400).json({
      message: 'Use letters, numbers, dots, dashes or underscores only (up to 32 characters).',
    })
  }
  if (RESERVED_EMPLOYEE_IDS.includes(employeeId.toLowerCase())) {
    return res.status(403).json({ message: 'That employee number can only be assigned by an admin.' })
  }

  try {
    const employees = getDb().collection('employees')
    const mine = await loadEmployee(req, res)
    if (!mine) return res.status(401).json({ message: 'Not logged in.' })

    // Already tagged (an admin set it, or another tab just did): re-issue
    // the cookie so it stops being stale, and hand the real identity back
    // rather than leaving the card on screen with an error and no way out.
    if (mine.employeeId) {
      setSessionCookie(res, mine)
      return res.status(409).json({
        message: `Your account already has employee number ${mine.employeeId}.`,
        employee: mine,
      })
    }

    const taken = await employees.findOne({ employeeId }, { projection: { _id: 1 } })
    if (taken) {
      return res
        .status(409)
        .json({ message: `Employee number ${employeeId} is already registered to someone else.` })
    }

    // Filtered on "still untagged" ({ employeeId: null } also matches a
    // document with no employeeId field at all), so two tabs racing can't
    // both write - the second one matches nothing.
    const result = await employees.updateOne(
      { email: mine.email, employeeId: null },
      { $set: { employeeId, updatedAt: new Date() } }
    )
    if (result.matchedCount === 0) {
      return res.status(409).json({ message: 'Your account just changed - reload the page and try again.' })
    }

    const identity = { employeeId, name: mine.name, email: mine.email, via: mine.via }
    setSessionCookie(res, identity)
    res.json(identity)
  } catch (err) {
    // The unique index is the real arbiter of "already taken" - two
    // simultaneous claims get here rather than failing the check above.
    if (err && err.code === 11000) {
      return res
        .status(409)
        .json({ message: `Employee number ${employeeId} is already registered to someone else.` })
    }
    res.status(500).json({ message: 'Server error while saving your employee number.', error: err.message })
  }
})

// Mints a one-time hand-off token for an SSO-enabled tool and hands back
// the URL to send the browser to. The tool itself verifies the token and
// turns it into its own session - the Hub never touches that app's cookie.
app.get('/api/sso/:toolId', requireSession, async (req, res) => {
  const baseUrl = getToolBaseUrl(req.params.toolId)
  if (!baseUrl) {
    return res.status(404).json({ message: `No SSO-enabled tool registered as "${req.params.toolId}".` })
  }
  try {
    // Minted from the employees collection, not from the cookie - so a
    // just-tagged employeeId is already in the token the tool receives.
    const employee = await loadEmployee(req, res)
    if (!employee) return res.status(401).json({ message: 'Not logged in.' })
    const token = mintSsoToken(employee, req.params.toolId)
    res.json({ redirectUrl: `${baseUrl}/sso?token=${encodeURIComponent(token)}` })
  } catch (err) {
    res.status(500).json({ message: 'Server error while starting sign-on.', error: err.message })
  }
})

// Built React app - everything that isn't an API route above falls through
// to here. SPA fallback (serving index.html for any other GET) is future
// -proofing in case the Hub ever grows real client-side routes.
app.use(express.static(DIST_DIR))
app.get('*', (req, res) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'))
})

function reportSignInMethods() {
  const microsoft = isMicrosoftConfigured()
  console.log(`Sign-in methods: Microsoft=${microsoft ? 'on' : 'OFF'}, manual password=${ALLOW_PASSWORD_LOGIN ? 'on' : 'OFF'}`)
  if (!microsoft) {
    console.log(
      '  Microsoft sign-in is off because AZURE_TENANT_ID / AZURE_CLIENT_ID / ' +
        'AZURE_CLIENT_SECRET / AZURE_REDIRECT_URI are not all set. The app runs ' +
        'fine without them - see "Running without Microsoft sign-in yet" in the README.'
    )
  }
  if (!microsoft && !ALLOW_PASSWORD_LOGIN) {
    console.warn(
      '  WARNING: no sign-in method is enabled, so nobody can log in. Set ' +
        'ALLOW_PASSWORD_LOGIN=true to allow employee-ID + password sign-in, or ' +
        'configure the Azure variables above.'
    )
  }
}

connectToDatabase()
  .then(() => {
    console.log(`Connected to MongoDB database "${DB_NAME}"`)
    reportSignInMethods()
    app.listen(PORT, () => {
      console.log(`AI Hub server running at http://localhost:${PORT}`)
    })
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message)
    console.error('Make sure MONGO_URI (and MONGO_DB_NAME) in .env are correct and reachable.')
    process.exit(1)
  })
