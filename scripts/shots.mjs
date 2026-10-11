// Full-page screenshots of some pages at some widths, for before/after comparisons.
//
//   node scripts/shots.mjs --out <folder> [--widths 1440,390] [--top 1600] [--base http://localhost:5173] [paths...]
//
// Uses the Chrome (or Edge) already installed on this computer: no browser download. Prints the
// height of every page (document.body.scrollHeight) as JSON.
import { mkdirSync } from "node:fs";
import path from "node:path";
import { launchBrowser } from "./lib/browser.mjs";

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const [value] = args.splice(i, 2).slice(1);
  return value;
};
const out = path.resolve(option("out", "shots"));
const widths = option("widths", "1440,390").split(",").map(Number);
const base = option("base", "http://localhost:5173");
// --top 1600 keeps only the first 1600 px of each page (a long page stays readable).
const top = Number(option("top", 0));
const paths = args.length ? args : ["/", "/archive"];
mkdirSync(out, { recursive: true });

const browser = await launchBrowser();
const heights = {};
for (const width of widths) {
  const mobile = width < 800;
  const context = await browser.newContext({ viewport: { width, height: mobile ? 844 : 900 }, isMobile: mobile, hasTouch: mobile, locale: "it-IT" });
  await context.addInitScript(() => localStorage.setItem("design-archive:lang", "it"));
  const page = await context.newPage();
  for (const p of paths) {
    await page.goto(base + p, { waitUntil: "networkidle" });
    // Walk down the page so lazy images and entrance animations run, then back to the top.
    const total = await page.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < total; y += 600) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await page.waitForTimeout(80);
    }
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(700);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
    heights[`${p} @${width}`] = await page.evaluate(() => document.body.scrollHeight);
    const name = (p === "/" ? "home" : p.replace(/^\//, "").replace(/[/?=&]/g, "_")) + `-${width}.png`;
    const clip = top ? { x: 0, y: 0, width, height: Math.min(top, heights[`${p} @${width}`]) } : undefined;
    await page.screenshot({ path: path.join(out, name), fullPage: true, clip });
  }
  await context.close();
}
await browser.close();
console.log(JSON.stringify(heights, null, 1));
