// The sharing image (Open Graph) of a piece: its museum label on a field of its main material,
// 1200 × 630, drawn as SVG and rendered to PNG. No photo is fetched: the build never depends on
// someone else's server, and no photo is republished under the site's name. (The label's shadow
// is stacked from three flat shapes: a blurred one costs six times the rest of the picture.)
//
// The fonts (woff2) are unpacked once into node_modules/.cache, since the renderer reads TTF.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import wawoff2 from "wawoff2";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const cache = path.join(root, "node_modules/.cache/og-fonts");
// Fraunces on the site is a variable font, which the renderer cannot set to a weight (it draws
// the heaviest master): the label's title uses the static 400 cuts of the same family instead.
const SITE_FONTS = path.join(root, "public/fonts");
const STATIC_FRAUNCES = path.join(root, "node_modules/@fontsource/fraunces/files");
const FONTS = [
  [STATIC_FRAUNCES, "fraunces-latin-400-normal"],
  [STATIC_FRAUNCES, "fraunces-latin-400-italic"],
  [STATIC_FRAUNCES, "fraunces-latin-ext-400-normal"],
  [STATIC_FRAUNCES, "fraunces-latin-ext-400-italic"],
  [SITE_FONTS, "inter-normal-latin"],
  [SITE_FONTS, "inter-normal-latin-ext"],
  [SITE_FONTS, "plex-mono-400-latin"],
  [SITE_FONTS, "plex-mono-400-latin-ext"],
];

let fontFiles;
async function fonts() {
  if (fontFiles) return fontFiles;
  mkdirSync(cache, { recursive: true });
  fontFiles = [];
  for (const [dir, name] of FONTS) {
    const ttf = path.join(cache, `${name}.ttf`);
    if (!existsSync(ttf)) writeFileSync(ttf, await wawoff2.decompress(readFileSync(path.join(dir, `${name}.woff2`))));
    fontFiles.push(ttf);
  }
  return fontFiles;
}

// The material fields of src/components/MaterialField.css, as two-stop gradients.
const MATERIAL = {
  wood: ["#5a3a22", "#2a1a0f"],
  metal: ["#7b8085", "#2a2d30"],
  leather: ["#5b3321", "#34190f"],
  fabric: ["#4a4a3e", "#2c2c24"],
  glass: ["#27413f", "#152322"],
  plastic: ["#b0402c", "#6e2317"],
  cane: ["#a9864f", "#6f5530"],
  marble: ["#d9d4cb", "#a9a39a"],
  paper: ["#2a2721", "#1a1814"],
};

const esc = (text) => String(text ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Rough widths are enough to break a title in two and to shorten a long line: an average glyph
// of Fraunces is about 0.5 em wide, of Inter 0.52, of the mono exactly 0.6.
function lines(text, size, maxWidth, maxLines, ratio = 0.5) {
  const perLine = Math.floor(maxWidth / (size * ratio));
  const out = [];
  let line = "";
  for (const word of String(text).split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (next.length <= perLine || !line) line = next;
    else {
      out.push(line);
      line = word;
    }
  }
  if (line) out.push(line);
  if (out.length > maxLines) {
    out.length = maxLines;
    out[maxLines - 1] = `${out[maxLines - 1].slice(0, perLine - 1).trimEnd()}…`;
  }
  return out.map((l) => (l.length > perLine ? `${l.slice(0, perLine - 1).trimEnd()}…` : l));
}

// { country, name, by, rows: [[label, value]], material }
export function labelSvg({ country, name, by, rows = [], material }) {
  const [from, to] = MATERIAL[material] ?? MATERIAL.paper;
  const x = 150;
  const width = 900;
  const pad = 56;
  const inner = width - pad * 2;
  const title = lines(name, 66, inner, 2, 0.46);
  const byLine = lines(by, 32, inner, 1, 0.46)[0];
  let y = pad + 22;
  const parts = [];
  parts.push(`<text x="${width - pad}" y="${y}" text-anchor="end" font-family="IBM Plex Mono" font-size="22" letter-spacing="1.8" fill="#5d574c">${esc(String(country ?? "").toUpperCase())}</text>`);
  y += 78;
  for (const line of title) {
    parts.push(`<text x="${pad}" y="${y}" font-family="Fraunces" font-size="66" fill="#1b1916">${esc(line)}</text>`);
    y += 72;
  }
  y -= 26;
  parts.push(`<text x="${pad}" y="${y}" font-family="Fraunces" font-style="italic" font-size="32" fill="#5d574c">${esc(byLine)}</text>`);
  y += 36;
  parts.push(`<rect x="${pad}" y="${y}" width="${inner}" height="2" fill="#cfc6b4"/>`);
  y += 46;
  for (const [label, value] of rows.filter((row) => row[1])) {
    parts.push(`<text x="${pad}" y="${y}" font-family="IBM Plex Mono" font-size="19" letter-spacing="1.5" fill="#5d574c">${esc(String(label).toUpperCase())}</text>`);
    parts.push(`<text x="${pad + 250}" y="${y}" font-family="Inter" font-size="26" fill="#1b1916">${esc(lines(value, 26, inner - 250, 1, 0.52)[0])}</text>`);
    y += 40;
  }
  const height = y + pad - 24;
  const top = Math.round((630 - 64 - height) / 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="field" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#field)"/>
  <rect width="1200" height="630" fill="#0f0e0c" opacity="0.35"/>
  <g transform="translate(${x} ${top}) rotate(-1.2 ${width / 2} ${height / 2})">
    <rect x="-10" y="14" width="${width + 20}" height="${height + 22}" rx="14" fill="#000" opacity="0.10"/>
    <rect x="-4" y="12" width="${width + 8}" height="${height + 10}" rx="8" fill="#000" opacity="0.14"/>
    <rect x="2" y="8" width="${width - 4}" height="${height}" rx="4" fill="#000" opacity="0.20"/>
    <rect width="${width}" height="${height}" rx="3" fill="#efe8da"/>
    ${parts.join("\n    ")}
  </g>
  <text x="60" y="590" font-family="Fraunces" font-size="30" fill="#f2ecdf">Design Archive</text>
</svg>`;
}

// The tints of the story covers (src/styles/tokens.css, --tone-*): background and ink.
const TONES = {
  cream: ["#efe8da", "#17160f"],
  teal: ["#6f9c95", "#0e0e0e"],
  pink: ["#e2a3b4", "#2a1118"],
  gold: ["#c9a44d", "#17160f"],
  ink: ["#24211d", "#f2ecdf"],
  cloud: ["#e9e6e0", "#2b2921"],
  orange: ["#d9793f", "#1a0f08"],
  brown: ["#6b4a2e", "#f4efe6"],
};

// The sharing image of a story with a typographic cover: its figure on its tint on the left, the
// kicker and the title on the right. { mark, tone, kicker, title }
export function storySvg({ mark, tone, kicker, title }) {
  const [bg, ink] = TONES[tone] ?? TONES.ink;
  const size = Math.min(260, Math.floor(500 / (Math.max(String(mark).length, 1) * 0.56)));
  const titleLines = lines(title, 50, 480, 4, 0.47);
  const titleTop = 315 - (titleLines.length * 58) / 2 + 30;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0f0e0c"/>
  <rect width="600" height="630" fill="${bg}"/>
  <text x="300" y="${315 + size * 0.34}" text-anchor="middle" font-family="Fraunces" font-size="${size}" letter-spacing="${-size * 0.03}" fill="${ink}">${esc(mark)}</text>
  <text x="660" y="${titleTop - 72}" font-family="IBM Plex Mono" font-size="20" letter-spacing="1.6" fill="#c9a44d">${esc(String(kicker).toUpperCase())}</text>
  ${titleLines.map((line, i) => `<text x="660" y="${titleTop + i * 58}" font-family="Fraunces" font-size="50" fill="#f2ecdf">${esc(line)}</text>`).join("\n  ")}
  <text x="660" y="590" font-family="Fraunces" font-size="30" fill="#f2ecdf">Design Archive</text>
</svg>`;
}

// Rendered pictures are kept in node_modules/.cache by the hash of their SVG: a build only draws
// the labels that changed.
const pngCache = path.join(root, "node_modules/.cache/og-png");

export async function renderPng(svg) {
  const cached = path.join(pngCache, `${createHash("sha1").update(svg).digest("hex")}.png`);
  if (existsSync(cached)) return readFileSync(cached);
  const resvg = new Resvg(svg, { font: { fontFiles: await fonts(), loadSystemFonts: false, defaultFontFamily: "Inter" } });
  const png = resvg.render().asPng();
  mkdirSync(pngCache, { recursive: true });
  writeFileSync(cached, png);
  return png;
}
