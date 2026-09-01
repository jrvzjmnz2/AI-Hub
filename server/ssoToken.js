// Mints the short-lived token that hands a confirmed login off to another
// app. Deliberately narrow: short expiry, and an `audience` claim naming
// exactly which app it's for, so a token meant for one tool can't be replayed
// against another. SSO_SHARED_SECRET must match the value configured on
// whichever app's base URL is being minted for.
import jwt from 'jsonwebtoken'

const SSO_SHARED_SECRET = process.env.SSO_SHARED_SECRET

if (!SSO_SHARED_SECRET) {
  console.warn('SSO_SHARED_SECRET is not set - hand-off to other apps will not work.')
}

export function mintSsoToken(employee, audience) {
  return jwt.sign(
    { employeeId: employee.employeeId ?? null, name: employee.name, email: employee.email },
    SSO_SHARED_SECRET,
    { expiresIn: '60s', audience }
  )
}
