import { useCallback, useEffect, useState } from 'react'

/**
 * State that survives a reload. Storage can be unavailable (private windows,
 * blocked site data), so every read and write is guarded.
 */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key)
      return raw === null ? initialValue : JSON.parse(raw)
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* storage unavailable - the app still works, it just forgets */
    }
  }, [key, value])

  return [value, setValue]
}

/** Favorites, kept as a list of tool ids. */
export function useFavorites() {
  const [ids, setIds] = useLocalStorage('itemhound-hub:favorites', [])
  const toggle = useCallback(
    (id) => setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
    [setIds]
  )
  return { favoriteIds: ids, toggleFavorite: toggle, isFavorite: (id) => ids.includes(id) }
}

/** Recently opened tools, most recent first, capped. */
export function useRecents(limit = 6) {
  const [ids, setIds] = useLocalStorage('itemhound-hub:recents', [])
  const record = useCallback(
    (id) => setIds((prev) => [id, ...prev.filter((x) => x !== id)].slice(0, limit)),
    [setIds, limit]
  )
  const clear = useCallback(() => setIds([]), [setIds])
  return { recentIds: ids, recordUse: record, clearRecents: clear }
}
