// Adds a UI string to all five dictionaries in one go, so a new key is never half-added.
//
//   node scripts/scaffold-i18n.mjs stories.title "Stories"
//   node scripts/scaffold-i18n.mjs --file scripts/new-keys.json      (flat or nested { key: english })
//   node scripts/scaffold-i18n.mjs --remove home.oldKey other.group  (from all five, groups too)
//
// English gets the real text; the other four get "TODO <text>" so `npm run check` stays green and
// `check-i18n` lists what is still waiting to be translated.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LANGS = ["en", "it", "es", "fr", "zh"];
const INDENT = "  ";

const isTranslationSet = (value) =>
  value && typeof value === "object" && !Array.isArray(value) && LANGS.every((l) => typeof value[l] === "string");

function flatten(value, prefix = "", out = {}) {
  for (const [key, child] of Object.entries(value)) {
    const dotted = prefix ? `${prefix}.${key}` : key;
    // { en, it, es, fr, zh } is a translated string, not a group of keys.
    if (child && typeof child === "object" && !Array.isArray(child) && !isTranslationSet(child)) flatten(child, dotted, out);
    else out[dotted] = child;
  }
  return out;
}

// Maps every "a.b" group in a dictionary file to the lines that open and close it.
// Braces are counted on the line with its string literals blanked out, because values contain
// both placeholders like "{count}" and lines that close their group after a value:
//     photo: "Photo",  },
function blocks(lines) {
  const found = new Map();
  const stack = [];
  lines.forEach((line, i) => {
    const open = /^(\s*)([A-Za-z0-9_$]+):\s*\{\s*$/.exec(line);
    if (open) {
      stack.push({ path: [...(stack.at(-1)?.path ?? []), open[2]], indent: open[1].length, open: i });
      return;
    }
    const code = line.replace(/"(?:[^"\\]|\\.)*"/g, '""');
    const closed = (code.match(/\}/g) ?? []).length - (code.match(/\{/g) ?? []).length;
    for (let n = 0; n < closed && stack.length; n += 1) {
      const block = stack.pop();
      found.set(block.path.join("."), { ...block, close: i });
    }
  });
  return found;
}

function insertKey(file, dotted, value) {
  const text = readFileSync(file, "utf8");
  const lines = text.split("\n");
  const parts = dotted.split(".");
  const leaf = parts.pop();
  const found = blocks(lines);

  let parentPath = parts.join(".");
  let block = parts.length ? found.get(parentPath) : null;

  // Create any missing group, innermost last, at the end of the closest existing ancestor.
  if (parts.length && !block) {
    const existing = [];
    for (let i = parts.length - 1; i > 0; i--) {
      const candidate = parts.slice(0, i).join(".");
      if (found.get(candidate)) {
        existing.push(candidate);
        break;
      }
    }
    const anchor = existing[0] ? found.get(existing[0]) : null;
    const depth = anchor ? anchor.path.length : 0;
    const at = anchor ? anchor.close : lines.findIndex((l) => /^\};?\s*$/.test(l));
    const missing = parts.slice(depth);
    const pad = INDENT.repeat(depth + 1);
    const block1 = [];
    missing.forEach((name, i) => block1.push(`${pad}${INDENT.repeat(i)}${name}: {`));
    missing
      .slice()
      .reverse()
      .forEach((_, i) => block1.push(`${pad}${INDENT.repeat(missing.length - 1 - i)}},`));
    lines.splice(at, 0, ...block1);
    writeFileSync(file, lines.join("\n"));
    if (!blocks(readFileSync(file, "utf8").split("\n")).get(parentPath)) {
      throw new Error(`could not create the group "${parentPath}" in ${path.basename(file)}`);
    }
    return insertKey(file, dotted, value);
  }

  const indent = block ? INDENT.repeat(block.path.length + 1) : INDENT;
  const at = block ? block.close : lines.findIndex((l) => /^\};?\s*$/.test(l));
  const name = /^[A-Za-z_$][\w$]*$/.test(leaf) ? leaf : JSON.stringify(leaf);
  lines.splice(at, 0, `${indent}${name}: ${JSON.stringify(value)},`);
  writeFileSync(file, lines.join("\n"));
}

// Removes a key (a single-line value, or a whole group) from one dictionary file. Returns whether
// anything was removed. A group left empty goes too.
function removeKey(file, dotted) {
  const lines = readFileSync(file, "utf8").split("\n");
  const parts = dotted.split(".");
  const leaf = parts.pop();
  const found = blocks(lines);
  const own = found.get(dotted);
  let from;
  let to;
  if (own) {
    [from, to] = [own.open, own.close];
  } else {
    const parent = parts.length ? found.get(parts.join(".")) : { open: 0, close: lines.length - 1, path: [] };
    if (!parent) return false;
    const indent = INDENT.repeat(parent.path.length + 1);
    const key = new RegExp(`^${indent}(?:${leaf}|"${leaf}"):\\s*"`);
    const at = lines.findIndex((line, i) => i > parent.open && i < parent.close && key.test(line));
    if (at === -1) return false;
    [from, to] = [at, at];
  }
  lines.splice(from, to - from + 1);
  writeFileSync(file, lines.join("\n"));
  const parentPath = parts.join(".");
  const parent = parentPath && blocks(lines).get(parentPath);
  if (parent && parent.close === parent.open + 1) removeKey(file, parentPath);
  return true;
}

const args = process.argv.slice(2);
let entries = {};
if (args[0] === "--remove") {
  // node scripts/scaffold-i18n.mjs --remove home.oldTitle home.bannerTitle …
  const keys = args.slice(1);
  for (const lang of LANGS) {
    const file = path.join(root, `src/i18n/dictionaries/${lang}.js`);
    const removed = keys.filter((key) => removeKey(file, key)).length;
    console.log(`${lang}: -${removed}`);
  }
  process.exit(0);
}
if (args[0] === "--file") {
  entries = flatten(JSON.parse(readFileSync(path.resolve(root, args[1]), "utf8")));
} else if (args.length >= 2) {
  entries = { [args[0]]: args.slice(1).join(" ") };
} else {
  console.error('usage: node scripts/scaffold-i18n.mjs <a.b.key> "English text"   |   --file keys.json');
  process.exit(1);
}

for (const lang of LANGS) {
  const file = path.join(root, `src/i18n/dictionaries/${lang}.js`);
  const current = flatten((await import(pathToFileURL(file).href + `?t=${Date.now()}`)).default);
  let added = 0;
  for (const [key, value] of Object.entries(entries)) {
    if (current[key] !== undefined) continue;
    // A value can be the English text (the others get a TODO) or the full set of translations.
    const text = isTranslationSet(value) ? value[lang] : lang === "en" ? value : `TODO ${value}`;
    insertKey(file, key, text);
    added += 1;
  }
  console.log(`${lang}: +${added}`);
}
