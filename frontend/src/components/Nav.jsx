import { Link, NavLink } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import Icon from './Icon.jsx';

export default function Nav() {
  const { t, lang, setLang } = useT();
  const { user, logout } = useAuth();
  const prefix = '/' + lang;

  return (
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
          aria-label="Switch language"
          title={lang === 'en' ? 'ქართულად' : 'English'}
        >
          {lang === 'en' ? 'KA' : 'EN'}
        </button>

        {user ? (
          <>
            <Link to={prefix + '/account'} className="btn btn-secondary btn-sm">
              <Icon name="user" size={14} /> {t('nav.account')}
            </Link>
            <Link to={prefix + '/donate'} className="btn btn-primary btn-sm">
              <Icon name="heart" size={14} fill="currentColor" stroke={0} /> {t('hero.ctaDonate')}
            </Link>
          </>
        ) : (
          <>
            <Link to={prefix + '/auth'} className="btn btn-ghost btn-sm">{t('nav.login')}</Link>
            <Link to={prefix + '/donate'} className="btn btn-primary btn-sm">
              <Icon name="heart" size={14} fill="currentColor" stroke={0} /> {t('hero.ctaDonate')}
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
