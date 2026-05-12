import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';
import { apiGet } from '../api.js';

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
      <div className="section-inner">
        <div className="section-header">
          <div className="section-tag">{t('nav.schools')}</div>
          <h2 className="section-title">{t('schools.title')}</h2>
          <p className="section-sub">{t('schools.sub')}</p>
        </div>

        <div className="demo-search-bar">
          <input
            type="text"
            placeholder={t('schools.placeholder')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="filter-pills">
            {['all', 'beneficiary', 'volunteer'].map((k) => (
              <button key={k} className={'pill' + (filter === k ? ' active' : '')} onClick={() => setFilter(k)}>
                {t('schools.' + k)}
              </button>
            ))}
          </div>
        </div>

        <div className="school-cards">
          {filtered.length === 0 && (
            <div className="card" style={{ gridColumn: '1/-1', textAlign: 'center' }}>
              <div style={{ fontSize: 60, marginBottom: 12 }}>🔍</div>
              <h3>{t('schools.empty')}</h3>
              <p style={{ color: 'var(--soft-gray)' }}>{t('schools.emptyHint')}</p>
            </div>
          )}
          {filtered.map((s) => (
            <Link key={s.id} to={prefix + '/schools/' + s.id} className="school-card">
              <div className="school-card-header">
                {s.type === 'volunteer' ? '🏫' : '🏔️'}
                <span className="school-badge">{t('schools.' + s.type)}</span>
              </div>
              <div className="school-card-body">
                <h3>{s.name}</h3>
                <div className="school-region">📍 {s.region} {s.city ? '· ' + s.city : ''}</div>
                {s.description && <p style={{ marginTop: 12, color: 'var(--soft-gray)', fontSize: 14 }}>{s.description.slice(0, 100)}{s.description.length > 100 ? '…' : ''}</p>}
              </div>
              <div className="school-card-footer">
                <div className="school-contact">{s.contact_phone || s.contact_email || ''}</div>
                <span className="school-action-btn">{t('schools.donate')}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
