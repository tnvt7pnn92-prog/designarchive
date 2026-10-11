import "./Label.css";

// The museum label: the one visual idea that ties the site together. Every piece — in a grid, on
// its own page, in someone's collection — is shown as a card of warm paper with a typed line, the
// name in Fraunces, maker and year in italics, a rule and a short list of facts. It never depends
// on a photo.
//
//   variant   "compact" (cards, rows) · "full" (piece page) · "collection"
//   status    the right-hand end of the typed line: country, or a state
//   name      the title; a node, so cards can put their link in it
//   by        "Designer, 1956" — shown in italics
//   rows      [{ label, value }]: rows without a value are left out
//   stamp     { status: "own" | "want" | "seen" | "saved", text } — collection variant
//   tilt      degrees (±1) for labels "pinned up" on a wall; grids keep them straight (a label in
//             a grid must stay untransformed: the card's stretched link is positioned past it)
export default function Label({
  variant = "compact",
  status,
  name,
  nameAs: Name = "h3",
  by,
  rows = [],
  stamp,
  tilt = 0,
  footer,
  className = "",
  as: Tag = "div",
  ...rest
}) {
  const visibleRows = rows.filter((row) => row && row.value !== undefined && row.value !== null && row.value !== "");
  return (
    <Tag
      className={`museum-label museum-label--${variant}${className ? ` ${className}` : ""}`}
      style={tilt ? { transform: `rotate(${tilt}deg)` } : undefined}
      {...rest}
    >
      {/* The typed line: where it is from. */}
      {status && (
        <p className="museum-label__line">
          <span className="museum-label__status">{status}</span>
        </p>
      )}
      <Name className="museum-label__name">{name}</Name>
      {by && <p className="museum-label__by">{by}</p>}
      {visibleRows.length > 0 && (
        <dl className="museum-label__rows">
          {visibleRows.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {footer}
      {stamp && (
        <span className={`museum-label__stamp is-${stamp.status}`} aria-label={stamp.text}>
          {stamp.text}
        </span>
      )}
    </Tag>
  );
}
