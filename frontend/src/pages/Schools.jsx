import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';
import { apiGet } from '../api.js';

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
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState(type || 'all');
  const [q, setQ] = useState('');

  useEffect(() => {
    const url = filter === 'all' ? '/api/schools' : '/api/schools?type=' + filter;
    apiGet(url).then(setItems).catch(() => setItems([]));
  }, [filter]);

  const filtered = items.filter((s) =>
    !q || s.name?.toLowerCase().includes(q.toLowerCase()) || s.region?.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <section className="section">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">{t('schools.title')}</h2>
          <p className="section-lede">{t('schools.sub')}</p>
        </div>

        <div className="search-bar">
          <input
            type="text"
            placeholder={t('schools.placeholder')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
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
        </div>

        <div className="school-grid">
          {filtered.map((s, i) => (
            <Link key={s.id} to={prefix + '/schools/' + s.id} className="school">
              <div className="school-photo">
                <img src={photoFor(s, i)} alt={s.name} loading="lazy" />
                <span className="school-badge">{t('schools.' + s.type)}</span>
              </div>
              <div className="school-body">
                <h3>{s.name}</h3>
                <div className="school-region">{s.region}{s.city ? ' · ' + s.city : ''}</div>
                {s.description && (
                  <p className="school-blurb">
                    {s.description.slice(0, 110)}{s.description.length > 110 ? '…' : ''}
                  </p>
                )}
              </div>
              <div className="school-cta">
                <span className="btn btn-primary btn-block">{t('home.donateToSchool')}</span>
              </div>
            </Link>
          ))}

          {filtered.length === 0 && (
            <div className="card" style={{ gridColumn: '1/-1', textAlign: 'center', margin: 0 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
              <h3 style={{ marginBottom: 8 }}>{t('schools.empty')}</h3>
              <p style={{ color: 'var(--gray-700)' }}>{t('schools.emptyHint')}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
