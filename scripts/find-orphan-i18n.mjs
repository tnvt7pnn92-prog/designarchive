// Lists dictionary keys that no source file seems to use, so they can be removed with
// `node scripts/scaffold-i18n.mjs --remove …`. A key counts as used when its full name appears
// in the code, or when the code builds keys from its group with a template (`categories.${id}`
// keeps every key under "categories."). It reports; it never edits.
//
//   node scripts/find-orphan-i18n.mjs
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const en = (await import(pathToFileURL(path.join(root, "src/i18n/dictionaries/en.js")).href)).default;

function flatten(value, prefix = "", out = []) {
  for (const [key, child] of Object.entries(value)) {
    const dotted = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object") flatten(child, dotted, out);
    else out.push(dotted);
  }
  return out;
}

function files(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      if (!["node_modules", "dist", "dictionaries"].includes(name)) files(full, out);
    } else if (/\.(jsx?|mjs|ts)$/.test(name)) out.push(full);
  }
  return out;
}

const source = [...files(path.join(root, "src")), ...files(path.join(root, "scripts")), ...files(path.join(root, "supabase/functions"))]
  .map((file) => readFileSync(file, "utf8"))
  .join("\n");

// Groups the code reaches through a template or a computed key: "categories.${", `en.privacy[`, …
const dynamic = new Set();
for (const match of source.matchAll(/["'`]([a-zA-Z0-9_.]+)\.\$\{/g)) dynamic.add(match[1]);
for (const match of source.matchAll(/\ben\.([a-zA-Z0-9_.]+)\[/g)) dynamic.add(match[1]);

const orphans = flatten(en).filter((key) => {
  if (source.includes(`"${key}"`) || source.includes(`'${key}'`) || source.includes(`\`${key}\``)) return false;
  if (source.includes(`en.${key}`)) return false;
  const parts = key.split(".");
  for (let i = parts.length - 1; i > 0; i--) if (dynamic.has(parts.slice(0, i).join("."))) return false;
  return true;
});

console.log(orphans.length ? `find-orphan-i18n: ${orphans.length} key(s) no code seems to use\n${orphans.map((key) => `  · ${key}`).join("\n")}` : "find-orphan-i18n: every key is used");
