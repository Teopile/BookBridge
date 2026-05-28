import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';
import { apiGet } from '../api.js';
import Icon from './Icon.jsx';

export default function Leaderboard({ limit = 10 }) {
  const { t, lang } = useT();
  const [items, setItems] = useState(null);

  useEffect(() => {
    apiGet('/api/leaderboard?limit=' + limit)
      .then(setItems)
      .catch(() => setItems([]));
  }, [limit]);

  if (items === null) {
    return <div className="leaderboard-empty">{t('common.loading')}</div>;
  }

  if (items.length === 0) {
    return (
      <div className="leaderboard-empty">
        <div className="leaderboard-empty-icon">
          <Icon name="medal" size={32} />
        </div>
        <p style={{ marginBottom: 'var(--space-4)' }}>{t('home.leaderboardEmpty')}</p>
        <Link to={'/' + lang + '/donate'} className="btn btn-primary">
          {t('home.ctaPrimary')}
        </Link>
      </div>
    );
  }

  return (
    <ol className="leaderboard">
      {items.map((d, i) => (
        <li key={d.user_id}>
          <span className="lb-rank">{i + 1}</span>
          <span className="lb-name">{d.username}</span>
          <span className="lb-count">
            <strong>{d.total_books}</strong>
            {' '}
            {d.total_books === 1 ? t('home.leaderboardBookOne') : t('home.leaderboardBookMany')}
          </span>
        </li>
      ))}
    </ol>
  );
}
