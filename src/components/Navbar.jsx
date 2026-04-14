import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { RiBrainLine, RiSettings4Line, RiSunLine, RiMoonClearLine, RiLogoutBoxRLine } from 'react-icons/ri'
import { HiOutlineMenuAlt3, HiX } from 'react-icons/hi'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import './Navbar.css'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const dropdownRef = useRef(null)
  
  const location = useLocation()
  const isDashboard = location.pathname === '/dashboard'
  const { user, loading, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setSettingsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
      <div className={`navbar__inner ${isDashboard ? 'navbar__inner--dashboard' : 'container'}`}>
        {/* Logo */}
        <Link 
          to="/" 
          className="navbar__logo"
          onClick={(e) => {
            if (location.pathname === '/') {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
        >
          <div className="navbar__logo-icon">
            <RiBrainLine size={20} />
          </div>
          <span className="navbar__logo-text">NeuroLens</span>
        </Link>

        {/* Desktop Links */}
        {!isDashboard && (
          <ul className="navbar__links">
            <li><a href="#features">Features</a></li>
            <li><a href="#how-it-works">How It Works</a></li>
          </ul>
        )}

        {/* Actions — conditional auth */}
        <div className="navbar__actions">
          {loading ? null : user ? (
            <>
              {isDashboard && (
                <Link to="/" className="btn-login">← Home</Link>
              )}
              <div className="navbar__user" style={{ position: 'relative' }}>
                <span className="navbar__avatar">{displayName.charAt(0).toUpperCase()}</span>
                <span className="navbar__username">{displayName}</span>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-login">Log in</Link>
              <Link to="/signup" className="btn-primary">Sign up</Link>
            </>
          )}

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }} ref={dropdownRef}>
            <button 
              className="btn-settings" 
              onClick={() => setSettingsOpen(!settingsOpen)}
              title="Settings"
            >
              <RiSettings4Line size={18} />
            </button>

            {settingsOpen && (
              <div className="navbar__dropdown animation-fade-in">
                {user && (
                  <div className="navbar__dropdown-header">
                    <span className="navbar__dropdown-email">{user.email}</span>
                  </div>
                )}
                <button className="navbar__dropdown-item" onClick={toggleTheme}>
                  {theme === 'dark' ? <><RiSunLine size={16} /> Light Mode</> : <><RiMoonClearLine size={16} /> Dark Mode</>}
                </button>
                {user && (
                  <button className="navbar__dropdown-item text-danger" onClick={() => { setSettingsOpen(false); signOut(); }}>
                    <RiLogoutBoxRLine size={16} /> Sign Out
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile toggle */}
        <button className="navbar__toggle" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <HiX size={22} /> : <HiOutlineMenuAlt3 size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="navbar__mobile-menu">
          {!isDashboard && (
            <>
              <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
              <a href="#how-it-works" onClick={() => setMenuOpen(false)}>How It Works</a>
            </>
          )}
          {loading ? null : user ? (
            <>
              <span className="navbar__mobile-user">{user.email}</span>
              {isDashboard && (
                <Link to="/" onClick={() => setMenuOpen(false)}>← Back to Home</Link>
              )}
              <button className="navbar__mobile-signout" onClick={() => { signOut(); setMenuOpen(false) }}>
                <RiLogoutBoxRLine size={16} /> Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMenuOpen(false)}>Log in</Link>
              <Link to="/signup" onClick={() => setMenuOpen(false)}>Sign up</Link>
            </>
          )}
          <button className="navbar__mobile-dropdown-item" onClick={toggleTheme} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 0', borderBottom: '1px solid var(--border-subtle)', background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '15px', cursor: 'pointer', outline: 'none', width: '100%', textAlign: 'left' }}>
            {theme === 'dark' ? <><RiSunLine size={18} /> Light Mode</> : <><RiMoonClearLine size={18} /> Dark Mode</>}
          </button>
        </div>
      )}
    </nav>
  )
}
