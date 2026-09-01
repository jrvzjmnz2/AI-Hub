import { useEffect, useState } from 'react'
import logoColor from '../assets/logos/full-logo-color.png'
import logoWhite from '../assets/logos/full-logo-white.png'
import { MicrosoftIcon } from './Icons.jsx'

// Microsoft sign-in is a real full-page navigation to /auth/microsoft, not a
// fetch - it has to leave this origin entirely to reach Microsoft's own login
// page, then comes back through /auth/microsoft/callback on the server.
// Whatever tool the user was trying to reach (see App.jsx's returnTool) rides
// along as ?tool=... so the same hand-off flow picks up where it left off once
// they land back here signed in.
//
// The manual employee-ID + password form below it only exists when the server
// says so (ALLOW_PASSWORD_LOGIN) - the client can't read env vars, so it asks
// /api/auth/methods. Until that answers, only the Microsoft button shows,
// which is the right thing to render if the answer never arrives.
export default function LoginView({ theme, returnToolName, ssoError, onLoggedIn }) {
  const tool = new URLSearchParams(window.location.search).get('tool') || ''
  const signInHref = tool ? `/auth/microsoft?tool=${encodeURIComponent(tool)}` : '/auth/microsoft'

  // null until the server has said which methods exist - rendering nothing
  // for that moment beats flashing a Microsoft button that this server can't
  // actually complete (it has no Azure app registration configured), or
  // flashing a password form that's switched off.
  const [methods, setMethods] = useState(null)
  const [employeeId, setEmployeeId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/auth/methods', { credentials: 'same-origin' })
        if (!res.ok) throw new Error('methods unavailable')
        const data = await res.json()
        if (!cancelled) setMethods({ microsoft: !!data.microsoft, password: !!data.password })
      } catch {
        // Couldn't ask. Microsoft sign-in is the normal path, so offer it
        // rather than a card with nothing on it - if it really isn't
        // configured, that route redirects back here with an explanation.
        if (!cancelled) setMethods({ microsoft: true, password: false })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ employeeId: employeeId.trim(), password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Sign-in failed.')
        return
      }
      onLoggedIn(data)
    } catch {
      setError('Could not reach the server. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="loginscreen">
      <div className="loginscreen__card">
        <img
          className="loginscreen__logo"
          src={theme === 'dark' ? logoWhite : logoColor}
          alt="ITEMHOUND"
          width="1850"
          height="319"
        />
        <h1 className="loginscreen__title">AI Hub</h1>
        <p className="loginscreen__subtitle">
          {returnToolName
            ? `Sign in to continue to ${returnToolName}`
            : 'Sign in with your ITEMHOUND account'}
        </p>

        {methods?.microsoft && (
          <a className="msftbtn" href={signInHref}>
            <MicrosoftIcon />
            Sign in with Microsoft
          </a>
        )}

        {ssoError && <p className="loginscreen__error">{ssoError}</p>}

        {methods && !methods.microsoft && !methods.password && (
          <p className="loginscreen__error">
            No sign-in method is enabled on this server yet. An administrator needs to either
            configure Microsoft sign-in or switch on manual sign-in.
          </p>
        )}

        {methods?.password && (
          <>
            {/* Only a divider when there's actually something above it. */}
            {methods.microsoft && (
              <div className="loginscreen__or" role="separator">
                <span>or</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="loginscreen__form">
              <label htmlFor="employeeId">Employee ID</label>
              <input
                id="employeeId"
                type="text"
                autoComplete="username"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                required
              />

              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <button type="submit" disabled={busy}>
                {busy ? 'Signing in...' : 'Sign in'}
              </button>
              {error && <p className="loginscreen__error">{error}</p>}
            </form>
          </>
        )}

        {methods && (methods.microsoft || methods.password) && (
          <p className="loginscreen__hint">
            {methods.microsoft && methods.password
              ? 'Microsoft sign-in uses your @itemhound.com account. Manual sign-in is for older accounts that still have a password.'
              : methods.microsoft
                ? 'Use your @itemhound.com Microsoft account.'
                : 'Sign in with your employee ID and password.'}
          </p>
        )}
      </div>
    </div>
  )
}
