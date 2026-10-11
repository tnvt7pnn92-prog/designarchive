// Lookups derived from the archive, built once at module load. Every page that needs "the piece
// with this id", "the other pieces by this designer" or "the stories that mention this piece"
// reads them from here instead of rebuilding its own map.
//
// Keep this file plain ESM with no React and no asset imports: the prerender script imports it
// straight from Node to generate one HTML file per piece.
import { OBJECTS, decadeOf } from "./objects.js";
import { STORIES } from "./stories.js";
import { slugify } from "../lib/slug.js";

export const OBJECTS_BY_ID = new Map(OBJECTS.map((o) => [o.id, o]));

export function objectById(id) {
  return OBJECTS_BY_ID.get(id);
}

export function objectsByIds(ids) {
  return (ids ?? []).map((id) => OBJECTS_BY_ID.get(id)).filter(Boolean);
}

function group(items, keyOf) {
  const map = new Map();
  for (const item of items) {
    const keys = keyOf(item);
    for (const key of Array.isArray(keys) ? keys : [keys]) {
      if (key === undefined || key === null || key === "") continue;
      const list = map.get(key);
      if (list) list.push(item);
      else map.set(key, [item]);
    }
  }
  return map;
}

// Slug collisions must never be resolved by renumbering an existing URL, so the first name to
// claim a slug keeps it and later ones are suffixed in source order. Any collision is recorded
// and `scripts/check-data.mjs` fails the build, so a human disambiguates the name in the data.
export const SLUG_COLLISIONS = [];

function bySlug(items, nameOf) {
  const map = new Map();
  const slugForName = new Map();
  for (const item of items) {
    const name = nameOf(item);
    if (!name) continue;
    let slug = slugForName.get(name);
    if (slug === undefined) {
      slug = slugify(name);
      if (map.has(slug)) {
        const base = slug;
        let n = 2;
        while (map.has(`${base}-${n}`)) n += 1;
        slug = `${base}-${n}`;
        SLUG_COLLISIONS.push({ base, slug, name, claimedBy: map.get(base).name });
      }
      slugForName.set(name, slug);
      map.set(slug, { slug, name, objects: [] });
    }
    map.get(slug).objects.push(item);
  }
  const byYear = (a, b) => a.year - b.year || a.name.localeCompare(b.name);
  for (const entry of map.values()) entry.objects.sort(byYear);
  return map;
}

export const BY_DESIGNER = bySlug(OBJECTS, (o) => o.designer);
export const BY_BRAND = bySlug(OBJECTS, (o) => o.brand);

export const BY_COUNTRY = group(OBJECTS, (o) => o.country);
export const BY_CATEGORY = group(OBJECTS, (o) => o.category);
export const BY_STYLE = group(OBJECTS, (o) => o.styles);
// `decadeOf` returns a number from 1900 on and the string "before-1900" below it, so the key is
// always stringified — decode it by looking it up in DECADES, never with Number().
export const BY_DECADE = group(OBJECTS, (o) => String(decadeOf(o.year)));

export function designerBySlug(slug) {
  return BY_DESIGNER.get(slug);
}

export function brandBySlug(slug) {
  return BY_BRAND.get(slug);
}

export function designerSlug(name) {
  return slugify(name);
}

// A story points at pieces in three places: `related`, the `object` of a numbered item, and its
// cover. All three count as "this story talks about that piece".
export const STORIES_BY_OBJECT = new Map();
for (const story of STORIES) {
  const ids = new Set([
    ...(story.related ?? []),
    ...(story.items ?? []).map((item) => item.object).filter(Boolean),
    ...(story.cover?.object ? [story.cover.object] : []),
  ]);
  for (const id of ids) {
    if (!OBJECTS_BY_ID.has(id)) continue;
    const list = STORIES_BY_OBJECT.get(id);
    if (list) list.push(story);
    else STORIES_BY_OBJECT.set(id, [story]);
  }
}
for (const list of STORIES_BY_OBJECT.values()) list.sort((a, b) => b.date.localeCompare(a.date));

export function storiesForObject(id) {
  return STORIES_BY_OBJECT.get(id) ?? [];
}
