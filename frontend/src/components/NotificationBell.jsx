import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { apiGet, apiPost } from '../api.js';

// In-website notification bell: unread badge + dropdown feed of donation status
// updates. Opening it marks everything read. Driven by /api/notifications.
export default function NotificationBell() {
  const { t, lang } = useT();
  const { user } = useAuth();
  const prefix = '/' + lang;
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  async function load() {
    try {
      const r = await apiGet('/api/notifications');
      setItems(r.items || []);
      setUnread(r.unread || 0);
    } catch { /* anonymous / offline — leave empty */ }
  }

  useEffect(() => {
    if (user) load(); else { setItems([]); setUnread(0); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      try {
        await apiPost('/api/notifications/read', {});
        const now = new Date().toISOString();
        setUnread(0);
        setItems((xs) => xs.map((x) => ({ ...x, read_at: x.read_at || now })));
      } catch { /* ignore */ }
    }
  }

  if (!user) return null;

  return (
    <div className="notif-bell" ref={ref}>
      <button
        type="button"
        className="lang-pill notif-trigger"
        aria-label={t('notif.title')}
        aria-expanded={open}
        onClick={toggle}
      >
        <span aria-hidden="true" className="notif-icon">🔔</span>
        {unread > 0 && (
          <span aria-hidden="true" className="notif-badge">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div role="dialog" aria-label={t('notif.title')} className="popover notif-pop">
          <div className="notif-pop-head">{t('notif.title')}</div>
          <div className="notif-pop-list">
            {items.length === 0 ? (
              <div className="notif-empty">{t('notif.empty')}</div>
            ) : items.map((n) => (
              <div key={n.id} className={'notif-item' + (n.read_at ? '' : ' unread')}>
                <div className="notif-subject">{n.subject}</div>
                {n.body && <div className="notif-body">{n.body}</div>}
                <div className="notif-time">{timeAgo(n.sent_at, lang, t)}</div>
              </div>
            ))}
          </div>
          <Link to={prefix + '/account'} onClick={() => setOpen(false)} className="notif-pop-foot">
            {t('notif.viewAccount')} →
          </Link>
        </div>
      )}
    </div>
  );
}

function timeAgo(iso, lang, t) {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  const m = Math.round(s / 60), h = Math.round(m / 60), d = Math.round(h / 24);
  if (s < 60) return t('notif.justNow');
  if (m < 60) return m + ' ' + t('common.min');
  if (h < 24) return h + ' ' + t('common.hr');
  return d + ' ' + t('common.day');
}
