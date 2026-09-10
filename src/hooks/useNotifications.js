import { useCallback, useEffect, useRef, useState } from 'react'

const POLL_MS = 60000

// Notifications come from the Hub's own aggregator endpoint, which is what
// talks to each tool (see /api/notifications server-side). The browser
// deliberately never calls a tool's API itself - those are separate sites,
// so it wouldn't be allowed to send its cookies there anyway.
export function useNotifications(enabled) {
  const [notifications, setNotifications] = useState([])
  const [sources, setSources] = useState([])
  const [loaded, setLoaded] = useState(false)
  // Locally hidden ids, so a dismissal feels instant even though the real
  // record of it lives in the tool that raised it.
  const [hidden, setHidden] = useState(() => new Set())
  const timerRef = useRef(null)

  const refresh = useCallback(async () => {
    if (!enabled) return
    try {
      const res = await fetch('/api/notifications', { credentials: 'same-origin' })
      if (!res.ok) return
      const data = await res.json()
      setNotifications(Array.isArray(data.notifications) ? data.notifications : [])
      setSources(Array.isArray(data.sources) ? data.sources : [])
    } catch {
      // Leave whatever was last known on screen rather than blanking the
      // bar on one failed poll.
    } finally {
      setLoaded(true)
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return undefined
    refresh()
    timerRef.current = setInterval(refresh, POLL_MS)
    // Coming back to a tab that's been in the background is exactly when
    // the bar is most likely to be stale.
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timerRef.current)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [enabled, refresh])

  const dismiss = useCallback(async (notification) => {
    setHidden((prev) => new Set(prev).add(notification.id))
    try {
      await fetch('/api/notifications/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ toolId: notification.toolId, id: notification.id }),
      })
    } catch {
      // It's hidden locally either way; the next poll will tell the truth.
    }
  }, [])

  const visible = notifications.filter((n) => !hidden.has(n.id))

  return { notifications: visible, sources, loaded, dismiss, refresh }
}
