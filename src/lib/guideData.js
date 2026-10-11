// The shape of the buying guide's data, shared by the site (lib/guide.js, BuyingGuide) and the
// scripts that check and import it (scripts/import-guide.mjs, check-guide-sources.mjs). No
// browser or server code here, so Node can import it as it is.

// Every datum names where it comes from: one source (`source`, `sourceUrl`, `checkedAt`), or
// several in `sources` (a price band built from more than one sale). Either way, a list.
export function sourcesOf(item) {
  if (!item) return [];
  if (Array.isArray(item.sources) && item.sources.length) return item.sources;
  return item.source ? [{ source: item.source, sourceUrl: item.sourceUrl ?? null, checkedAt: item.checkedAt ?? null }] : [];
}

// The most recent date anything in a list of data was checked (YYYY-MM-DD), or null.
export function latestCheck(items) {
  const dates = items.flatMap((item) => sourcesOf(item).map((s) => s.checkedAt)).filter(Boolean);
  return dates.length ? dates.sort().at(-1) : null;
}

// Every distinct source of a list of data, for "Indicative · sources · updated on …".
export function distinctSources(items) {
  const seen = new Map();
  for (const s of items.flatMap(sourcesOf)) {
    const key = s.sourceUrl ?? s.source;
    if (!seen.has(key)) seen.set(key, s);
  }
  return [...seen.values()];
}
