// The archive has no test runner, so this is the safety net: it fails the build when the data
// files contradict each other. Run with `npm run check`.
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const load = (rel) => import(pathToFileURL(path.join(root, rel)).href);

const errors = [];
const fail = (message) => errors.push(message);

const { OBJECTS } = await load("src/data/objects.js");
const { OBJECT_PHOTOS, photoPage } = await load("src/data/objectPhotos.js");
const { STORIES } = await load("src/data/stories.js");
const { OBJECTS_BY_ID, SLUG_COLLISIONS, BY_DESIGNER } = await load("src/data/indexes.js");
const { CARD_SAFE_IDS, isCardSafe } = await load("src/data/photoLicence.js");

// --- objects ---------------------------------------------------------------
const seen = new Set();
for (const o of OBJECTS) {
  if (seen.has(o.id)) fail(`duplicate object id: ${o.id}`);
  seen.add(o.id);
  if (!/^[a-z0-9-]+$/.test(o.id)) fail(`object id is not URL-safe: ${o.id}`);
  for (const field of ["name", "designer", "brand", "country", "category", "description"]) {
    if (!o[field]) fail(`${o.id}: missing ${field}`);
  }
  if (!Number.isInteger(o.year)) fail(`${o.id}: year is not a whole number (${o.year})`);
}

// --- photos ----------------------------------------------------------------
for (const id of Object.keys(OBJECT_PHOTOS)) {
  if (!OBJECTS_BY_ID.has(id)) fail(`photo for an object that does not exist: ${id}`);
}
for (const o of OBJECTS) {
  const photo = OBJECT_PHOTOS[o.id];
  if (!photo) {
    fail(`${o.id}: no photo`);
    continue;
  }
  if (!photo.license) fail(`${o.id}: photo without a licence`);
  // Every photo must credit the page it came from, free licence or not.
  if (!photoPage(photo)) fail(`${o.id}: photo without a source page`);
}

// --- the numbers the home page hard-codes ----------------------------------
const { MARKETS } = await load("src/data/markets.js");
const { MARKET_COUNT } = await load("src/data/stats.js");
if (MARKETS.length !== MARKET_COUNT) fail(`stats.js says ${MARKET_COUNT} markets, markets.js has ${MARKETS.length}`);

// --- markets: every place in its own city (the full report: node scripts/check-markets.mjs) ---
{
  const { report, FAR_KM } = await load("scripts/check-markets.mjs");
  for (const place of report.far) fail(`market "${place.id}" is ${place.km} km from the centre of ${place.city} (more than ${FAR_KM}): check its coordinates`);
  for (const place of report.central) fail(`market "${place.id}" is described as central but is ${place.km} km from the centre of ${place.city}`);
}

// --- markets: kinds, and the brand sales' own fields ---
{
  const { MARKET_KINDS } = await load("src/data/markets.js");
  const { BRANDS } = await load("src/data/objects.js");
  const isDay = (key) => /^\d{4}-\d{2}-\d{2}$/.test(key) && new Date(`${key}T00:00:00Z`).toISOString().startsWith(key);
  for (const m of MARKETS) {
    if (!MARKET_KINDS.includes(m.kind)) fail(`market "${m.id}" has an unknown kind "${m.kind}"`);
    // A brand's sale is only listed with the brand's own page as its source.
    if (m.kind === "sale" && !/^https:\/\/\S+$/.test(m.url ?? "")) fail(`sale "${m.id}" needs the https address of the brand's page`);
    if (m.url !== undefined && !/^https:\/\/\S+$/.test(m.url)) fail(`market "${m.id}" has a url that is not https`);
    // The brand links to its pieces in the archive, so it must be spelt as there.
    if (m.brand !== undefined && !BRANDS.includes(m.brand)) fail(`market "${m.id}": brand "${m.brand}" is not a brand of the archive (leave it out if the archive has none of its pieces)`);
    if (m.dates !== undefined && (!Array.isArray(m.dates) || !m.dates.every(isDay))) fail(`market "${m.id}": dates must be a list of real days, YYYY-MM-DD`);
  }
}

// --- slugs -----------------------------------------------------------------
for (const c of SLUG_COLLISIONS) {
  fail(`designer/brand slug collision: "${c.name}" and "${c.claimedBy}" both slug to "${c.base}" — spell them the same way in the data`);
}

// --- stories ---------------------------------------------------------------
for (const story of STORIES) {
  const ids = [
    ...(story.related ?? []),
    ...(story.items ?? []).map((i) => i.object).filter(Boolean),
    ...(story.cover?.object ? [story.cover.object] : []),
  ];
  for (const id of ids) {
    if (!OBJECTS_BY_ID.has(id)) fail(`story "${story.id}" points at a missing piece: ${id}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(story.date)) fail(`story "${story.id}": bad date ${story.date}`);
}

// --- iconic pieces ----------------------------------------------------------
{
  const { ICONIC_PIECES, FAMOUS_PIECES } = await load("src/data/iconicPieces.js");
  for (const id of ICONIC_PIECES) {
    if (!OBJECTS_BY_ID.has(id)) fail(`iconic pieces: missing piece ${id}`);
    else if (!isCardSafe(id)) fail(`iconic piece is not card-safe: ${id}`);
  }
  // The pieces the archive opens with: real, shown with their photo, each once.
  if (new Set(FAMOUS_PIECES).size !== FAMOUS_PIECES.length) fail("famous pieces: a piece is listed twice");
  for (const id of FAMOUS_PIECES) {
    if (!OBJECTS_BY_ID.has(id)) fail(`famous pieces: missing piece ${id}`);
    else if (!isCardSafe(id)) fail(`famous piece is not card-safe: ${id}`);
  }
}
// --- verified facts --------------------------------------------------------------
// Every sign carries a source and the date it was checked; the public file never holds a price or a
// measurement. The private guide (when present on this computer) is checked in full.
{
  const { PIECE_FACTS } = await load("src/data/pieceFacts.js");
  for (const [id, entry] of Object.entries(PIECE_FACTS)) {
    if (!OBJECTS_BY_ID.has(id)) fail(`piece facts point at a missing piece: ${id}`);
    for (const sign of entry.authenticity ?? []) {
      if (!sign.sources?.length || sign.sources.some((s) => !s.source || !/^\d{4}-\d{2}-\d{2}$/.test(s.checkedAt ?? ""))) fail(`piece facts "${id}": a sign without source or date`);
    }
    for (const key of ["prices", "bands", "dimensions", "min", "max"]) {
      if (key in entry) fail(`piece facts "${id}": the published file must not contain ${key}`);
    }
  }
  const ids = new Set(OBJECTS_BY_ID.keys());
  const guideFile = path.join(root, "data-private/buying-guide.json");
  if (existsSync(guideFile)) {
    const { validateGuide } = await load("scripts/import-guide.mjs");
    for (const problem of validateGuide(JSON.parse(readFileSync(guideFile, "utf8")), ids)) fail(`buying guide: ${problem}`);
  }
}

// --- report ----------------------------------------------------------------
const summary = `${OBJECTS.length} pieces · ${BY_DESIGNER.size} designers · ${CARD_SAFE_IDS.size} card-safe photos · ${STORIES.length} stories`;
if (errors.length) {
  console.error(`check-data: ${errors.length} problem(s)\n` + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log(`check-data: ok — ${summary}`);
