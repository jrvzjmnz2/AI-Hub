import { useCallback, useEffect, useState } from 'react'

// status: 'loading' while the initial check is in flight, then 'anon' or
// 'authed'. The Hub's own httpOnly session cookie is what /api/auth/me
// checks - there's nothing readable in the browser to spoof.
export function useSession() {
  const [status, setStatus] = useState('loading')
  const [employee, setEmployee] = useState(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'same-origin' })
      if (res.ok) {
        setEmployee(await res.json())
        setStatus('authed')
      } else {
        setEmployee(null)
        setStatus('anon')
      }
    } catch {
      setEmployee(null)
      setStatus('anon')
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Logs out of every SSO-enabled tool, not just the Hub - see
  // /api/auth/logout-chain server-side for why this is a real page
  // navigation through each tool's own domain rather than a background
  // fetch (cross-site cookie clearing over fetch is unreliable in modern
  // browsers regardless of CORS). This function navigates away; it doesn't
  // return control to the caller on the happy path.
  const logout = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/logout-chain', { credentials: 'same-origin' })
      const data = await res.json()
      if (res.ok && data.nextUrl) {
        window.location.href = data.nextUrl
        return
      }
    } catch {
      // fall through to the local-only fallback below
    }
    // Couldn't even start the chain (e.g. session already gone) - at least
    // clear the Hub's own cookie so this browser stops looking authed.
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
    } finally {
      setEmployee(null)
      setStatus('anon')
    }
  }, [])

  return { status, employee, setEmployee, setStatus, refresh, logout }
}
