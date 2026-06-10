import { Link } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';
import SectionHero from '../components/SectionHero.jsx';

export default function HowItWorks() {
  const { t, lang } = useT();
  const prefix = '/' + lang;

  return (
    <>
      <SectionHero
        image="/heroes/how.jpg"
        eyebrow={t('home.howStamp')}
        title={t('home.howTitle')}
        subtitle={t('home.heroSub')}
      />
      <section className="section">
      <div className="container">
        <div className="steps">
          <div className="step">
            <div className="step-num">1</div>
            <h3>{t('home.step1Title')}</h3>
            <p>{t('how.step1Detail')}</p>
          </div>
          <div className="step">
            <div className="step-num">2</div>
            <h3>{t('home.step2Title')}</h3>
            <p>{t('how.step2Detail')}</p>
          </div>
          <div className="step">
            <div className="step-num">3</div>
            <h3>{t('home.step3Title')}</h3>
            <p>{t('how.step3Detail')}</p>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 48 }}>
          <Link to={prefix + '/donate'} className="btn btn-primary btn-lg">
            {t('home.ctaPrimary')}
          </Link>
        </div>
      </div>
      </section>
    </>
  );
}
