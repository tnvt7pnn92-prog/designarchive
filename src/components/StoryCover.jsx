import { STORY_COVERS } from "../data/storyCovers.js";
import { storyPieces } from "../lib/storyPieces.js";
import SmartImage from "./SmartImage.jsx";
import MaterialField from "./MaterialField.jsx";
import Label from "./Label.jsx";
import "./StoryCover.css";

const TONES = new Set(["cream", "teal", "pink", "gold", "ink", "cloud", "orange", "brown"]);

// The cover of a story. Most are typographic: a single figure — "145 cm", "1965", "€21.9M" — set
// huge in Fraunces on the story's tint, which is the visual language of the section. A story about
// one piece shows that piece's archive photo with its museum label pinned on it (`label={false}`
// leaves the label out where the cover is tiny).
// `pins` (0–2) pins photos of the pieces the story names on a typographic cover, like polaroids on a
// magazine page; `pinLabel` adds the first one's museum label (for the big cover of the day).
export default function StoryCover({ story, className = "", label = true, priority = false, pins = 0, pinLabel = false }) {
  const { object: objectId, mark = "", tone = "ink" } = story.cover ?? {};
  const piece = objectId ? STORY_COVERS[objectId] : null;

  if (piece) {
    return (
      <span className={`story-cover story-cover--photo ${className}`}>
        <SmartImage src={piece.image} cutout={piece.cutout} alt={piece.name} category={piece.category} priority={priority} fallback={<MaterialField object={piece} />} />
        {label && (
          <Label
            className="story-cover__label"
            tilt={-1.5}
            status={piece.country}
            nameAs="span"
            name={piece.name}
            by={`${piece.designer}, ${piece.year}`}
          />
        )}
      </span>
    );
  }

  const pinned = pins > 0 ? storyPieces(story).slice(0, pins) : [];
  const tint = TONES.has(tone) ? tone : "ink";
  return (
    <span
      className={`story-cover story-cover--type story-cover--${tint}${pinned.length ? ` has-pins is-${pinned.length}` : ""} ${className}`}
      style={{ "--mark-len": Math.max(mark.length, 1), "--cover-bg": `var(--tone-${tint})`, "--cover-ink": `var(--tone-${tint}-ink)` }}
      aria-hidden="true"
    >
      <span className="story-cover__mark">{mark}</span>
      {pinned.map((p, i) => (
        <span key={p.id} className="story-cover__pin">
          <SmartImage src={p.image} cutout={p.cutout} alt="" card category={p.category} priority={priority && i === 0} fallback={<MaterialField object={p} />} />
          {pinLabel && i === 0 && <Label className="story-cover__pin-label" tilt={-2} status={p.country} nameAs="span" name={p.name} by={`${p.designer}, ${p.year}`} />}
        </span>
      ))}
    </span>
  );
}
