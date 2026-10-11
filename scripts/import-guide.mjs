// The verified facts of a piece (once "the buying guide"), from a private file to where they belong.
//
//   data-private/buying-guide.json   (never published: data-private/ is in .gitignore)
//   data-private/price-bases.json    (production status and makers)
//      → src/data/pieceFacts.js      public: every sign of authenticity with its sources, whether
//                                    the piece is still made and by whom — shown on the piece
//                                    page to everyone. Never prices, never measurements.
//      → table buying_guide          the measurements (and the rest), readable by everyone, for
//                                    the room's real proportions (with --upload; needs
//                                    SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
//
//   node scripts/import-guide.mjs            validate and write pieceFacts.js
//   node scripts/import-guide.mjs --upload   also upsert every piece into buying_guide
//
// Nothing is invented: every sign, price and measurement names the page it comes from (opened and
// read, with the date) and how sure we are, or the import stops. Format of one piece:
//
//   "egg-chair": {
//     "inProduction": true, "manufacturerUrl": "https://…",
//     "authenticity": [                       // 3–6 signs, the most useful first (it is the free one)
//       { "text": { "en": "… (≤ 240 characters)" }, "confidence": "high" | "medium",
//         "sources": [ { "source": "Page title", "sourceUrl": "https://…", "checkedAt": "2026-09-29" } ] }
//     ],
//     "prices": [                             // always in euro
//       { "kind": "new" | "vintage" | "reissue", "min": 7000, "max": 9500, "currency": "EUR",
//         "confidence": "high" | "medium", "note": "what the band covers",
//         "fx": { "rate": 1.1378, "currency": "USD", "date": "2026-09-28",       // when a source is
//                 "source": "ECB reference rate", "sourceUrl": "https://…" },  // not in euro: 1 EUR = rate
//         "sources": [ { "source": "…", "sourceUrl": "https://…", "checkedAt": "2026-09-29",
//                        "amount": 4826, "currency": "USD", "soldOn": "2025-04-23", "note": "c. 1970" } ] }
//     ],
//     "dimensions": { "width": 86, "depth": 79, "height": 107, "seatHeight": 37, "unit": "cm",
//                     "version": "classic size", "confidence": "high", "sources": [ … ] }
//   }
//
// "vintage" bands are sales that closed (never asking prices), at least two, from the last five
// years. The older single-source form ("source", "sourceUrl", "checkedAt" on the datum itself) is
// still accepted.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { sourcesOf } from "../src/lib/guideData.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(root, "data-private/buying-guide.json");
const TARGET = path.join(root, "src/data/pieceFacts.js");
const BASES = path.join(root, "data-private/price-bases.json");
const { OBJECTS } = await import(pathToFileURL(path.join(root, "src/data/objects.js")).href);
const ids = new Set(OBJECTS.map((o) => o.id));

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const KINDS = new Set(["new", "vintage", "reissue"]);
const CONFIDENCE = new Set(["high", "medium"]);
const DIMENSIONS = ["width", "depth", "height", "seatHeight"];
export const MAX_SIGN_LENGTH = 240;
export const MAX_SIGNS = 6;
const VINTAGE_YEARS = 5;

const yearsBefore = (date, years) => `${Number(date.slice(0, 4)) - years}${date.slice(4)}`;

// The rules `npm run check:data` applies too. Each problem is one line.
export function validateGuide(guide, knownIds = ids, today = new Date().toISOString().slice(0, 10)) {
  const problems = [];
  // Every source: a title, an https address and the date it was read (not in the future).
  const sourced = (where, item) => {
    const list = sourcesOf(item);
    if (!list.length) problems.push(`${where}: no source`);
    list.forEach((s, i) => {
      const at = list.length > 1 ? `${where}.sources[${i}]` : where;
      if (!s.source || typeof s.source !== "string") problems.push(`${at}: missing source title`);
      if (!/^https:\/\//.test(s.sourceUrl ?? "")) problems.push(`${at}: missing https sourceUrl`);
      if (!DATE.test(s.checkedAt ?? "")) problems.push(`${at}: missing checkedAt (YYYY-MM-DD)`);
      else if (s.checkedAt > today) problems.push(`${at}: checkedAt is in the future`);
    });
    return list;
  };
  const confident = (where, item) => {
    if (!CONFIDENCE.has(item?.confidence)) problems.push(`${where}: confidence must be "high" or "medium"`);
  };

  for (const [id, entry] of Object.entries(guide)) {
    if (!knownIds.has(id)) problems.push(`${id}: not an archive piece`);
    const signs = entry.authenticity ?? [];
    if (signs.length > MAX_SIGNS) problems.push(`${id}.authenticity: at most ${MAX_SIGNS} signs`);
    signs.forEach((sign, i) => {
      const where = `${id}.authenticity[${i}]`;
      const text = typeof sign.text === "string" ? sign.text : sign.text?.en;
      if (!text) problems.push(`${where}: missing English text`);
      else if (text.length > MAX_SIGN_LENGTH) problems.push(`${where}: ${text.length} characters (max ${MAX_SIGN_LENGTH})`);
      confident(where, sign);
      sourced(where, sign);
    });

    (entry.prices ?? []).forEach((price, i) => {
      const where = `${id}.prices[${i}]`;
      if (!KINDS.has(price.kind)) problems.push(`${where}: kind must be new, vintage or reissue`);
      if (price.currency !== "EUR") problems.push(`${where}: currency must be EUR (convert, and note the rate in "fx")`);
      if (typeof price.min !== "number" || typeof price.max !== "number" || price.min < 0) problems.push(`${where}: min and max must be numbers`);
      else if (price.min > price.max) problems.push(`${where}: min is greater than max`);
      confident(where, price);
      const list = sourced(where, price);
      if (list.some((s) => s.currency && s.currency !== "EUR")) {
        const fx = price.fx;
        if (!(fx?.rate > 0) || !DATE.test(fx?.date ?? "") || !fx?.source || !/^https:\/\//.test(fx?.sourceUrl ?? "")) {
          problems.push(`${where}: a source is not in euro, so "fx" needs rate, date, source and sourceUrl`);
        }
      }
      if (price.kind === "vintage") {
        if (list.length < 2) problems.push(`${where}: a vintage band needs at least two closed sales`);
        list.forEach((s, j) => {
          if (!DATE.test(s.soldOn ?? "")) problems.push(`${where}.sources[${j}]: a sale needs soldOn (YYYY-MM-DD)`);
          else if (s.checkedAt && s.soldOn < yearsBefore(s.checkedAt, VINTAGE_YEARS)) problems.push(`${where}.sources[${j}]: sold more than ${VINTAGE_YEARS} years ago`);
          if (typeof s.amount !== "number") problems.push(`${where}.sources[${j}]: a sale needs its amount`);
        });
      }
    });

    if (entry.dimensions) {
      const d = entry.dimensions;
      const where = `${id}.dimensions`;
      for (const key of DIMENSIONS) {
        if (key in d && !(typeof d[key] === "number" && d[key] > 0)) problems.push(`${where}.${key}: not a number`);
      }
      if (!["width", "depth", "height"].some((key) => d[key] > 0)) problems.push(`${where}: no measurement`);
      if (d.unit && d.unit !== "cm") problems.push(`${where}: unit must be cm`);
      confident(where, d);
      sourced(where, d);
    }
    if (entry.manufacturerUrl && !/^https:\/\//.test(entry.manufacturerUrl)) problems.push(`${id}.manufacturerUrl must be https`);
    if ("inProduction" in entry && typeof entry.inProduction !== "boolean") problems.push(`${id}.inProduction must be true or false`);
  }
  return problems;
}

// What the static site may know: every sign of authenticity (with its sources) and the piece's
// production — never a price or a measurement.
export function publicFacts(guide, bases = {}) {
  const out = {};
  const ids = [...new Set([...Object.keys(guide), ...Object.keys(bases).filter((id) => bases[id]?.production)])].sort();
  for (const id of ids) {
    const entry = guide[id] ?? {};
    const production = bases[id]?.production;
    out[id] = {
      authenticity: (entry.authenticity ?? []).map((sign) => ({ text: sign.text, confidence: sign.confidence ?? null, sources: sourcesOf(sign) })),
      inProduction: production ? production.status === "in-production" : (entry.inProduction ?? null),
      production: production ? { status: production.status, makers: production.makers ?? [] } : null,
      manufacturerUrl: entry.manufacturerUrl ?? null,
    };
  }
  return out;
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const guide = existsSync(SOURCE) ? JSON.parse(readFileSync(SOURCE, "utf8")) : {};
  if (!existsSync(SOURCE)) console.log("import-guide: no data-private/buying-guide.json — writing an empty guide");
  const problems = validateGuide(guide);
  if (problems.length) {
    console.error(`import-guide: ${problems.length} problem(s)\n  - ${problems.join("\n  - ")}`);
    process.exit(1);
  }
  writeFileSync(
    TARGET,
    `// GENERATED by scripts/import-guide.mjs — do not edit. The verified, public facts of a piece:
// every sign of authenticity with its sources, and whether (and by whom) it is still made. Shown on
// the piece page to everyone. Prices and measurements are never here.

export const PIECE_FACTS = ${JSON.stringify(publicFacts(guide, existsSync(BASES) ? JSON.parse(readFileSync(BASES, "utf8")) : {}), null, 2)};
`
  );
  console.log(`import-guide: ${Object.keys(guide).length} pieces → src/data/pieceFacts.js`);

  if (process.argv.includes("--upload")) {
    const env = { ...process.env };
    const local = path.join(root, ".env.local");
    if (existsSync(local)) {
      for (const line of readFileSync(local, "utf8").split(/\r?\n/)) {
        const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
        if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
    const url = env.SUPABASE_URL ?? env.VITE_SUPABASE_URL;
    const key = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      console.error("import-guide --upload: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are needed");
      process.exit(1);
    }
    const rows = Object.entries(guide).map(([piece_id, entry]) => ({
      piece_id,
      authenticity: entry.authenticity ?? [],
      prices: entry.prices ?? [],
      dimensions: entry.dimensions ?? null,
      in_production: entry.inProduction ?? null,
      manufacturer_url: entry.manufacturerUrl ?? null,
      updated_at: new Date().toISOString(),
    }));
    const response = await fetch(`${url}/rest/v1/buying_guide`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify(rows),
    });
    if (!response.ok) {
      console.error(`import-guide --upload: ${response.status} ${await response.text()}`);
      process.exit(1);
    }
    console.log(`import-guide: ${rows.length} pieces uploaded to buying_guide`);
  }
}
