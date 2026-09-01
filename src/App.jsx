import { useEffect, useMemo, useState } from 'react'
import Header from './components/Header.jsx'
import Toolbar from './components/Toolbar.jsx'
import ToolGrid from './components/ToolGrid.jsx'
import LoginView from './components/LoginView.jsx'
import { StarIcon, ClockIcon } from './components/Icons.jsx'
import { SITE, TEAMS, TOOLS } from './config/tools.js'
import { useLocalStorage, useFavorites, useRecents } from './hooks/useLocalStorage.js'
import { useSession } from './hooks/useSession.js'

/* Everything a tool can be matched on, lowercased once up front. */
function searchIndex(tool, teamName) {
  return [tool.name, tool.description, tool.owner, teamName, ...(tool.tags || [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export default function App() {
  const [theme, setTheme] = useLocalStorage('itemhound-hub:theme', 'light')
  const [query, setQuery] = useState('')
  const [activeTeam, setActiveTeam] = useState('all')
  const { status, employee, setEmployee, setStatus, logout } = useSession()

  const { favoriteIds, toggleFavorite, isFavorite } = useFavorites()
  const { recentIds, recordUse, clearRecents } = useRecents(6)

  // Set when a tool's own /sso redirect sent someone here without a
  // session, e.g. https://ai-hub.../login?tool=inventory - read once from
  // the URL the page loaded with, not re-read on every render, since we
  // clear the query string once this has been handled either way.
  const [returnTool] = useState(() => new URLSearchParams(window.location.search).get('tool'))
  // 'pending' until it's clear whether a hand-off is even needed; 'sending'
  // while the redirect URL is being fetched (or once we've kicked off the
  // navigation away); 'done' once there's nothing left to do here - show
  // the grid normally, whether that's because there was no tool param or
  // because the hand-off failed.
  const [handoffState, setHandoffState] = useState(returnTool ? 'pending' : 'done')
  const returnToolInfo = useMemo(
    () => (returnTool ? TOOLS.find((t) => t.sso === returnTool) : null),
    [returnTool]
  )

  useEffect(() => {
    if (!returnTool || status !== 'authed' || handoffState !== 'pending') return
    let cancelled = false
    setHandoffState('sending')
    ;(async () => {
      try {
        const res = await fetch(`/api/sso/${returnTool}`, { credentials: 'same-origin' })
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setHandoffState('done')
          return
        }
        // Full-page navigation back to where the user actually came from -
        // this is a return trip, not opening a new tool, so it replaces
        // this tab rather than opening another one.
        window.location.replace(data.redirectUrl)
      } catch {
        if (!cancelled) setHandoffState('done')
      }
    })()
    // Either way, drop ?tool=... from the address bar so a later reload of
    // the Hub itself doesn't try to bounce the user again.
    window.history.replaceState({}, '', window.location.pathname)
    return () => {
      cancelled = true
    }
  }, [returnTool, status, handoffState])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const teamsById = useMemo(() => Object.fromEntries(TEAMS.map((t) => [t.id, t])), [])

  const indexed = useMemo(
    () => TOOLS.map((tool) => ({ ...tool, _index: searchIndex(tool, teamsById[tool.team]?.name) })),
    [teamsById]
  )

  const counts = useMemo(() => {
    const out = {}
    for (const tool of TOOLS) out[tool.team] = (out[tool.team] || 0) + 1
    return out
  }, [])

  const filtered = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
    return indexed.filter((tool) => {
      if (activeTeam !== 'all' && tool.team !== activeTeam) return false
      return words.every((w) => tool._index.includes(w))
    })
  }, [indexed, query, activeTeam])

  const byId = useMemo(() => Object.fromEntries(indexed.map((t) => [t.id, t])), [indexed])
  const favorites = favoriteIds.map((id) => byId[id]).filter(Boolean)
  const recents = recentIds.map((id) => byId[id]).filter(Boolean)

  const browsing = !query.trim() && activeTeam === 'all'
  const gridProps = { teamsById, isFavorite, onToggleFavorite: toggleFavorite, onOpen: recordUse }

  if (status === 'loading') {
    return <div className="loginscreen loginscreen--checking" aria-live="polite" />
  }

  // Covers both directions: logging in fresh with a ?tool= param, and
  // already having a Hub session when that param shows up (nothing to log
  // into - straight through).
  if (returnTool && (handoffState === 'pending' || handoffState === 'sending') && status === 'authed') {
    return (
      <div className="loginscreen" aria-live="polite">
        <div className="loginscreen__card">
          <p className="loginscreen__subtitle">
            Taking you back to {returnToolInfo ? returnToolInfo.name : 'that tool'}&hellip;
          </p>
        </div>
      </div>
    )
  }

  if (status === 'anon') {
    return (
      <LoginView
        theme={theme}
        returnToolName={returnToolInfo ? returnToolInfo.name : null}
        onLoggedIn={(who) => {
          setEmployee(who)
          setStatus('authed')
        }}
      />
    )
  }

  return (
    <div className="app">
      <Header
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        employee={employee}
        onLogout={logout}
      />

      <main className="main">
        <Toolbar
          query={query}
          onQuery={setQuery}
          teams={TEAMS}
          counts={counts}
          activeTeam={activeTeam}
          onTeam={setActiveTeam}
          total={TOOLS.length}
          showing={filtered.length}
        />

        {browsing && favorites.length > 0 && (
          <section className="section">
            <div className="section__head">
              <h2 className="section__title"><StarIcon filled /> Favorites</h2>
            </div>
            <ToolGrid tools={favorites} {...gridProps} />
          </section>
        )}

        {browsing && recents.length > 0 && (
          <section className="section">
            <div className="section__head">
              <h2 className="section__title"><ClockIcon /> Recently used</h2>
              <button type="button" className="linkbtn" onClick={clearRecents}>Clear</button>
            </div>
            <ToolGrid tools={recents} {...gridProps} />
          </section>
        )}

        {filtered.length === 0 ? (
          <div className="empty">
            <p className="empty__title">No tools match that.</p>
            <p className="empty__body">
              Try a different word, or clear the team filter. To add a tool, edit
              <code> src/config/tools.js</code>.
            </p>
          </div>
        ) : browsing ? (
          TEAMS.filter((team) => counts[team.id]).map((team) => (
            <section className="section" key={team.id}>
              <div className="section__head">
                <h2 className="section__title">{team.name}</h2>
                <span className="section__blurb">{team.blurb}</span>
              </div>
              <ToolGrid tools={filtered.filter((t) => t.team === team.id)} {...gridProps} />
            </section>
          ))
        ) : (
          <section className="section">
            <div className="section__head">
              <h2 className="section__title">
                {activeTeam === 'all' ? 'Results' : teamsById[activeTeam]?.name}
              </h2>
            </div>
            <ToolGrid tools={filtered} {...gridProps} />
          </section>
        )}
      </main>

      <footer className="footer">
        <p>{SITE.footerNote}</p>
        <p className="footer__meta">ITEMHOUND &middot; internal use</p>
      </footer>
    </div>
  )
}
