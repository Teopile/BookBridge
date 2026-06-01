import { useT } from '../i18n/I18nContext.jsx';

// Shared layout for the legal/compliance pages (Privacy, Terms, Cookies).
// Renders the standard section/container shell, the page title, a visible
// "review with a lawyer" template notice, and a last-updated line, then the
// page body via children. Keeps the three pages DRY and visually consistent.

const LAST_UPDATED = '2026-05-30';

export default function LegalPage({ titleKey, introKey, children }) {
  const { t } = useT();

  return (
    <section className="section">
      <div className="container container-narrow">
        <span className="stamp">
          {t('legal.eyebrow')}
          <svg className="underline" viewBox="0 0 120 6" preserveAspectRatio="none" aria-hidden="true">
            <path
              d="M1 4 C30 2, 60 5, 90 2 S118 4, 119 4"
              fill="none"
              stroke="var(--clay)"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </span>

        <h1 style={{ marginBottom: 'var(--space-3)' }}>{t(titleKey)}</h1>

        <div
          role="note"
          style={{
            background: 'var(--honey-50)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--r-md)',
            padding: 'var(--space-4) var(--space-5)',
            marginBottom: 'var(--space-6)',
            color: 'var(--text-default)',
            fontSize: 'var(--fs-sm)',
            lineHeight: 'var(--lh-relaxed)',
          }}
        >
          <strong>{t('legal.templateNotice')}</strong>
        </div>

        <p
          style={{
            color: 'var(--text-muted)',
            fontSize: 'var(--fs-sm)',
            marginBottom: 'var(--space-6)',
          }}
        >
          {t('legal.lastUpdated', { date: LAST_UPDATED })}
        </p>

        {introKey && (
          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: 'var(--fs-md)',
              lineHeight: 'var(--lh-relaxed)',
              marginBottom: 'var(--space-7)',
            }}
          >
            {t(introKey)}
          </p>
        )}

        <div className="legal-body">{children}</div>
      </div>
    </section>
  );
}

// Small presentational helpers shared by the legal pages. Kept here so the
// page files stay focused on content, and so spacing/typography are uniform.

export function LegalSection({ heading, children }) {
  return (
    <section style={{ marginBottom: 'var(--space-8)' }}>
      <h2 style={{ fontSize: 'var(--fs-h3)', marginBottom: 'var(--space-3)' }}>{heading}</h2>
      {children}
    </section>
  );
}

export function LegalParagraph({ children }) {
  return (
    <p
      style={{
        color: 'var(--text-muted)',
        fontSize: 'var(--fs-base)',
        lineHeight: 'var(--lh-relaxed)',
        marginBottom: 'var(--space-4)',
      }}
    >
      {children}
    </p>
  );
}

export function LegalList({ items }) {
  // t() returns the raw i18n value; arrays render directly. Guard against a
  // missing key (t() falls back to returning the key string) so a typo never
  // crashes the page on a .map of a non-array.
  const list = Array.isArray(items) ? items : [];
  return (
    <ul
      style={{
        color: 'var(--text-muted)',
        fontSize: 'var(--fs-base)',
        lineHeight: 'var(--lh-relaxed)',
        paddingLeft: 'var(--space-6)',
        marginBottom: 'var(--space-4)',
        listStyle: 'disc',
      }}
    >
      {list.map((item, i) => (
        <li key={i} style={{ marginBottom: 'var(--space-2)' }}>
          {item}
        </li>
      ))}
    </ul>
  );
}
