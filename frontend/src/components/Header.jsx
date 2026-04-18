import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Header() {
  const { user, logout } = useAuth();
  const { t, toggleLang, lang } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const NAV_LINKS = [
    { to: '/',           label: t('nav.dashboard'),  icon: '🏠' },
    { to: '/drone',      label: t('nav.drone'),       icon: '🚁' },
    { to: '/map',        label: t('nav.map'),         icon: '🗺️' },
    { to: '/data-entry', label: t('nav.data_entry'),  icon: '📝' },
  ];

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <header className="bg-gov-800 text-white shadow-lg sticky top-0 z-50">
      <div className="bg-gov-950 text-center py-1 text-xs text-gov-200 tracking-wide">
        {t('gov_name')} &nbsp;|&nbsp; {t('gov_dept')}
      </div>

      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14 sm:h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-90 shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center text-gov-800 font-black text-sm sm:text-lg select-none">
              AI
            </div>
            <div>
              <div className="font-bold text-base sm:text-lg leading-tight">{t('app_name')}</div>
              <div className="text-gov-300 text-xs leading-tight hidden sm:block">{t('app_subtitle')}</div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {NAV_LINKS.map(({ to, label, icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${location.pathname === to
                    ? 'bg-gov-600 text-white'
                    : 'text-gov-200 hover:bg-gov-700 hover:text-white'
                  }`}
              >
                <span>{icon}</span>
                <span>{label}</span>
              </Link>
            ))}
          </nav>

          {/* Right: lang toggle + user + logout */}
          <div className="hidden lg:flex items-center gap-2">
            {/* Language toggle */}
            <button
              onClick={toggleLang}
              className="text-xs bg-gov-700 hover:bg-gov-600 border border-gov-500 px-2.5 py-1.5 rounded-lg transition-colors font-semibold tracking-wide"
              title={lang === 'en' ? 'Switch to Tamil' : 'Switch to English'}
            >
              {t('lang_switch')}
            </button>

            <div className="text-right">
              <div className="text-sm font-semibold leading-tight">{user?.fullName || user?.username}</div>
              <div className="text-xs text-gov-300 capitalize">{user?.role}</div>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs bg-gov-600 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors font-medium"
            >
              {t('nav.logout')}
            </button>
          </div>

          {/* Mobile: lang toggle + hamburger */}
          <div className="lg:hidden flex items-center gap-2">
            <button
              onClick={toggleLang}
              className="text-xs bg-gov-700 hover:bg-gov-600 border border-gov-500 px-2 py-1 rounded-lg font-semibold"
            >
              {t('lang_switch')}
            </button>
            <button
              className="p-2 rounded-lg hover:bg-gov-700"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              <div className={`w-5 h-0.5 bg-white mb-1 transition-transform ${menuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
              <div className={`w-5 h-0.5 bg-white mb-1 transition-opacity ${menuOpen ? 'opacity-0' : ''}`} />
              <div className={`w-5 h-0.5 bg-white transition-transform ${menuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="lg:hidden pb-3 border-t border-gov-700 mt-1 pt-3">
            <div className="text-sm text-gov-300 mb-2 px-1">
              👤 {user?.fullName || user?.username}
              <span className="text-xs text-gov-400 ml-1 capitalize">({user?.role})</span>
            </div>
            {NAV_LINKS.map(({ to, label, icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium mb-1
                  ${location.pathname === to ? 'bg-gov-600' : 'hover:bg-gov-700 text-gov-200'}`}
              >
                <span>{icon}</span>
                <span>{label}</span>
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2.5 text-sm text-red-300 hover:bg-red-900/30 rounded-lg mt-1"
            >
              🚪 {t('nav.logout')}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
