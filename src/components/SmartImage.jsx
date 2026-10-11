import { useCallback, useState } from "react";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { cardImage, responsiveSrcSet } from "../lib/imageUrls.js";
import PhotoPlaceholder from "./PhotoPlaceholder.jsx";
import "./SmartImage.css";

// Every archive photo is hotlinked from someone else's server, so any of them can be slow, move
// or disappear. This is the one place that deals with that:
//   - the box keeps its shape while loading (`ratio`), so nothing jumps;
//   - a quiet shimmer shows while it loads, then the photo fades in;
//   - `card` asks for a lighter thumbnail first and falls back to the full file;
//   - `sizes` (for big photos) adds a srcset so a phone picks a smaller file; if that file
//     fails, the plain URL is tried before giving up;
//   - `fallback` (cards pass the piece's material field) stands behind the photo while it loads,
//     and takes its place if both files fail; without one, the drawn placeholder for its category
//     — never the browser's broken-image icon or a stray alt text;
//   - `cutout` ({ ground, box } of a maker's cut-out photo) shows the piece whole on its ground
//     instead of cropping it to the box; `box` trims the empty ground around the piece where the
//     browser supports object-view-box (elsewhere the whole photo shows, a little smaller).
export default function SmartImage({
  src,
  alt = "",
  ratio,
  card = false,
  category,
  priority = false,
  cutout,
  fit: fitProp = "cover",
  natural = false,
  draggable,
  className = "",
  imgClassName = "",
  style,
  sizes,
  fallback,
}) {
  const { t } = useLanguage();
  const fit = cutout ? "contain" : fitProp;
  const first = card ? cardImage(src) : src;
  const fresh = { for: src, current: first, status: src ? "loading" : "error", srcSet: !card && sizes ? responsiveSrcSet(src) : undefined };
  const [state, setState] = useState(fresh);

  // A new photo (another piece, same component) starts over.
  if (state.for !== src) setState(fresh);

  const onError = useCallback(() => {
    setState((prev) => {
      if (prev.srcSet) return { ...prev, srcSet: undefined, status: "loading" };
      return card && prev.current !== src ? { ...prev, current: src, status: "loading" } : { ...prev, status: "error" };
    });
  }, [card, src]);

  // Cached images can finish before React attaches onLoad; checking on mount catches them.
  const imgRef = useCallback((img) => {
    if (img?.complete && img.naturalWidth > 0) setState((prev) => (prev.status === "loading" ? { ...prev, status: "loaded" } : prev));
  }, []);

  return (
    <span
      className={`smart-image is-${state.status}${natural ? " is-natural" : ""}${cutout ? " is-cutout" : ""}${className ? ` ${className}` : ""}`}
      style={{ ...(ratio ? { aspectRatio: ratio } : null), ...(cutout ? { "--cutout": cutout.ground } : null), ...style }}
    >
      {state.status === "error" ? (
        fallback ?? <PhotoPlaceholder category={category} label={t("a11y.imageMissing")} />
      ) : (
        <>
          {/* While the photo is on its way, the card already shows its material, not a dark box. */}
          {state.status === "loading" && fallback}
          <img
          ref={imgRef}
          key={`${state.current}${state.srcSet ? " set" : ""}`}
          src={state.current}
          srcSet={state.srcSet}
          sizes={state.srcSet ? sizes : undefined}
          alt={alt}
          className={imgClassName}
          style={{ objectFit: fit, ...(cutout?.box ? { objectViewBox: `inset(${cutout.box})` } : null) }}
          draggable={draggable}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : undefined}
          onLoad={() => setState((prev) => ({ ...prev, status: "loaded" }))}
          onError={onError}
          />
        </>
      )}
    </span>
  );
}
