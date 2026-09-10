import { useState } from 'react'
import { BellIcon, ChevronIcon, CloseIcon } from './Icons.jsx'

// A slim status bar under the header, shown only when a tool actually has
// something to say. Collapsed it announces the most urgent notification and
// how many others there are; expanded it lists them all, each dismissible.
export default function NotificationBar({ notifications, sources, onDismiss }) {
  const [open, setOpen] = useState(false)

  // Sources that failed are worth a quiet word - "no notifications" and
  // "couldn't ask" are very different things to show someone.
  const unreachable = (sources || []).filter((s) => !s.ok)

  if (!notifications.length) {
    if (!unreachable.length) return null
    return (
      <div className="notifbar notifbar--muted" role="status">
        <div className="notifbar__inner">
          <span className="notifbar__icon"><BellIcon /></span>
          <p className="notifbar__lead">
            Couldn&rsquo;t reach {unreachable.map((s) => s.name || s.id).join(', ')} for notifications.
          </p>
        </div>
      </div>
    )
  }

  const [lead, ...rest] = notifications
  const overdueCount = notifications.filter((n) => n.severity === 'overdue').length
  // Naming the tool on every row is just repetition while everything comes
  // from one place; it earns its keep once a second tool starts reporting.
  const multiTool = new Set(notifications.map((n) => n.toolId)).size > 1

  return (
    <div className="notifbar" role="status" aria-live="polite">
      <div className="notifbar__inner">
        <span className="notifbar__icon"><BellIcon /></span>

        {lead.severity === 'overdue' && <span className="notifbar__sev">Overdue</span>}

        <p className="notifbar__lead">
          <strong>{lead.title}</strong>
          <span className="notifbar__body">{lead.body}</span>
        </p>

        <span className="notifbar__meta">
          {lead.toolName}
          {overdueCount > 1 && ` · ${overdueCount} overdue`}
        </span>

        {rest.length > 0 && (
          <button
            type="button"
            className="notifbar__more"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            {open ? 'Hide' : `${rest.length} more`}
            <ChevronIcon className={`notifbar__chev${open ? ' notifbar__chev--up' : ''}`} width="14" height="14" />
          </button>
        )}

        <button
          type="button"
          className="notifbar__dismiss"
          onClick={() => onDismiss(lead)}
          aria-label={`Dismiss: ${lead.title}`}
          title="Dismiss"
        >
          <CloseIcon width="15" height="15" />
        </button>
      </div>

      {open && (
        <ul className="notiflist">
          {notifications.map((n, i) => (
            <li className="notiflist__row enter--sm" style={{ '--i': i }} key={`${n.toolId}:${n.id}`}>
              <span className={`notiflist__dot notiflist__dot--${n.severity}`} aria-hidden="true" />
              <div className="notiflist__text">
                <p className="notiflist__title">{n.title}</p>
                <p className="notiflist__body">
                  {n.body}
                  {n.items?.length > 0 && (
                    <span className="notiflist__items">
                      {' '}
                      {n.items.map((it) => it.equipmentId).join(', ')}
                      {n.truncated && ` +${n.count - n.items.length} more`}
                    </span>
                  )}
                </p>
              </div>
              {multiTool && <span className="notiflist__tool">{n.toolName}</span>}
              <button
                type="button"
                className="notifbar__dismiss"
                onClick={() => onDismiss(n)}
                aria-label={`Dismiss: ${n.title}`}
                title="Dismiss"
              >
                <CloseIcon width="15" height="15" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
