import { useT } from '../i18n/I18nContext.jsx';

export default function About() {
  const { t } = useT();
  return (
    <section className="section">
      <div className="section-inner">
        <div className="section-header">
          <div className="section-tag">{t('mission.tag')}</div>
          <h2 className="section-title">{t('mission.title')}</h2>
          <p className="section-sub">{t('mission.sub')}</p>
        </div>
        <div className="mission-grid">
          <div className="mission-card"><span className="mc-icon">🎯</span><h4>{t('mission.missionTitle')}</h4><p>{t('mission.missionBody')}</p></div>
          <div className="mission-card"><span className="mc-icon">👁️</span><h4>{t('mission.visionTitle')}</h4><p>{t('mission.visionBody')}</p></div>
          <div className="mission-card"><span className="mc-icon">💡</span><h4>{t('mission.transparencyTitle')}</h4><p>{t('mission.transparencyBody')}</p></div>
        </div>
      </div>
    </section>
  );
}
