import { useState } from 'react'
import logoColor from '../assets/logos/full-logo-color.png'
import logoWhite from '../assets/logos/full-logo-white.png'

// Shown once, right after someone's first Microsoft sign-in: their account
// exists and is signed in, but nothing yet ties it to the employee number
// this system identifies people by (borrowing, reservations, exports all
// key on it). Saving it here writes it straight to their employees record -
// no admin step - and it's write-once, so a later correction is an admin's
// job in MongoDB rather than something to redo from this screen.
export default function EmployeeIdView({ theme, employee, onTagged, onLogout }) {
  const [employeeId, setEmployeeId] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await fetch('/api/auth/employee-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ employeeId: employeeId.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Could not save that employee number.')
        // A conflict that still came back with a real identity means the
        // account was already tagged (an admin, or another tab) - take it
        // and move on rather than stranding someone on this card.
        if (data.employee) onTagged(data.employee)
        return
      }
      onTagged(data)
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
        <h1 className="loginscreen__title">One more thing</h1>
        <p className="loginscreen__subtitle">
          {employee?.name ? `Welcome, ${employee.name}. ` : ''}
          Enter your employee number so we can link it to your account.
        </p>

        <form onSubmit={handleSubmit} className="loginscreen__form">
          <label htmlFor="employeeNumber">Employee number</label>
          <input
            id="employeeNumber"
            type="text"
            autoComplete="off"
            autoFocus
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            required
          />

          <button type="submit" disabled={busy || !employeeId.trim()}>
            {busy ? 'Saving...' : 'Save and continue'}
          </button>
          {error && <p className="loginscreen__error">{error}</p>}
        </form>

        <p className="loginscreen__hint">
          You only do this once. If you get it wrong, ask an admin to correct it.
        </p>
        {/* Without this there's no way off this screen for someone who can't
            complete it (a reserved number, or the wrong account signed in). */}
        <p className="loginscreen__hint">
          <button type="button" className="linkbtn linkbtn--inline" onClick={onLogout}>
            Sign out
          </button>
          {employee?.email ? ` (${employee.email})` : ''}
        </p>
      </div>
    </div>
  )
}
