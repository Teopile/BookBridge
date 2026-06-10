// Reusable full-width photo header for section landing pages (MyHome-style).
// Swapping a photo = changing the `image` prop; the files live in
// frontend/public/heroes/ (placeholder Unsplash photos until the designer
// delivers final ones).
export default function SectionHero({ image, eyebrow, title, subtitle, cta, children, compact = false }) {
  return (
    <header className={'section-hero' + (compact ? ' section-hero--compact' : '')}>
      {/* LCP element — load eagerly with high priority. */}
      <img
        className="section-hero-bg"
        src={image}
        alt=""
        fetchpriority="high"
        decoding="async"
        width={1600}
        height={600}
      />
      <div className="section-hero-scrim" aria-hidden="true" />
      <div className="container section-hero-content">
        {eyebrow && <p className="section-hero-eyebrow">{eyebrow}</p>}
        <h1 className="section-hero-title">{title}</h1>
        {subtitle && <p className="section-hero-sub">{subtitle}</p>}
        {cta && <div className="section-hero-cta">{cta}</div>}
        {children}
      </div>
    </header>
  );
}
