import { SunIcon, MoonIcon } from './Icons.jsx'
import logoColor from '../assets/logos/full-logo-color.png'
import logoWhite from '../assets/logos/full-logo-white.png'
import { SITE } from '../config/tools.js'

export default function Header({ theme, onToggleTheme, employee, onLogout }) {
  return (
    <header className="header">
      <div className="header__inner">
        <div className="header__brand">
          {/* Approved ITEMHOUND lockup, 3700x638 - width only, aspect ratio preserved by CSS. */}
          <img
            className="header__logo"
            src={theme === 'dark' ? logoWhite : logoColor}
            alt="ITEMHOUND"
            width="1850"
            height="319"
          />
          <span className="header__divider" aria-hidden="true" />
          <div className="header__titles">
            <h1 className="header__title">{SITE.title}</h1>
            <p className="header__tagline">{SITE.tagline}</p>
          </div>
        </div>

        <div className="header__actions">
          {employee && (
            <span className="header__who">
              {employee.name} <span className="header__whoId">({employee.employeeId})</span>
            </span>
          )}
          <button
            type="button"
            className="themebtn"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
          {employee && (
            <button type="button" className="themebtn" onClick={onLogout}>
              Log Out
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
