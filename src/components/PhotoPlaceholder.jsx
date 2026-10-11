import { placeholderIcon } from "../data/placeholderIcons.js";
import "./PhotoPlaceholder.css";

export default function PhotoPlaceholder({ category, label = "Photograph pending" }) {
  return (
    <div className="photo-placeholder">
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
        {placeholderIcon(category).map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
      <span>{label}</span>
    </div>
  );
}
