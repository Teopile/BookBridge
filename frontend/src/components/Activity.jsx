import { useEffect, useState } from 'react';
import { useT } from '../i18n/I18nContext.jsx';
import { apiGet } from '../api.js';
import Icon from './Icon.jsx';

function timeAgo(iso, t) {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.max(1, Math.floor(ms / 1000));
  if (s < 60)       return s + ' ' + t('common.sec') + ' ' + t('common.ago');
  const m = Math.floor(s / 60);
  if (m < 60)       return m + ' ' + t('common.min') + ' ' + t('common.ago');
  const h = Math.floor(m / 60);
  if (h < 24)       return h + ' ' + t('common.hr')  + ' ' + t('common.ago');
  const d = Math.floor(h / 24);
  return d + ' ' + t('common.day') + ' ' + t('common.ago');
}

function describe(ev, t) {
  if (ev.kind === 'donation_created') {
    return {
      iconName: 'book',
      text: `${ev.actor_username} ${t('home.actSent')} ${ev.quantity} ${ev.quantity === 1 ? t('home.leaderboardBookOne') : t('home.leaderboardBookMany')}` +
            (ev.target_name ? ` ${t('home.actTo')} ${ev.target_name}` : ''),
    };
  }
  if (ev.kind === 'donation_delivered') {
    return {
      iconName: 'check',
      text: (ev.target_name || t('home.actSchool')) + ' ' + t('home.actReceived') +
            ' ' + ev.quantity + ' ' + (ev.quantity === 1 ? t('home.leaderboardBookOne') : t('home.leaderboardBookMany')),
    };
  }
  if (ev.kind === 'school_approved') {
    return {
      iconName: 'school',
      text: (ev.target_name || t('home.actSchool')) + ' ' + t('home.actJoined') +
            (ev.target_region ? ' · ' + ev.target_region : ''),
    };
  }
  return { iconName: 'sparkle', text: ev.kind };
}

export default function Activity({ limit = 6 }) {
  const { t } = useT();
  const [items, setItems] = useState(null);

  useEffect(() => {
    apiGet('/api/activity?limit=' + limit)
      .then(setItems)
      .catch(() => setItems([]));
  }, [limit]);

  if (items === null) {
    return (
      <div className="activity-feed">
        {Array.from({ length: 3 }).map((_, i) => (
          <div className="activity-row" key={i}>
            <div className="skeleton skeleton-circle" style={{ width: 36, height: 36 }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton skeleton-line" style={{ width: '70%' }} />
              <div className="skeleton skeleton-line" style={{ width: '30%', marginBottom: 0 }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="activity-feed">
      {items.map((ev, i) => {
        const d = describe(ev, t);
        return (
          <div className="activity-row" key={ev.kind + '-' + ev.ref_id + '-' + i}>
            <div className="activity-icon">
              <Icon name={d.iconName} size={18} />
            </div>
            <div className="activity-text">{d.text}</div>
            <div className="activity-time">{timeAgo(ev.happened_at, t)}</div>
          </div>
        );
      })}
    </div>
  );
}
