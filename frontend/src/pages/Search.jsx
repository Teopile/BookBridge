import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';
import { apiGet } from '../api.js';

export default function Search() {
  const { t, lang } = useT();
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [results, setResults] = useState(null);

  useEffect(() => {
    if (!q) { setResults(null); return; }
    const handle = setTimeout(() => {
      apiGet(`/api/search?q=${encodeURIComponent(q)}&type=${type}`).then(setResults).catch(() => setResults(null));
    }, 250);
    return () => clearTimeout(handle);
  }, [q, type]);

  return (
    <section className="section">
      <div className="section-inner">
        <div className="section-header">
          <div className="section-tag">{t('nav.search')}</div>
          <h2 className="section-title">{t('schools.title')}</h2>
        </div>

        <div className="demo-search-bar">
          <input type="text" placeholder={t('schools.placeholder')} value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="filter-pills">
            {['all', 'beneficiary', 'volunteer', 'book'].map((k) => (
              <button key={k} className={'pill' + (type === k ? ' active' : '')} onClick={() => setType(k)}>
                {t('schools.' + k)}
              </button>
            ))}
          </div>
        </div>

        {results && (
          <>
            {(results.schools?.length || 0) > 0 && (
              <>
                <h3 style={{ marginTop: 24, marginBottom: 12 }}>{t('nav.schools')}</h3>
                <div className="school-cards">
                  {results.schools.map((s) => (
                    <Link key={s.id} to={'/' + lang + '/schools/' + s.id} className="school-card">
                      <div className="school-card-header">
                        {s.type === 'volunteer' ? '🏫' : '🏔️'}
                        <span className="school-badge">{t('schools.' + s.type)}</span>
                      </div>
                      <div className="school-card-body">
                        <h3>{s.name}</h3>
                        <div className="school-region">📍 {s.region} {s.city ? '· ' + s.city : ''}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}

            {(results.books?.length || 0) > 0 && (
              <>
                <h3 style={{ marginTop: 32, marginBottom: 12 }}>📖 {t('schools.book')}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {results.books.map((b) => (
                    <Link key={b.id} to={'/' + lang + '/schools/' + b.school_id} className="card" style={{ marginTop: 0, padding: 16 }}>
                      <strong>{b.title || b.author || b.genre}</strong>
                      <p style={{ color: 'var(--soft-gray)', fontSize: 13, marginTop: 4 }}>
                        {b.schools?.name} · {b.schools?.region}
                      </p>
                    </Link>
                  ))}
                </div>
              </>
            )}

            {((results.schools?.length || 0) + (results.books?.length || 0)) === 0 && (
              <div className="card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 60, marginBottom: 12 }}>🔍</div>
                <h3>{t('schools.empty')}</h3>
                <p style={{ color: 'var(--soft-gray)' }}>{t('schools.emptyHint')}</p>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
