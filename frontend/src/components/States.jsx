import { useT } from '../i18n/I18nContext.jsx';
import Icon from './Icon.jsx';

/** Skeleton loader for a card-shaped page area. */
export function Loading({ kind = 'card' }) {
  if (kind === 'banner') {
    return (
      <>
        <div className="skeleton skeleton-banner" />
        <div className="skeleton skeleton-line" style={{ width: '60%' }} />
        <div className="skeleton skeleton-line" style={{ width: '40%' }} />
      </>
    );
  }
  if (kind === 'list') {
    return (
      <div className="row-list">
        {Array.from({ length: 3 }).map((_, i) => (
          <div className="row-item" key={i} style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="skeleton skeleton-circle" />
            <div style={{ flex: 1 }}>
              <div className="skeleton skeleton-line" style={{ width: '50%' }} />
              <div className="skeleton skeleton-line" style={{ width: '30%', marginBottom: 0 }} />
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="card" style={{ margin: 0, maxWidth: 'none' }}>
      <div className="skeleton skeleton-line" style={{ width: '50%' }} />
      <div className="skeleton skeleton-line" style={{ width: '80%' }} />
      <div className="skeleton skeleton-line" style={{ width: '70%' }} />
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  const { t } = useT();
  return (
    <div className="state error">
      <div className="state-icon">
        <Icon name="shield" size={48} color="var(--danger)" />
      </div>
      <h3>{t('common.errorTitle')}</h3>
      <p>{friendly(message, t)}</p>
      {onRetry && (
        <button className="btn btn-secondary" onClick={onRetry}>{t('common.tryAgain')}</button>
      )}
    </div>
  );
}

/**
 * EmptyState — pass `icon` as a React node (e.g. <Icon name="bookOpen" />).
 * For backwards compatibility, a string is rendered inside a tinted circle.
 */
export function EmptyState({ icon, title, body, action }) {
  const iconNode = icon == null
    ? <Icon name="bookOpen" size={48} color="var(--forest-500)" />
    : icon;
  return (
    <div className="state">
      <div className="state-icon">{iconNode}</div>
      <h3>{title}</h3>
      {body && <p>{body}</p>}
      {action}
    </div>
  );
}

/** Translate raw server error codes into human messages. */
function friendly(message, t) {
  const map = {
    'auth_required':        t('errors.authRequired'),
    'csrf_mismatch':        t('errors.csrfMismatch'),
    'forbidden':            t('errors.forbidden'),
    'not_found':            t('errors.notFound'),
    'rate_limited':         t('errors.rateLimited'),
    'validation_failed':    t('errors.validationFailed'),
    'username_taken':       t('errors.usernameTaken'),
    'email_taken':          t('errors.emailTaken'),
    'email_not_confirmed':  t('errors.emailNotConfirmed'),
    'invalid_token':        t('errors.invalidToken'),
  };
  if (!message) return t('errors.generic');
  if (map[message]) return map[message];
  return message;
}
