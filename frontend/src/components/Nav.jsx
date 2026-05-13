import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import Icon from './Icon.jsx';

export default function Nav() {
  const { t, lang, setLang } = useT();
  const { user, logout } = useAuth();
  const prefix = '/' + lang;
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Auto-close drawer whenever the route changes.
  useEffect(() => { setOpen(false); }, [location.pathname]);

  // Escape closes the drawer; lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const switchLangLabel = lang === 'en' ? t('nav.switchToKa') : t('nav.switchToEn');

  return (
    <>
      <nav className="nav">
        <Link to={prefix} className="nav-logo" aria-label="BookBridge home">
          <div className="logo-mark">
            <Icon name="books" size={20} color="white" stroke={1.8} />
          </div>
          <span className="logo-text">BookBridge</span>
        </Link>

        <div className="nav-links">
          <NavLink to={prefix + '/schools'}>{t('nav.schools')}</NavLink>
          <NavLink to={prefix + '/how-it-works'}>{t('nav.how')}</NavLink>
          <NavLink to={prefix + '/about'}>{t('nav.about')}</NavLink>
          <NavLink to={prefix + '/search'}>{t('nav.search')}</NavLink>
        </div>

        <div className="nav-actions">
          <button
            className="lang-pill"
            onClick={() => setLang(lang === 'en' ? 'ka' : 'en')}
            aria-label={switchLangLabel}
            title={switchLangLabel}
          >
            {lang === 'en' ? 'KA' : 'EN'}
          </button>

          {user ? (
            <Link to={prefix + '/account'} className="btn btn-secondary btn-sm nav-desktop-only">
              <Icon name="user" size={14} /> {t('nav.account')}
            </Link>
          ) : (
            <Link to={prefix + '/auth'} className="btn btn-ghost btn-sm nav-desktop-only">
              {t('nav.login')}
            </Link>
          )}
          <Link to={prefix + '/donate'} className="btn btn-primary btn-sm nav-desktop-only">
            <Icon name="heart" size={14} fill="currentColor" stroke={0} /> {t('hero.ctaDonate')}
          </Link>

          <button
            type="button"
            className="nav-burger"
            aria-label={t('nav.menu')}
            aria-expanded={open}
            aria-controls="nav-drawer"
            onClick={() => setOpen((v) => !v)}
          >
            <span className={'burger-bar' + (open ? ' x1' : '')} />
            <span className={'burger-bar' + (open ? ' x2' : '')} />
            <span className={'burger-bar' + (open ? ' x3' : '')} />
          </button>
        </div>
      </nav>

      {open && <div className="nav-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />}
      <div id="nav-drawer" className={'nav-drawer' + (open ? ' open' : '')} role="dialog" aria-modal="true" aria-label={t('nav.menu')}>
        <NavLink to={prefix + '/schools'}>{t('nav.schools')}</NavLink>
        <NavLink to={prefix + '/how-it-works'}>{t('nav.how')}</NavLink>
        <NavLink to={prefix + '/about'}>{t('nav.about')}</NavLink>
        <NavLink to={prefix + '/search'}>{t('nav.search')}</NavLink>
        <div className="nav-drawer-divider" />
        {user ? (
          <>
            <Link to={prefix + '/account'}>{t('nav.account')}</Link>
            <button type="button" className="nav-drawer-btn" onClick={() => { setOpen(false); logout(); }}>
              {t('nav.logout')}
            </button>
          </>
        ) : (
          <Link to={prefix + '/auth'}>{t('nav.login')}</Link>
        )}
        <Link to={prefix + '/donate'} className="btn btn-primary btn-block" style={{ marginTop: 12 }}>
          {t('hero.ctaDonate')}
        </Link>
      </div>
    </>
  );
}
