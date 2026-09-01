import { useMemo } from 'react'

// Time-of-day greeting, computed in the visitor's own timezone. Purely
// cosmetic - it never gates anything.
function greeting(date = new Date()) {
  const h = date.getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

// The maroon feature panel. Solid brand-colour blocks are permitted as layout
// elements by the ITEMHOUND guidelines (the page surface underneath stays
// plain white), and white-on-maroon clears the contrast rule comfortably.
export default function Hero({ employee, toolCount, teamCount, favoriteCount }) {
  const hello = useMemo(() => greeting(), [])
  // First name only - "Good afternoon, Jerviz" reads better than the full name.
  const firstName = employee?.name ? String(employee.name).trim().split(/\s+/)[0] : null

  const stats = [
    { n: toolCount, label: toolCount === 1 ? 'Tool' : 'Tools' },
    { n: teamCount, label: teamCount === 1 ? 'Team' : 'Teams' },
    { n: favoriteCount, label: 'Favorites' },
  ]

  return (
    <section className="hero">
      <div className="hero__inner">
        <p className="hero__eyebrow enter" style={{ '--i': 0 }}>
          ITEMHOUND Internal Tooling
        </p>

        <h2 className="hero__title enter" style={{ '--i': 1 }}>
          {hello}
          {firstName ? `, ${firstName}` : ''}. <em>Every tool your teams have built, in one place.</em>
        </h2>

        <p className="hero__lede enter" style={{ '--i': 2 }}>
          Search across every internal app, jump straight in without signing in again, and keep
          the ones you use most within reach.
        </p>

        <div className="hero__stats enter" style={{ '--i': 3 }}>
          {stats.map((s) => (
            <div className="stat" key={s.label}>
              <span className="stat__n">{s.n}</span>
              <span className="stat__label">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
