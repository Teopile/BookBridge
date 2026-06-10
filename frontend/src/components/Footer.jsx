import { Link, useLocation } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';
import Logo from './Logo.jsx';

// Routes where the marketing "donate now" footer-cta still makes sense.
// Hidden everywhere else (auth, account, dashboard, manage, donate, track).
function shouldShowFooterCta(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return true; // bare "/" before LangGuard redirects
  // parts[0] must be a known language; otherwise this is an unprefixed route
  // (e.g. "/auth" pre-redirect) and we hide the marketing footer-cta.
  if (parts[0] !== 'en' && parts[0] !== 'ka') return false;
  const seg = parts[1] || '';
  if (!seg) return true; // home (e.g. /en)
  return [
    'about',
    'how-it-works',
    'schools',
    'search',
    'stories',
  ].some((p) => seg === p || seg.startsWith(p + '/'));
}

export default function Footer() {
  const { t, lang } = useT();
  const prefix = '/' + lang;
  const { pathname } = useLocation();
  const showCta = shouldShowFooterCta(pathname);

  const instagram = import.meta.env.VITE_SOCIAL_INSTAGRAM;
  const facebook = import.meta.env.VITE_SOCIAL_FACEBOOK;

  return (
    <>
      {showCta && (
        <section className="footer-cta">
          <h2>{t('footerCta.title')}</h2>
          <p>{t('footerCta.sub')}</p>
          <div className="footer-cta-actions">
            <Link className="btn btn-white btn-lg" to={prefix + '/donate'}>{t('footerCta.start')}</Link>
          </div>
        </section>
      )}

      <footer>
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="footer-brand-row">
              <Logo size={32} wordmarkColor="var(--text-on-dark)" />
            </div>
            <p>{t('footer.tagline')}</p>
            <p className="foot-ka">{t('footer.taglineKa')}</p>
          </div>

          <div className="footer-col">
            <h5>{t('footer.platform')}</h5>
            <Link to={prefix + '/donate'}>{t('footer.donate')}</Link>
            <Link to={prefix + '/schools'}>{t('footer.findSchools')}</Link>
            <Link to={prefix + '/how-it-works'}>{t('nav.how')}</Link>
            <Link to={prefix + '/school/manage'}>{t('nav.beneficiaryCta')}</Link>
            <Link to={prefix + '/volunteer/manage'}>{t('footer.volunteerHub')}</Link>
          </div>

          <div className="footer-col">
            <h5>{t('footer.company')}</h5>
            <Link to={prefix + '/about'}>{t('footer.about')}</Link>
            <Link to={prefix + '/stories'}>{t('nav.stories')}</Link>
            <a href="mailto:info@bookbridge.ge">{t('footer.contact')}</a>
            <a href="mailto:info@bookbridge.ge">info@bookbridge.ge</a>
            {instagram && (
              <a href={instagram} target="_blank" rel="noopener noreferrer">Instagram</a>
            )}
            {facebook && (
              <a href={facebook} target="_blank" rel="noopener noreferrer">Facebook</a>
            )}
          </div>

          <div className="footer-col">
            <h5>{t('footer.legal')}</h5>
            <Link to={prefix + '/privacy'}>{t('footer.privacy')}</Link>
            <Link to={prefix + '/terms'}>{t('footer.terms')}</Link>
            <Link to={prefix + '/cookies'}>{t('footer.cookies')}</Link>
          </div>
        </div>

        <div className="footer-bottom">
          <span>{t('footer.rights')}</span>
          <span>{t('footer.tagline')}</span>
        </div>
      </footer>
    </>
  );
}
