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

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
    } finally {
      setEmployee(null)
      setStatus('anon')
    }
  }, [])

  return { status, employee, setEmployee, setStatus, refresh, logout }
}
