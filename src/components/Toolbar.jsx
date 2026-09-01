import { SearchIcon, CloseIcon } from './Icons.jsx'

export default function Toolbar({ query, onQuery, teams, counts, activeTeam, onTeam, total, showing }) {
  return (
    <div className="toolbar">
      <div className="search">
        <SearchIcon className="search__icon" />
        <input
          type="search"
          className="search__input"
          placeholder="Search tools, teams or keywords..."
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          aria-label="Search tools"
        />
        {query && (
          <button type="button" className="search__clear" onClick={() => onQuery('')} aria-label="Clear search">
            <CloseIcon />
          </button>
        )}
      </div>

      <div className="chips" role="group" aria-label="Filter by team">
        <button
          type="button"
          className={`chip${activeTeam === 'all' ? ' chip--on' : ''}`}
          onClick={() => onTeam('all')}
          aria-pressed={activeTeam === 'all'}
        >
          All teams <span className="chip__n">{total}</span>
        </button>
        {teams.map((team) => (
          <button
            key={team.id}
            type="button"
            className={`chip${activeTeam === team.id ? ' chip--on' : ''}`}
            onClick={() => onTeam(team.id)}
            aria-pressed={activeTeam === team.id}
          >
            {team.name} <span className="chip__n">{counts[team.id] || 0}</span>
          </button>
        ))}
      </div>

      <p className="toolbar__count">
        Showing {showing} of {total} {total === 1 ? 'tool' : 'tools'}
      </p>
    </div>
  )
}
