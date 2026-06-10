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
    <div className="notif-bell" ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className="lang-pill"
        aria-label={t('notif.title')}
        aria-expanded={open}
        onClick={toggle}
        style={{ position: 'relative' }}
      >
        <span aria-hidden="true" style={{ fontSize: 16, lineHeight: 1 }}>🔔</span>
        {unread > 0 && (
          <span aria-hidden="true" style={{
            position: 'absolute', top: -5, right: -5, background: '#E5654B', color: '#fff',
            borderRadius: 999, fontSize: 10, fontWeight: 700, minWidth: 16, height: 16,
            lineHeight: '16px', textAlign: 'center', padding: '0 4px',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div role="dialog" aria-label={t('notif.title')} style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 320, maxWidth: '90vw',
          background: '#fff', border: '1px solid var(--gray-200, #e2e8e6)', borderRadius: 12,
          boxShadow: '0 12px 32px rgba(0,0,0,0.14)', zIndex: 200, overflow: 'hidden',
        }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--gray-100, #eef2f1)', fontWeight: 700, fontSize: 14 }}>
            {t('notif.title')}
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {items.length === 0 ? (
              <div style={{ padding: '22px 14px', color: 'var(--gray-500, #7a8783)', fontSize: 14 }}>{t('notif.empty')}</div>
            ) : items.map((n) => (
              <div key={n.id} style={{
                padding: '11px 14px', borderBottom: '1px solid var(--gray-100, #eef2f1)',
                background: n.read_at ? '#fff' : 'var(--teal-soft, #E6F5F2)',
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1C2B27' }}>{n.subject}</div>
                {n.body && <div style={{ fontSize: 13, color: 'var(--gray-600, #4a5a55)', marginTop: 2 }}>{n.body}</div>}
                <div style={{ fontSize: 11, color: 'var(--gray-400, #9aa6a2)', marginTop: 4 }}>{timeAgo(n.sent_at, lang, t)}</div>
              </div>
            ))}
          </div>
          <Link
            to={prefix + '/account'}
            onClick={() => setOpen(false)}
            style={{ display: 'block', textAlign: 'center', padding: '11px 14px', fontSize: 13, fontWeight: 600, color: 'var(--teal, #2D8B7A)', textDecoration: 'none', borderTop: '1px solid var(--gray-100, #eef2f1)' }}
          >
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
