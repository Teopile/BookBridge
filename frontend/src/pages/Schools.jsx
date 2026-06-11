import { lazy, Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';
import { apiGet } from '../api.js';
import Icon from '../components/Icon.jsx';
import SchoolCard from '../components/SchoolCard.jsx';
import SectionHero from '../components/SectionHero.jsx';
import TypewriterPlaceholder from '../components/TypewriterPlaceholder.jsx';
import { Loading, ErrorState } from '../components/States.jsx';

// Map (Leaflet + tiles) only loads when the user clicks the Map toggle.
const MapView = lazy(() => import('../components/MapView.jsx'));

const FALLBACK_PHOTOS = [
  'https://picsum.photos/seed/bb-school-1/600/350',
  'https://picsum.photos/seed/bb-school-2/600/350',
  'https://picsum.photos/seed/bb-school-3/600/350',
  'https://picsum.photos/seed/bb-school-4/600/350',
  'https://picsum.photos/seed/bb-school-5/600/350',
  'https://picsum.photos/seed/bb-school-6/600/350',
];
function photoFor(s, i) {
  if (s.photo_url) return s.photo_url;
  if (!s.id) return FALLBACK_PHOTOS[i % FALLBACK_PHOTOS.length];
  let h = 0; for (let k = 0; k < s.id.length; k++) h = (h * 31 + s.id.charCodeAt(k)) >>> 0;
  return FALLBACK_PHOTOS[h % FALLBACK_PHOTOS.length];
}

export default function Schools({ type }) {
  const { t, lang } = useT();
  const prefix = '/' + lang;
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState(type || 'all');
  const [region, setRegion] = useState('');
  const [regions, setRegions] = useState([]);
  const [q, setQ] = useState('');
  const [view, setView] = useState('list');
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    apiGet('/api/regions').then(setRegions).catch(() => setRegions([]));
  }, []);

  function loadSchools() {
    setError(null);
    setItems(null);
    const params = new URLSearchParams();
    if (filter !== 'all') params.set('type', filter);
    if (region)            params.set('region', region);
    const qs = params.toString();
    const url = '/api/schools' + (qs ? '?' + qs : '');
    apiGet(url).then(setItems).catch((e) => { setItems([]); setError(e.message); });
  }

  useEffect(loadSchools, [filter, region]);

  const filtered = (items || []).filter((s) =>
    !q || s.name?.toLowerCase().includes(q.toLowerCase()) || s.region?.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <>
      <SectionHero
        image="/heroes/schools.jpg"
        title={t('schools.title')}
        subtitle={t('schools.sub')}
      />
      <section className="section">
      <div className="container">
        <div className="search-bar">
          {/* No native placeholder — the animated overlay replaces it; the
              aria-label keeps the field named for screen readers. */}
          <div className="tw-input-wrap">
            <input
              type="text"
              aria-label={t('schools.placeholder')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            {!searchFocused && !q && (
              <TypewriterPlaceholder
                prefix={t('searchHints.prefix')}
                terms={t('searchHints.terms')}
              />
            )}
          </div>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            aria-label={t('schools.allRegions')}
          >
            <option value="">{t('schools.allRegions')}</option>
            {regions.map((r) => (
              <option key={r.region} value={r.region}>
                {r.region} · {r.count}
              </option>
            ))}
          </select>
          <div className="filter-pills">
            {['all', 'beneficiary', 'volunteer'].map((k) => (
              <button
                key={k}
                className={'pill' + (filter === k ? ' active' : '')}
                onClick={() => setFilter(k)}
              >
                {t('schools.' + k)}
              </button>
            ))}
          </div>
          <div className="filter-pills" style={{ marginLeft: 'auto' }}>
            <button
              className={'pill' + (view === 'list' ? ' active' : '')}
              onClick={() => setView('list')}
              aria-label={t('schools.viewList')}
            >
              <Icon name="list" size={16} /> {t('schools.viewList')}
            </button>
            <button
              className={'pill' + (view === 'map' ? ' active' : '')}
              onClick={() => setView('map')}
              aria-label={t('schools.viewMap')}
            >
              <Icon name="map" size={16} /> {t('schools.viewMap')}
            </button>
          </div>
        </div>

        {view === 'map' && (
          <Suspense fallback={<div className="skeleton skeleton-block" style={{ height: 480, borderRadius: 'var(--r-md)' }} />}>
            <MapView schools={filtered} />
          </Suspense>
        )}
        {view === 'list' && items === null && !error && (
          <Loading kind="list" />
        )}

        {view === 'list' && error && (
          <ErrorState message={error} onRetry={loadSchools} />
        )}

        {view === 'list' && items !== null && !error && (

        <div className="school-grid">
          {filtered.map((s, i) => (
            <SchoolCard key={s.id} school={s} photo={photoFor(s, i)} />
          ))}

          {filtered.length === 0 && (
            <div className="state" style={{ gridColumn: '1/-1', margin: 0, maxWidth: 'none' }}>
              <div className="state-icon">
                <Icon name="search" size={48} color="var(--forest-500)" />
              </div>
              <h3>{t('schools.empty')}</h3>
              <p>{t('schools.emptyHint')}</p>
            </div>
          )}
        </div>
        )}
      </div>
      </section>
    </>
  );
}
