import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';
import { apiGet } from '../api.js';
import SectionHero from '../components/SectionHero.jsx';

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

export default function Search() {
  const { t, lang } = useT();
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [allSchools, setAllSchools] = useState(null);
  const [searchResults, setSearchResults] = useState(null);

  useEffect(() => {
    apiGet('/api/schools').then(setAllSchools).catch(() => setAllSchools([]));
  }, []);

  useEffect(() => {
    if (!q) { setSearchResults(null); return; }
    const handle = setTimeout(() => {
      apiGet(`/api/search?q=${encodeURIComponent(q)}&type=${type}`)
        .then(setSearchResults)
        // On error, show "no results" rather than an endless skeleton.
        .catch(() => setSearchResults({ schools: [], books: [] }));
    }, 250);
    return () => clearTimeout(handle);
  }, [q, type]);

  const browseList = useMemo(() => {
    if (!allSchools) return null;
    if (type === 'all') return allSchools;
    if (type === 'beneficiary' || type === 'volunteer') {
      return allSchools.filter((s) => s.type === type);
    }
    return allSchools;
  }, [allSchools, type]);

  const isSearching = !!q;
  const hits = searchResults?.schools || [];
  const books = searchResults?.books || [];
  const noHits = isSearching && hits.length === 0 && books.length === 0;

  return (
    <>
      <SectionHero
        image="/heroes/search.jpg"
        title={t('nav.search')}
        subtitle={t('schools.sub')}
        compact
      />
      <section className="section">
      <div className="container">
        <div className="search-bar" style={{ marginBottom: 24 }}>
          <input
            type="text"
            placeholder={t('schools.placeholder')}
            aria-label={t('schools.placeholder')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
          <div className="filter-pills">
            {['all', 'beneficiary', 'volunteer', 'book'].map((k) => (
              <button
                key={k}
                className={'pill' + (type === k ? ' active' : '')}
                onClick={() => setType(k)}
              >
                {t('schools.' + k)}
              </button>
            ))}
          </div>
        </div>

        {!isSearching && browseList === null && <Skeletons />}

        {!isSearching && browseList && browseList.length > 0 && (
          <>
            <ResultsHeader count={browseList.length} label={t('nav.schools')} />
            <SchoolGrid items={browseList} prefix={'/' + lang} t={t} />
          </>
        )}

        {!isSearching && browseList && browseList.length === 0 && <NoSchoolsYet t={t} />}

        {isSearching && !searchResults && <Skeletons />}

        {isSearching && hits.length > 0 && (
          <>
            <ResultsHeader count={hits.length} label={t('nav.schools')} />
            <SchoolGrid items={hits} prefix={'/' + lang} t={t} />
          </>
        )}

        {isSearching && books.length > 0 && (
          <>
            <h3 style={{ marginTop: 32, marginBottom: 12 }}>📖 {t('schools.book')}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {books.map((b) => (
                <Link
                  key={b.id}
                  to={'/' + lang + '/schools/' + b.school_id}
                  className="row-item"
                  style={{ textDecoration: 'none' }}
                >
                  <div className="row-item-main">
                    <div className="row-item-title">{b.title || b.author || b.genre}</div>
                    <div className="row-item-sub">{b.schools?.name} · {b.schools?.region}</div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {noHits && (
          <div className="state">
            <div className="state-icon">🔍</div>
            <h3>{t('schools.empty')}</h3>
            <p>{t('schools.emptyHint')}</p>
          </div>
        )}
      </div>
      </section>
    </>
  );
}

function ResultsHeader({ count, label }) {
  return (
    <h3 style={{ marginBottom: 16, fontSize: 18 }}>
      {label}
      <span style={{ color: 'var(--gray-500)', fontWeight: 500, marginLeft: 8 }}>· {count}</span>
    </h3>
  );
}

function SchoolGrid({ items, prefix, t }) {
  return (
    <div className="school-grid">
      {items.map((s, i) => (
        <Link key={s.id} to={prefix + '/schools/' + s.id} className="school">
          <div className="school-photo">
            <img src={photoFor(s, i)} alt={s.name} width={600} height={450} loading="lazy" decoding="async" />
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
    </div>
  );
}

function Skeletons() {
  return (
    <div className="school-grid">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="school" style={{ pointerEvents: 'none' }}>
          <div className="school-photo skeleton" />
          <div className="school-body">
            <div className="skeleton skeleton-line" style={{ width: '70%' }} />
            <div className="skeleton skeleton-line" style={{ width: '40%' }} />
            <div className="skeleton skeleton-line" style={{ width: '90%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function NoSchoolsYet({ t }) {
  return (
    <div className="state">
      <div className="state-icon">🏫</div>
      <h3>{t('schools.empty')}</h3>
      <p>{t('schools.emptyHint')}</p>
    </div>
  );
}
