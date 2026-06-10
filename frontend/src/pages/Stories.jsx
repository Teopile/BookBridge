import { useMemo, useState } from 'react';
import { useT } from '../i18n/I18nContext.jsx';
import SectionHero from '../components/SectionHero.jsx';
import Icon from '../components/Icon.jsx';
import STORIES from '../content/stories.js';

// „ხმები მთებიდან" — true stories of children whose books crossed a mountain.
// Fully data-driven from content/stories.js: filter chips are generated from
// the records' regions; adding a story = adding a record.
export default function Stories() {
  const { t, lang } = useT();
  const [region, setRegion] = useState('all');

  // Unique regions, in first-appearance order (keyed by the Georgian name).
  const regions = useMemo(() => {
    const seen = new Map();
    for (const s of STORIES) {
      if (!seen.has(s.region.ka)) seen.set(s.region.ka, s.region);
    }
    return [...seen.values()];
  }, []);

  const visible = region === 'all' ? STORIES : STORIES.filter((s) => s.region.ka === region);
  const anyPlaceholder = STORIES.some((s) => s.placeholder);

  return (
    <>
      <SectionHero
        image="/heroes/stories.jpg"
        eyebrow={t('stories.eyebrow')}
        title={t('stories.title')}
        subtitle={t('stories.sub')}
      />
      <section className="section">
        <div className="container">
          <div className="stories-filter" role="group" aria-label={t('stories.filterLabel')}>
            <span className="stories-filter-label">{t('stories.filterLabel')}</span>
            <button
              className={'pill' + (region === 'all' ? ' active' : '')}
              onClick={() => setRegion('all')}
            >
              {t('stories.all')}
            </button>
            {regions.map((r) => (
              <button
                key={r.ka}
                className={'pill' + (region === r.ka ? ' active' : '')}
                onClick={() => setRegion(r.ka)}
              >
                {lang === 'ka' ? r.ka : r.en}
              </button>
            ))}
          </div>

          {anyPlaceholder && (
            <p className="stories-placeholder-note">{t('stories.placeholderNote')}</p>
          )}

          <div className="story-grid">
            {visible.map((s) => (
              <StoryCard key={s.id} story={s} lang={lang} t={t} />
            ))}
            {visible.length === 0 && (
              <div className="state" style={{ gridColumn: '1/-1', margin: 0, maxWidth: 'none' }}>
                <h3>{t('stories.empty')}</h3>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function StoryCard({ story, lang, t }) {
  const [expanded, setExpanded] = useState(false);
  const text = story.story[lang] || story.story.ka;

  return (
    <article className="story-card">
      <div className="story-photo">
        <img src={story.photo} alt="" width={800} height={520} loading="lazy" decoding="async" />
        {story.placeholder && (
          <span className="story-sample-badge">{t('stories.placeholderBadge')}</span>
        )}
      </div>
      <div className="story-body">
        <h3>
          {(story.name[lang] || story.name.ka)}, {story.age}
        </h3>
        <div className="story-place">
          <Icon name="pin" size={14} color="var(--forest-600)" />
          {(story.village[lang] || story.village.ka)}, {(story.region[lang] || story.region.ka)}
        </div>
        <p className={'story-text' + (expanded ? ' expanded' : '')}>{text}</p>
        <button
          type="button"
          className="story-toggle"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? t('stories.readLess') : t('stories.readMore')}
        </button>
      </div>
    </article>
  );
}
