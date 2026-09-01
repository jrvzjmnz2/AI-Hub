/* Small inline icons. currentColor everywhere so they follow the text color. */
const base = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }

export const SearchIcon = (p) => (
  <svg {...base} {...p} aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
)

export const StarIcon = ({ filled = false, ...p }) => (
  <svg {...base} {...p} fill={filled ? 'currentColor' : 'none'} aria-hidden="true">
    <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" />
  </svg>
)

export const ClockIcon = (p) => (
  <svg {...base} {...p} aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
)

export const ExternalIcon = (p) => (
  <svg {...base} {...p} aria-hidden="true"><path d="M14 4h6v6" /><path d="M20 4 11 13" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>
)

export const SunIcon = (p) => (
  <svg {...base} {...p} aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" /></svg>
)

export const MoonIcon = (p) => (
  <svg {...base} {...p} aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" /></svg>
)

export const CloseIcon = (p) => (
  <svg {...base} {...p} aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
)

// Microsoft's own four-square mark, in its official four colors - used only
// on the "Sign in with Microsoft" button, per Microsoft's identity branding
// guidelines (not part of the ITEMHOUND icon set, so it keeps its own fixed
// colors rather than following currentColor).
export const MicrosoftIcon = (p) => (
  <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true" {...p}>
    <rect x="1" y="1" width="9" height="9" fill="#F25022" />
    <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
    <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
    <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
  </svg>
)
