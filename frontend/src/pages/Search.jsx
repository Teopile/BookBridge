import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';
import { apiGet } from '../api.js';
import SchoolCard from '../components/SchoolCard.jsx';
import SectionHero from '../components/SectionHero.jsx';
import TypewriterPlaceholder from '../components/TypewriterPlaceholder.jsx';

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
  const [searchFocused, setSearchFocused] = useState(false);
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
        <div className="search-bar" style={{ marginBottom: 'var(--space-6)' }}>
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
              autoFocus
            />
            {!searchFocused && !q && (
              <TypewriterPlaceholder
                prefix={t('searchHints.prefix')}
                terms={t('searchHints.terms')}
              />
            )}
          </div>
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
            <SchoolGrid items={browseList} />
          </>
        )}

        {!isSearching && browseList && browseList.length === 0 && <NoSchoolsYet t={t} />}

        {isSearching && !searchResults && <Skeletons />}

        {isSearching && hits.length > 0 && (
          <>
            <ResultsHeader count={hits.length} label={t('nav.schools')} />
            <SchoolGrid items={hits} />
          </>
        )}

        {isSearching && books.length > 0 && (
          <>
            <h3 style={{ marginTop: 'var(--space-7)', marginBottom: 'var(--space-3)' }}>📖 {t('schools.book')}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
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
    <h3 style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--fs-md)' }}>
      {label}
      <span className="tabular" style={{ color: 'var(--text-subtle)', fontWeight: 'var(--fw-medium)', marginLeft: 'var(--space-2)' }}>· {count}</span>
    </h3>
  );
}

function SchoolGrid({ items }) {
  return (
    <div className="school-grid">
      {items.map((s, i) => (
        <SchoolCard key={s.id} school={s} photo={photoFor(s, i)} />
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
