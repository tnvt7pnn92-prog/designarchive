// Keeps the five dictionaries in step: English is the reference, every other language must have
// exactly the same keys. Run with `npm run check`.
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LANGS = ["en", "it", "es", "fr", "zh"];

function flatten(value, prefix = "", out = new Map()) {
  for (const [key, child] of Object.entries(value)) {
    const dotted = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object" && !Array.isArray(child)) flatten(child, dotted, out);
    else out.set(dotted, child);
  }
  return out;
}

const dicts = {};
for (const lang of LANGS) {
  const mod = await import(pathToFileURL(path.join(root, `src/i18n/dictionaries/${lang}.js`)).href);
  dicts[lang] = flatten(mod.default);
}

// Texts that read the same as English on purpose: "moodboard" is the site's word in every language
// that uses the Latin alphabet, "designers" is French too, and an example address needs no translation.
const SAME_ON_PURPOSE = new Set([
  "it: merge.moodboard",
  "it: boards.untitled",
  "es: merge.moodboard",
  "es: merge.moodboards",
  "es: boards.untitled",
  "es: boards.count",
  "fr: home.rooms.designers.figure",
  "fr: merge.moodboard",
  "fr: merge.moodboards",
  "fr: boards.untitled",
  "fr: boards.count",
  "zh: auth.emailPlaceholder",
]);

const errors = [];
const untranslated = [];
const reference = dicts.en;

for (const lang of LANGS.filter((l) => l !== "en")) {
  const dict = dicts[lang];
  for (const key of reference.keys()) if (!dict.has(key)) errors.push(`${lang}: missing "${key}"`);
  for (const key of dict.keys()) if (!reference.has(key)) errors.push(`${lang}: "${key}" has no English original`);
  for (const [key, value] of dict) {
    // Same text as English is usually a scaffolded key nobody translated yet. Proper nouns and
    // short labels legitimately match, so this only prints as a reminder.
    if (reference.get(key) === value && typeof value === "string" && value.length > 12 && !SAME_ON_PURPOSE.has(`${lang}: ${key}`)) untranslated.push(`${lang}: ${key}`);
  }
}

if (errors.length) {
  console.error(`check-i18n: ${errors.length} problem(s)\n` + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log(`check-i18n: ok — ${reference.size} keys × ${LANGS.length} languages`);
if (untranslated.length) console.log(`check-i18n: ${untranslated.length} key(s) still read as English:\n` + untranslated.map((u) => `  · ${u}`).join("\n"));
