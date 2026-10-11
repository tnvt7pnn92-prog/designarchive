import "./MaterialField.css";

// The eight material families the archive tags every piece with (`materialTags`).
const FIELDS = new Set(["wood", "metal", "leather", "fabric", "glass", "plastic", "cane", "marble"]);

// A field of the piece's main material, drawn in CSS: what stands behind a label when there is no
// photo (or the photo has not loaded). Never a grey placeholder.
function materialOf(object) {
  const tag = object?.materialTags?.find((m) => FIELDS.has(m));
  return tag ?? "paper";
}

export default function MaterialField({ object, material, className = "" }) {
  return <span className={`material-field is-${material ?? materialOf(object)}${className ? ` ${className}` : ""}`} aria-hidden="true" />;
}
