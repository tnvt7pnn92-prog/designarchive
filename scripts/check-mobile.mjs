// Walks every page of the site at phone widths and reports what a phone would suffer:
//
//   · overflow  — the page scrolls sideways (document scrollWidth wider than the screen)
//   · overlap   — two pieces of text drawn on top of each other
//   · target    — something to tap that is smaller than 44 × 44 px (links inside running text
//                 are exempt, as in WCAG 2.5.8)
//
//   npm run check:mobile                         (the dev server must be running)
//   node scripts/check-mobile.mjs --base http://localhost:4173/design-archive --widths 360,390
//
// Exits with 1 when anything is found. Uses the Chrome or Edge already installed.
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { launchBrowser } from "./lib/browser.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const load = (rel) => import(pathToFileURL(path.join(root, rel)).href);

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const base = option("base", "http://localhost:5173").replace(/\/$/, "");
const widths = option("widths", "360,390").split(",").map(Number);
const only = option("only", null);

const { STORIES } = await load("src/data/stories.js");
const { BY_DESIGNER } = await load("src/data/indexes.js");
const today = new Date().toISOString().slice(0, 10);
const story = STORIES.filter((s) => s.date <= today).at(-1) ?? STORIES[0];
const designer = [...BY_DESIGNER.values()].sort((a, b) => b.objects.length - a.objects.length)[0];

const ROUTES = [
  "/",
  "/archive",
  "/archive?decade=1950&category=chairs",
  "/markets",
  "/markets/milan",
  "/markets/milan/fiera-di-sinigaglia",
  "/moodboard",
  "/stories",
  `/stories/${story.id}`,
  "/piece/barcelona-chair",
  "/piece/wiggle-chair",
  "/designers",
  `/designer/${designer.slug}`,
  "/credits",
  "/collection",
  "/account",
  "/privacy",
  "/registrati",
  "/accedi",
  "/this-page-does-not-exist",
].filter((route) => !only || route.includes(only));

// Runs in the page: everything that is wrong on the current screen.
function inspect() {
  const problems = [];
  const visible = (el) => {
    // Hidden by an ancestor too (opacity 0, visibility hidden, display none, content-visibility).
    if (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
    const style = getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none" || Number(style.opacity) === 0) return false;
    if (el.closest("[hidden], [aria-hidden='true'], .visually-hidden, .sr-only")) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const describe = (el) => {
    const text = (el.getAttribute("aria-label") || el.textContent || el.getAttribute("placeholder") || "").trim().replace(/\s+/g, " ");
    const own = typeof el.className === "string" && el.className.trim() ? el.className.trim().split(/\s+/)[0] : "";
    const holder = own ? null : el.parentElement?.closest("[class]");
    const cls = own ? `.${own}` : holder ? ` (in .${String(holder.className).trim().split(/\s+/)[0]})` : "";
    return `${el.tagName.toLowerCase()}${cls}${text ? ` "${text.slice(0, 40)}"` : ""}`;
  };
  const page = (r) => ({ top: r.top + scrollY, bottom: r.bottom + scrollY, left: r.left, right: r.right });

  // 1. Sideways scrolling of the whole page.
  const docWidth = document.documentElement.scrollWidth;
  if (docWidth > innerWidth) {
    const culprits = [...document.body.querySelectorAll("*")]
      .filter((el) => visible(el) && el.getBoundingClientRect().right > innerWidth + 1)
      .filter((el) => !el.parentElement || el.parentElement.getBoundingClientRect().right <= innerWidth + 1)
      .slice(0, 5)
      .map(describe);
    problems.push({ kind: "overflow", detail: `page is ${docWidth}px wide on a ${innerWidth}px screen`, where: culprits.join(" | ") });
  }

  // 2. Text on top of text: elements that hold text themselves, compared pairwise.
  const texts = [...document.body.querySelectorAll("body *")].filter((el) => {
    if (!visible(el)) return false;
    if (el.closest(".site-menu__panel:not(.is-open), .toaster")) return false;
    // The archive's Filters button floats over the results on purpose (fixed at the screen's foot).
    if (el.closest(".archive-filter-toggle")) return false;
    return [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
  });
  // What of an element can be seen: its box cut down by every ancestor that clips its overflow
  // (a scrolling list shows only part of its items).
  const clipBox = (el) => {
    let box = { left: -Infinity, top: -Infinity, right: Infinity, bottom: Infinity };
    for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.overflowX === "visible" && style.overflowY === "visible") continue;
      const r = node.getBoundingClientRect();
      box = { left: Math.max(box.left, r.left), top: Math.max(box.top, r.top), right: Math.min(box.right, r.right), bottom: Math.min(box.bottom, r.bottom) };
    }
    return box;
  };
  const boxes = texts.map((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const clip = clipBox(el);
    const rects = [...range.getClientRects()]
      .map((r) => ({ left: Math.max(r.left, clip.left), top: Math.max(r.top, clip.top), right: Math.min(r.right, clip.right), bottom: Math.min(r.bottom, clip.bottom), height: r.height }))
      .filter((r) => r.right - r.left > 2 && r.bottom - r.top > 2);
    return { el, rects };
  });
  const seen = new Set();
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i];
      const b = boxes[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const hit = a.rects.some((ra) =>
        b.rects.some((rb) => {
          const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
          const h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
          return w > 4 && h > Math.min(ra.height, rb.height) * 0.4;
        })
      );
      if (!hit) continue;
      const key = `${describe(a.el)} × ${describe(b.el)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      problems.push({ kind: "overlap", detail: key, where: `y=${Math.round(page(a.el.getBoundingClientRect()).top)}` });
    }
  }

  // 3. Tap targets under 44 × 44 px (inline links inside running text are exempt).
  const MIN = 44;
  const interactive = [...document.querySelectorAll("a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab]")].filter(visible);
  const inRunningText = (el) => {
    if (el.tagName !== "A" || getComputedStyle(el).display !== "inline") return false;
    const block = el.parentElement?.closest("p, li, dd, figcaption, td, blockquote, small, span");
    if (!block) return false;
    const own = [...block.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join("");
    return own.length > 0;
  };
  // WCAG 2.5.8's "equivalent" exception: a small link is fine when another link to the same place
  // on the page is big enough (a card's name next to its photo).
  const bigHrefs = new Set(
    interactive
      .filter((el) => el.tagName === "A" && el.getBoundingClientRect().width >= MIN && el.getBoundingClientRect().height >= MIN)
      .map((el) => el.getAttribute("href"))
  );
  for (const el of interactive) {
    if (el.closest(".site-menu__panel:not(.is-open)")) continue;
    if (el.matches(".skip-link")) continue; // off screen until a keyboard focuses it
    if (inRunningText(el)) continue;
    if (el.tagName === "A" && bigHrefs.has(el.getAttribute("href"))) continue;
    // A control inside a bigger tappable label counts as the label; a link stretched over its
    // card (an absolutely positioned ::after) counts as the card.
    const after = getComputedStyle(el, "::after");
    const stretched = el.tagName === "A" && after.content !== "none" && after.position === "absolute" && after.width !== "auto";
    const target = el.closest("label") ?? (stretched ? (el.closest("article, li, [class*='card']") ?? el) : el);
    const r = target.getBoundingClientRect();
    if (r.width >= MIN && r.height >= MIN) continue;
    // Checkbox and radio inputs whose label is the target were handled above; skip the rest of
    // the hidden-by-design inputs (e.g. file inputs styled through their label).
    if (el.tagName === "INPUT" && ["file", "checkbox", "radio"].includes(el.type) && !visible(target)) continue;
    problems.push({ kind: "target", detail: `${describe(el)} is ${Math.round(r.width)}×${Math.round(r.height)}`, where: `y=${Math.round(page(r).top)}` });
  }

  return problems;
}

const browser = await launchBrowser();
const report = [];
for (const width of widths) {
  const context = await browser.newContext({ viewport: { width, height: 780 }, isMobile: true, hasTouch: true, locale: "it-IT" });
  await context.addInitScript(() => localStorage.setItem("design-archive:lang", "it"));
  const page = await context.newPage();
  for (const route of ROUTES) {
    try {
      await page.goto(base + route, { waitUntil: "networkidle", timeout: 45_000 });
    } catch {
      await page.goto(base + route, { waitUntil: "load", timeout: 45_000 });
    }
    await page.waitForTimeout(400);
    const problems = await page.evaluate(inspect);
    report.push({ width, route, problems });
    const counts = problems.reduce((acc, p) => ({ ...acc, [p.kind]: (acc[p.kind] ?? 0) + 1 }), {});
    const summary = Object.entries(counts).map(([k, n]) => `${k} ${n}`).join(", ") || "ok";
    console.log(`${String(width).padStart(4)}px  ${route.padEnd(40)} ${summary}`);
  }
  await context.close();
}
await browser.close();

const all = report.flatMap((r) => r.problems.map((p) => ({ ...p, width: r.width, route: r.route })));
if (all.length) {
  console.log("\nDetails:");
  for (const p of all) console.log(`  [${p.kind}] ${p.width}px ${p.route} — ${p.detail}${p.where ? ` (${p.where})` : ""}`);
  console.log(`\n${all.length} problem(s).`);
  process.exit(1);
}
console.log("\nNo problems found.");
