import { useState } from 'react'
import { StarIcon, ExternalIcon } from './Icons.jsx'

const STATUS_LABEL = { live: 'Live', beta: 'Beta', planned: 'Planned' }

export default function ToolCard({ tool, team, isFavorite, onToggleFavorite, onOpen }) {
  const status = tool.status || 'live'
  const unset = !tool.sso && (!tool.url || tool.url.includes('example.com'))
  const [ssoError, setSsoError] = useState('')

  // SSO-enabled tools never navigate via a plain href - the Hub mints a
  // one-time hand-off token server-side (it holds the shared secret, the
  // browser never does) and only then do we know the real URL to open.
  async function handleSsoClick(e) {
    e.preventDefault()
    setSsoError('')
    onOpen(tool.id)
    try {
      const res = await fetch(`/api/sso/${tool.sso}`, { credentials: 'same-origin' })
      const data = await res.json()
      if (!res.ok) {
        setSsoError(data.message || 'Could not open this tool.')
        return
      }
      window.open(data.redirectUrl, '_blank', 'noopener,noreferrer')
    } catch {
      setSsoError('Could not reach the Hub server.')
    }
  }

  return (
    <div className={`card${unset ? ' card--unset' : ''}`}>
      <div className="card__top">
        <span className="card__team">{team ? team.name : tool.team}</span>
        <button
          type="button"
          className={`star${isFavorite ? ' star--on' : ''}`}
          onClick={() => onToggleFavorite(tool.id)}
          aria-pressed={isFavorite}
          aria-label={isFavorite ? `Remove ${tool.name} from favorites` : `Add ${tool.name} to favorites`}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <StarIcon filled={isFavorite} />
        </button>
      </div>

      <h3 className="card__name">
        {tool.sso ? (
          <a className="card__link" href={tool.url || '#'} onClick={handleSsoClick}>
            {tool.name}
            <ExternalIcon className="card__ext" />
          </a>
        ) : (
          <a
            className="card__link"
            href={tool.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onOpen(tool.id)}
          >
            {tool.name}
            <ExternalIcon className="card__ext" />
          </a>
        )}
      </h3>

      {tool.description && <p className="card__desc">{tool.description}</p>}
      {ssoError && <p className="card__error">{ssoError}</p>}

      <div className="card__foot">
        <span className={`pill pill--${status}`}>{STATUS_LABEL[status] || status}</span>
        {tool.placeholder && <span className="pill pill--sample">Sample entry</span>}
        {tool.owner && <span className="card__owner">{tool.owner}</span>}
      </div>
    </div>
  )
}
