// A report on the markets data, for whoever maintains it. It changes nothing.
//
//   1. Frequencies the date rules (src/lib/marketDates.js) cannot turn into dates, for markets
//      and fairs — shops and galleries have no dates by design. Grouped by wording, most common
//      first, so the ones worth teaching to the parser stand out from the honestly vague ones.
//   2. Places far from their own city: more than 25 km from the city's centre. The centre is the
//      one in src/data/places.js when the city is there, otherwise the median position of the
//      city's places (only for cities with three or more: with fewer there is nothing to compare).
//
//   node scripts/check-markets.mjs            the report
//   node scripts/check-markets.mjs --json     the same as JSON
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const load = (rel) => import(pathToFileURL(path.join(root, rel)).href);
const { MARKETS } = await load("src/data/markets.js");
const { PLACES } = await load("src/data/places.js");
const { parseFrequency } = await load("src/lib/marketDates.js");

export const FAR_KM = 25;
const toRad = (deg) => (deg * Math.PI) / 180;
function haversine(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const cityKey = (label) => label.split(",")[0].trim().toLowerCase();

// ---- 1. frequencies ----
const dated = MARKETS.filter((m) => m.kind !== "shop");
const unread = new Map();
for (const m of dated) {
  if (parseFrequency(m.frequency)) continue;
  const entry = unread.get(m.frequency) ?? { frequency: m.frequency, count: 0, examples: [] };
  entry.count += 1;
  if (entry.examples.length < 2) entry.examples.push(m.id);
  unread.set(m.frequency, entry);
}
const frequencies = [...unread.values()].sort((a, b) => b.count - a.count || a.frequency.localeCompare(b.frequency));

// ---- 2. coordinates ----
const centres = new Map(PLACES.map((p) => [cityKey(p.city), { lat: p.lat, lng: p.lng, source: "places.js" }]));
const byCity = new Map();
for (const m of MARKETS) {
  const key = cityKey(m.city);
  byCity.set(key, [...(byCity.get(key) ?? []), m]);
}
const far = [];
const central = [];
const CENTRAL_KM = 5;
const CENTRAL = /\b(city centre|city center|historic centre|historic center|medieval centre|old town|in the centre|in the center|central(?! (and |& )?(eastern |western )?europe)|downtown|heart of)\b|'s (medieval |historic )?cent(re|er)/i;
let unchecked = 0;
for (const [key, list] of byCity) {
  let centre = centres.get(key);
  if (!centre && list.length >= 3) centre = { lat: median(list.map((m) => m.lat)), lng: median(list.map((m) => m.lng)), source: "median of its places" };
  if (!centre) {
    unchecked += list.length;
    continue;
  }
  for (const m of list) {
    const km = haversine(centre, m);
    const entry = { id: m.id, name: m.name, city: m.city, kind: m.kind, lat: m.lat, lng: m.lng, km: Math.round(km * 10) / 10, centre: centre.source };
    if (km > FAR_KM) far.push(entry);
    // Closer than that, but the description places it in the centre: worth a look too.
    else if (km > CENTRAL_KM && CENTRAL.test(m.description ?? "")) central.push(entry);
  }
}
far.sort((a, b) => b.km - a.km);
central.sort((a, b) => b.km - a.km);

export const report = {
  places: MARKETS.length,
  dated: dated.length,
  withDates: dated.length - frequencies.reduce((sum, f) => sum + f.count, 0),
  frequencies,
  far,
  central,
  unchecked,
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--json")) console.log(JSON.stringify(report, null, 1));
  else {
    console.log(`check-markets: ${report.places} places; ${report.dated} markets and fairs, ${report.withDates} with dates the rules can work out\n`);
    console.log(`Frequencies without dates: ${frequencies.length} wordings, ${report.dated - report.withDates} places`);
    for (const f of frequencies) console.log(`  ${String(f.count).padStart(3)} × ${f.frequency}   (${f.examples.join(", ")})`);
    console.log(`\nMore than ${FAR_KM} km from their city's centre: ${far.length} (not checked: ${unchecked} places in cities with fewer than three)`);
    for (const p of far) console.log(`  ${String(p.km).padStart(5)} km  ${p.id} — ${p.name} [${p.city}] ${p.lat}, ${p.lng}  (centre: ${p.centre})`);
    console.log(`\nDescribed as central, but more than ${CENTRAL_KM} km from the centre: ${central.length}`);
    for (const p of central) console.log(`  ${String(p.km).padStart(5)} km  ${p.id} — ${p.name} [${p.city}] ${p.lat}, ${p.lng}`);
  }
}
