import { Link } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';

export default function Footer() {
  const { t, lang } = useT();
  const prefix = '/' + lang;

  return (
    <>
      <section className="footer-cta">
        <h2>{t('footerCta.title')}</h2>
        <p>{t('footerCta.sub')}</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link className="btn btn-white btn-lg" to={prefix + '/donate'}>{t('footerCta.start')}</Link>
        </div>
      </section>

      <footer>
        <div className="footer-grid">
          <div className="footer-brand">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="logo-mark" style={{ width: 32, height: 32 }}>
                <span style={{ color: 'white', fontSize: 18 }}>📚</span>
              </div>
              <span style={{ color: 'white', fontSize: 18, fontWeight: 700 }}>BookBridge</span>
            </div>
            <p>{t('footer.tagline')}</p>
          </div>

          <div className="footer-col">
            <h5>{t('footer.platform')}</h5>
            <Link to={prefix + '/donate'}>{t('footer.donate')}</Link>
            <Link to={prefix + '/schools'}>{t('footer.findSchools')}</Link>
            <Link to={prefix + '/how-it-works'}>{t('nav.how')}</Link>
          </div>

          <div className="footer-col">
            <h5>{t('footer.company')}</h5>
            <Link to={prefix + '/about'}>{t('footer.about')}</Link>
            <a href="mailto:info@bookbridge.ge">{t('footer.contact')}</a>
          </div>

          <div className="footer-col">
            <h5>{t('footer.contact')}</h5>
            <a href="mailto:info@bookbridge.ge">info@bookbridge.ge</a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">Instagram</a>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">Facebook</a>
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
