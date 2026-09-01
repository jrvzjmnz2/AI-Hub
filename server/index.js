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

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 8787
const DIST_DIR = path.join(__dirname, '..', 'dist')

app.use(express.json())
app.use(cookieParser())

// ---------------------------------------------------------------------
// Auth - checks the same `employees` collection the inventory app (and
// any future tool) uses, so an employee's one account works everywhere.
// This is the one deliberate exception to "each app owns its own data and
// exposes an API for it": a shared identity/permissions store is what
// every app is meant to trust, by design, not a shortcut around it.
// ---------------------------------------------------------------------

app.post('/api/auth/login', async (req, res) => {
  try {
    const { employeeId, password } = req.body || {}
    if (!employeeId || !password) {
      return res.status(400).json({ message: 'Employee ID and password are required.' })
    }
    const employees = getDb().collection('employees')
    const employee = await employees.findOne({ employeeId })
    if (!employee) {
      return res.status(401).json({ message: 'Invalid Employee ID or password.' })
    }
    const match = await bcrypt.compare(password, employee.password)
    if (!match) {
      return res.status(401).json({ message: 'Invalid Employee ID or password.' })
    }
    const identity = { employeeId: employee.employeeId, name: employee.name }
    setSessionCookie(res, identity)
    res.json(identity)
  } catch (err) {
    res.status(500).json({ message: 'Server error while logging in.', error: err.message })
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

app.get('/api/auth/me', (req, res) => {
  const employee = readSession(req)
  if (!employee) return res.status(401).json({ message: 'Not logged in.' })
  res.json(employee)
})

// Mints a one-time hand-off token for an SSO-enabled tool and hands back
// the URL to send the browser to. The tool itself verifies the token and
// turns it into its own session - the Hub never touches that app's cookie.
app.get('/api/sso/:toolId', requireSession, (req, res) => {
  const baseUrl = getToolBaseUrl(req.params.toolId)
  if (!baseUrl) {
    return res.status(404).json({ message: `No SSO-enabled tool registered as "${req.params.toolId}".` })
  }
  const token = mintSsoToken(req.employee, req.params.toolId)
  res.json({ redirectUrl: `${baseUrl}/sso?token=${encodeURIComponent(token)}` })
})

// Built React app - everything that isn't an API route above falls through
// to here. SPA fallback (serving index.html for any other GET) is future
// -proofing in case the Hub ever grows real client-side routes.
app.use(express.static(DIST_DIR))
app.get('*', (req, res) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'))
})

connectToDatabase()
  .then(() => {
    console.log(`Connected to MongoDB database "${DB_NAME}"`)
    app.listen(PORT, () => {
      console.log(`AI Hub server running at http://localhost:${PORT}`)
    })
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message)
    console.error('Make sure MONGO_URI (and MONGO_DB_NAME) in .env are correct and reachable.')
    process.exit(1)
  })
