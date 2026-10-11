// GitHub Pages serves 404.html for any path it has no file for. Making that file a copy of the
// app means a link straight to /piece/eames-lounge-chair opens the piece instead of an error:
// the browser loads the app, and the router reads the address and shows the right page.
//
// Every real page now has its own file (scripts/prerender.mjs runs right after this), so the
// fallback only answers unknown addresses: it carries a noindex so a mistyped link is never
// indexed. It must run before the prerender, while index.html is still the bare shell.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
const index = path.join(dist, "index.html");
if (!existsSync(index)) {
  console.error("spa-fallback: dist/index.html not found — run vite build first");
  process.exit(1);
}
const shell = readFileSync(index, "utf8").replace("</head>", `  <meta name="robots" content="noindex" />\n  </head>`);
writeFileSync(path.join(dist, "404.html"), shell);
console.log("spa-fallback: dist/404.html written");
