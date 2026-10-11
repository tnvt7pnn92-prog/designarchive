// Rows of related pieces ("By Mies van der Rohe", "Also from Germany") are always one full row
// of ROW cards. When a row has fewer pieces of its own, the rest of it is filled with pieces in
// the same spirit, under their own heading — never an empty half row, never a mislabelled piece.
import { BY_CATEGORY, BY_DECADE, BY_STYLE } from "../data/indexes.js";
import { decadeOf } from "../data/objects.js";

export const ROW = 4;

// Pieces like `object`, best first: same decade and category, then same category and a shared
// style, then a shared style. Photographed pieces first within each step, then the closest years.
export function similarPieces(object, exclude = new Set(), count = ROW) {
  const shares = (o) => o.styles.some((s) => object.styles.includes(s));
  const byStyle = [...new Set(object.styles.flatMap((s) => BY_STYLE.get(s) ?? []))];
  const steps = [
    (BY_DECADE.get(String(decadeOf(object.year))) ?? []).filter((o) => o.category === object.category),
    (BY_CATEGORY.get(object.category) ?? []).filter(shares),
    byStyle,
  ];
  const picked = [];
  const taken = new Set([object.id, ...exclude]);
  for (const step of steps) {
    const candidates = step
      .filter((o) => !taken.has(o.id))
      .sort((a, b) => Number(Boolean(b.image)) - Number(Boolean(a.image)) || Math.abs(a.year - object.year) - Math.abs(b.year - object.year));
    for (const o of candidates) {
      if (picked.length >= count) return picked;
      picked.push(o);
      taken.add(o.id);
    }
  }
  return picked;
}

// One full row: `own` pieces under their title, then as many similar pieces as the row needs.
// Returns the groups to draw ([] when there is nothing at all), each { key, title, items, more }.
export function fillRow({ object, own, title, more, spiritTitle, exclude = new Set() }) {
  const mine = own.slice(0, ROW);
  const groups = mine.length ? [{ key: "own", title, items: mine, more }] : [];
  const missing = ROW - mine.length;
  if (missing > 0) {
    const filler = similarPieces(object, new Set([...exclude, ...mine.map((o) => o.id)]), missing);
    if (filler.length) groups.push({ key: "spirit", title: spiritTitle, items: filler });
  }
  return groups;
}

// Every piece id a list of groups shows, so the next row on the page can leave them out.
export const shownIn = (groups) => new Set(groups.flatMap((g) => g.items.map((o) => o.id)));
