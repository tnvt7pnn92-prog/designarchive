// URL helpers for archive photos. Pure string work with no data imports, so any component can
// use them without pulling the photo catalogue into its chunk.

// 1stDibs keeps sellers' originals (often 3000–4000 px, several MB) but resizes on request; a
// page of cards asking for dozens of originals at once made many of them time out.
const FIRSTDIBS = /^https:\/\/a\.1stdibscdn\.com\/[^?]+$/;
const firstDibsAt = (src, width) => `${src}?disable=upscale&auto=webp&quality=70&width=${width}`;

// Lighter version of an object image for grids and cards (the lightbox keeps the full one):
// Commons thumbnails drop to a standard 500px step, Unsplash/Pexels to 600px wide, 1stDibs to
// 600px. Pair it with `fallbackToFull` so a thumbnail that can't be served falls back to the
// original URL.
export function cardImage(src) {
  if (!src) return src;
  if (FIRSTDIBS.test(src)) return firstDibsAt(src, 600);
  if (src.includes("upload.wikimedia.org")) {
    if (src.includes("/thumb/")) return src.replace(/\/((?:[a-z-]+-)?)\d+px-([^/]+)$/, "/$1500px-$2");
    const m = /^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons)\/([0-9a-f]\/[0-9a-f]{2})\/([^/]+\.(?:jpe?g|png))$/i.exec(src);
    return m ? `${m[1]}/thumb/${m[2]}/${m[3]}/500px-${m[3]}` : src;
  }
  if (/images\.(unsplash|pexels)\.com/.test(src)) return src.replace(/([?&]w=)\d+/, "$1600");
  return src;
}

// How wide the piece page draws its main photo (see Piece.css): the app and the static page
// written by scripts/prerender.mjs give the browser the same hint.
export const PIECE_HERO_SIZES = "(max-width: 880px) 92vw, 52vw";

// A srcset for a large photo (the piece page's), so a phone gets a 960 px file rather than the
// 1280 px one. Only widths that surely exist: Commons refuses a thumbnail wider than the
// original, so its variants stay below the width of the thumbnail already in use; an original
// file of unknown size gets none. Returns undefined when there is nothing to offer.
const COMMONS_STEPS = [500, 960, 1280];
const STOCK_STEPS = [640, 960, 1280, 2000];

export function responsiveSrcSet(src) {
  if (!src) return undefined;
  if (src.includes("upload.wikimedia.org")) {
    const m = /\/((?:[a-z-]+-)?)(\d+)px-([^/]+)$/.exec(src);
    if (!src.includes("/thumb/") || !m) return undefined;
    const current = Number(m[2]);
    const widths = COMMONS_STEPS.filter((w) => w < current);
    if (!widths.length) return undefined;
    const at = (w) => src.replace(/\/((?:[a-z-]+-)?)\d+px-([^/]+)$/, `/$1${w}px-$2`);
    return [...widths.map((w) => `${at(w)} ${w}w`), `${src} ${current}w`].join(", ");
  }
  if (/images\.(unsplash|pexels)\.com/.test(src) && /[?&]w=\d+/.test(src)) {
    return STOCK_STEPS.map((w) => `${src.replace(/([?&]w=)\d+/, `$1${w}`)} ${w}w`).join(", ");
  }
  // "disable=upscale" keeps a small original at its own size, so every step is safe to offer.
  if (FIRSTDIBS.test(src)) return STOCK_STEPS.map((w) => `${firstDibsAt(src, w)} ${w}w`).join(", ");
  return undefined;
}

export function fallbackToFull(full) {
  return (e) => {
    if (full && e.currentTarget.src !== full) e.currentTarget.src = full;
  };
}
