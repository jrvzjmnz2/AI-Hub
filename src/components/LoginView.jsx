import { useState } from 'react'
import logoColor from '../assets/logos/full-logo-color.png'
import logoWhite from '../assets/logos/full-logo-white.png'

export default function LoginView({ theme, onLoggedIn, returnToolName }) {
  const [employeeId, setEmployeeId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

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
        setError(data.message || 'Login failed.')
        return
      }
      onLoggedIn(data)
    } catch {
      setError('Could not reach the server. Is it running?')
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
            : 'Sign in with your employee account'}
        </p>

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
            {busy ? 'Signing in...' : 'Log In'}
          </button>
          {error && <p className="loginscreen__error">{error}</p>}
        </form>

        <p className="loginscreen__hint">
          New employee? Register in the Equipment Inventory app, then sign in here.
        </p>
      </div>
    </div>
  )
}
