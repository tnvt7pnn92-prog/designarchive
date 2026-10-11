// Which photos may be redrawn into something we hand out — an OG card, a social card, a share
// image — as opposed to merely displayed on the site with a link to their source.
//
// Two conditions, both required:
//   1. the licence is a free one (Creative Commons, public domain, Unsplash, Pexels). Photos
//      marked "© rights holder" are shown on the site for reference only, and the three brand
//      permissions ("Used with permission of …") cover display here, not redistribution.
//   2. the host sends CORS headers, otherwise drawing the image taints the canvas and the export
//      throws.
import { OBJECT_PHOTOS, photoUrl, photoSource } from "./objectPhotos.js";

const FREE_LICENCE = /^(cc0|cc by|public domain|unsplash license|pexels license)/i;

const CORS_HOSTS = new Set([
  "upload.wikimedia.org",
  "live.staticflickr.com",
  "images.unsplash.com",
  "images.pexels.com",
]);

export function isFreeLicence(entry) {
  return Boolean(entry) && FREE_LICENCE.test(entry.license ?? "");
}

function hostOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

export function isCardSafe(id) {
  const entry = OBJECT_PHOTOS[id];
  if (!isFreeLicence(entry)) return false;
  return CORS_HOSTS.has(hostOf(photoUrl(entry)));
}

export const CARD_SAFE_IDS = new Set(Object.keys(OBJECT_PHOTOS).filter(isCardSafe));

// Throws rather than returning a URL that would taint the canvas: a card must fail at load, not
// silently at export time.
export function cardPhotoUrl(id) {
  if (!CARD_SAFE_IDS.has(id)) throw new Error(`photo for "${id}" is not card-safe`);
  return photoUrl(OBJECT_PHOTOS[id]);
}

// The credit that every generated image carries, baked in by the shared card chrome.
export function creditLine(id) {
  const entry = OBJECT_PHOTOS[id];
  if (!entry) return "";
  return ["Photo", entry.author, entry.license, photoSource(entry)].filter(Boolean).join(" · ");
}
