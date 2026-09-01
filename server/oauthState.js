// The Microsoft sign-in round trip leaves this app's domain entirely (the
// browser goes to login.microsoftonline.com and back), so there's no
// server-side session yet to stash anything in when the request for
// /auth/microsoft is made. Instead, whatever needs to survive the round
// trip - a CSRF nonce, and which tool (if any) the user was trying to
// reach - travels in the OAuth `state` parameter itself, self-verified via
// signature rather than looked up server-side. Deliberately short-lived:
// this only needs to live for as long as an actual Microsoft sign-in takes.
import jwt from 'jsonwebtoken'

const SESSION_SECRET = process.env.SESSION_SECRET

export function signOAuthState(payload) {
  return jwt.sign(payload, SESSION_SECRET, { expiresIn: '10m' })
}

// Returns the payload on a valid, unexpired state, or null - never throws,
// so the callback route can just treat a bad/missing state as "start over".
export function verifyOAuthState(state) {
  if (!state || typeof state !== 'string') return null
  try {
    return jwt.verify(state, SESSION_SECRET)
  } catch {
    return null
  }
}
