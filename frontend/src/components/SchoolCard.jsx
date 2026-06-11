import { Link } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';

// School card with a myhome.ge-style hover reveal: the cover photo shrinks and
// a details section (key facts + donate CTA) slides into the freed space. The
// reveal is pure CSS (see .school--reveal in global.css): it triggers on
// :hover and :focus-within, renders permanently expanded on (hover: none)
// touch devices, and collapses to instant show/hide under reduced motion.
//
// Markup notes:
// - The whole card is clickable via the stretched-link pattern (the h3 link's
//   ::after covers the card) instead of nesting the card in one big <a> —
//   nested anchors are invalid HTML and the details CTA must stay an
//   independent link.
// - The details section is ALWAYS in the DOM (visually collapsed via
//   height/opacity), so screen readers and crawlers see it in every state.

// The bulk-imported descriptions are "<N> მოსწავლე" — surface N as a fact row.
function studentsFrom(description) {
  const m = /(\d+)\s*მოსწავლე/.exec(description || '');
  return m ? m[1] : null;
}

export default function SchoolCard({ school, photo }) {
  const { t, lang } = useT();
  const prefix = '/' + lang;
  const students = studentsFrom(school.description);

  const rows = [
    [t('schoolCard.students'), students],
    [t('schoolCard.district'), school.city],
    [t('schoolCard.address'), school.address || school.region],
  ];

  return (
    <article className="school school--reveal">
      <div className="school-photo">
        <img src={photo} alt={school.name} width={600} height={450} loading="lazy" decoding="async" />
        <span className="school-badge">{t('schools.' + school.type)}</span>
        {school.region && <span className="school-photo-chip">{school.region}</span>}
      </div>

      <div className="school-body">
        <h3>
          <Link to={prefix + '/schools/' + school.id} className="school-link">
            {school.name}
          </Link>
        </h3>
        <div className="school-region">{school.region}{school.city ? ' · ' + school.city : ''}</div>
        {school.description && (
          <p className="school-blurb">
            {school.description.slice(0, 110)}{school.description.length > 110 ? '…' : ''}
          </p>
        )}
      </div>

      <div className="school-details">
        <dl className="school-details-rows">
          {rows.map(([label, value]) => (
            <div className="school-details-row" key={label}>
              <dt>{label}</dt>
              <dd>{value || '—'}</dd>
            </div>
          ))}
        </dl>
        <Link
          to={prefix + '/donate?school=' + school.id}
          className="btn btn-primary btn-block school-details-cta"
          onClick={(e) => e.stopPropagation()}
        >
          {t('home.donateToSchool')}
        </Link>
      </div>
    </article>
  );
}
