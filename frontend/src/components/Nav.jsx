import { Link, NavLink } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';
import { useAuth } from '../hooks/useAuth.jsx';

export default function Nav() {
  const { t, lang, setLang } = useT();
  const { user, logout } = useAuth();
  const prefix = '/' + lang;

  return (
    <nav className="nav">
      <Link to={prefix} className="nav-logo" aria-label="BookBridge">
        <div className="logo-icon">📚</div>
        <span className="logo-text">BookBridge</span>
      </Link>

      <div className="nav-links">
        <NavLink to={prefix + '/how-it-works'}>{t('nav.how')}</NavLink>
        <NavLink to={prefix + '/schools'}>{t('nav.schools')}</NavLink>
        <NavLink to={prefix + '/search'}>{t('nav.search')}</NavLink>
        <NavLink to={prefix + '/dashboard'}>{t('nav.about')}</NavLink>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          className="lang-switch"
          onClick={() => setLang(lang === 'en' ? 'ka' : 'en')}
          aria-label="Switch language"
        >
          {lang === 'en' ? 'KA' : 'EN'}
        </button>

        {user ? (
          <>
            <Link to={prefix + '/account'} className="lang-switch">{t('nav.account')}</Link>
            <button className="nav-cta" onClick={logout}>{t('nav.logout')}</button>
          </>
        ) : (
          <Link to={prefix + '/auth'} className="nav-cta">{t('nav.join')}</Link>
        )}
      </div>
    </nav>
  );
}
