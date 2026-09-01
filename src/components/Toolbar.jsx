import { SearchIcon, CloseIcon } from './Icons.jsx'

// Search lives in its own dock straddling the hero's bottom edge; the team
// filters and the result count sit together above the grid.
export function SearchDock({ query, onQuery }) {
  return (
    <div className="searchdock">
      <div className="search">
        <SearchIcon className="search__icon" width="20" height="20" />
        <input
          type="search"
          className="search__input"
          placeholder="Search tools, teams or keywords..."
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          aria-label="Search tools"
        />
        {query && (
          <button
            type="button"
            className="search__clear"
            onClick={() => onQuery('')}
            aria-label="Clear search"
          >
            <CloseIcon />
          </button>
        )}
      </div>
    </div>
  )
}

export default function Toolbar({ teams, counts, activeTeam, onTeam, total, showing }) {
  return (
    <div className="filters">
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

      <p className="filters__count">
        {showing} of {total} {total === 1 ? 'tool' : 'tools'}
      </p>
    </div>
  )
}
