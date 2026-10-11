// Which of the 50 most iconic pieces have a buying guide, and which blocks each one has.
//   node scripts/guide-coverage.mjs
// "Iconic" = the first 50 pieces of src/data/iconicPieces.js (the best-known, best-photographed ones).
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const load = (rel) => import(pathToFileURL(path.join(root, rel)).href);
const { ICONIC_PIECES } = await load("src/data/iconicPieces.js");
const { OBJECTS } = await load("src/data/objects.js");
const byId = new Map(OBJECTS.map((o) => [o.id, o]));
const file = path.join(root, "data-private/buying-guide.json");
const guide = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};

const iconic = ICONIC_PIECES.slice(0, 50);
const mark = (ok) => (ok ? "✓" : "·");
let complete = 0;
console.log("piece".padEnd(34), "signs  prices  sizes");
for (const id of iconic) {
  const entry = guide[id];
  const signs = entry?.authenticity?.length ?? 0;
  const prices = (entry?.prices?.length ?? 0) > 0;
  const sizes = Boolean(entry?.dimensions);
  if (signs && prices && sizes) complete += 1;
  console.log((byId.get(id)?.name ?? id).slice(0, 33).padEnd(34), String(signs).padStart(5), `  ${mark(prices)}     `, mark(sizes));
}
const withAny = iconic.filter((id) => guide[id]).length;
console.log(`\n${withAny}/50 with a guide, ${complete}/50 complete; ${Object.keys(guide).length} pieces in the file overall.`);
