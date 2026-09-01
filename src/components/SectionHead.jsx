// Oversized editorial section header: a two-digit index, the title, and a
// hairline that runs out to the edge of the column. `action` is an optional
// right-aligned control (e.g. "Clear" on Recently used).
export default function SectionHead({ index, icon, title, blurb, action }) {
  return (
    <div className="sechead">
      <span className="sechead__n" aria-hidden="true">
        {String(index).padStart(2, '0')}
      </span>

      <div className="sechead__text">
        <h2 className="sechead__title">
          {icon}
          {title}
        </h2>
        {blurb && <p className="sechead__blurb">{blurb}</p>}
      </div>

      <span className="sechead__rule" aria-hidden="true" />
      {action}
    </div>
  )
}
