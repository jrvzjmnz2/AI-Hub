// The Hub's own session - separate secret from any other app, and separate
// from SSO_SHARED_SECRET (which is only for the brief hand-off token, see
// ssoToken.js). A leak of one app's session secret can't be used to forge
// sessions on another app.
import jwt from 'jsonwebtoken'

const SESSION_SECRET = process.env.SESSION_SECRET
const SESSION_COOKIE = 'hub_session'

if (!SESSION_SECRET) {
  console.warn('SESSION_SECRET is not set - sessions cannot be signed. Add it to .env.')
}

export function setSessionCookie(res, employee) {
  const token = jwt.sign(
    {
      employeeId: employee.employeeId ?? null,
      name: employee.name,
      email: employee.email,
      // 'microsoft' or 'password' - recorded so the server can tell a
      // manual sign-in apart later and stop honouring it the moment
      // ALLOW_PASSWORD_LOGIN goes false, rather than letting a cookie
      // issued while it was on keep working for its full 12h.
      via: employee.via || 'microsoft',
    },
    SESSION_SECRET,
    { expiresIn: '12h' }
  )
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 12 * 60 * 60 * 1000,
  })
}

export function clearSessionCookie(res) {
  // Must match the options passed to res.cookie() above (minus
  // expires/maxAge) - Express only recognizes it as the same cookie,
  // and actually clears it in the browser, if these line up.
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  })
}

export function readSession(req) {
  const token = req.cookies && req.cookies[SESSION_COOKIE]
  if (!token) return null
  try {
    const payload = jwt.verify(token, SESSION_SECRET)
    return {
      employeeId: payload.employeeId ?? null,
      name: payload.name,
      email: payload.email,
      via: payload.via || 'microsoft',
    }
  } catch {
    return null
  }
}

export function requireSession(req, res, next) {
  const employee = readSession(req)
  if (!employee) return res.status(401).json({ message: 'Not logged in.' })
  req.employee = employee
  next()
}
