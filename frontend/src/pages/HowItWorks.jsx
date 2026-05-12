import { Link } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';

export default function HowItWorks() {
  const { t, lang } = useT();
  const prefix = '/' + lang;

  const steps = [
    { num: 1, title: t('donate.step1'), body: 'Browse our list of beneficiary schools, see their book wishlists, and pick one.' },
    { num: 2, title: t('donate.step2'), body: "Choose specific books from the school's requests — or add your own." },
    { num: 3, title: t('donate.step3'), body: 'Drop the books off at a Tbilisi volunteer school, or let us arrange a courier.' },
    { num: 4, title: t('donate.step4'), body: 'Confirm and follow your books on the tracking page until they reach the mountains.' },
  ];

  return (
    <section className="section">
      <div className="section-inner">
        <div className="section-header">
          <div className="section-tag">{t('nav.how')}</div>
          <h2 className="section-title">{t('nav.how')}</h2>
          <p className="section-sub">{t('hero.desc')}</p>
        </div>

        <div className="mission-grid">
          {steps.map((s) => (
            <div key={s.num} className="mission-card">
              <span className="mc-icon">{s.num === 1 ? '🔍' : s.num === 2 ? '📚' : s.num === 3 ? '🚚' : '✅'}</span>
              <h4>{s.num}. {s.title}</h4>
              <p>{s.body}</p>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 48 }}>
          <Link className="btn-primary" to={prefix + '/donate'}>📚 {t('hero.ctaDonate')}</Link>
        </div>
      </div>
    </section>
  );
}
