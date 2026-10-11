// Which archive photos actually fail for a visitor of the site?
//
//   npm run check:photos                         (the dev server must be running)
//   node scripts/check-photos-live.mjs --base http://localhost:5173 --json
//
// check-images.mjs asks each server from a script; this one loads every photo inside a real
// browser, from a page of the site, exactly as a card does: the card thumbnail first, then the
// full file (SmartImage's fallback). Hosts that refuse images embedded on other sites (hotlink
// protection) show up here and nowhere else. Nothing is saved: the images are only displayed.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { launchBrowser } from "./lib/browser.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const load = (rel) => import(pathToFileURL(path.join(root, rel)).href);
const { OBJECT_PHOTOS, photoUrl, photoPage } = await load("src/data/objectPhotos.js");
const { cardImage } = await load("src/lib/imageUrls.js");

const args = process.argv.slice(2);
const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://localhost:5173";
// --no-referrer: load the images without saying which site shows them (to test that policy).
const noReferrer = args.includes("--no-referrer");
// --retry photo-report.json: only the photos that failed last time. --concurrency N (default 12).
const retryFile = args.includes("--retry") ? args[args.indexOf("--retry") + 1] : null;
const retryIds = retryFile ? new Set(JSON.parse(readFileSync(path.resolve(retryFile), "utf8")).failed.map((r) => r.id)) : null;
const concurrency = args.includes("--concurrency") ? Number(args[args.indexOf("--concurrency") + 1]) : 12;
const entries = Object.entries(OBJECT_PHOTOS).filter(([id]) => !retryIds || retryIds.has(id)).map(([id, entry]) => {
  const full = photoUrl(entry);
  return { id, card: cardImage(full), full, page: photoPage(entry) };
});

const browser = await launchBrowser();
const page = await browser.newPage();
await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });

// In the page: try the card image, then the full image, like SmartImage; 20 s per attempt.
const results = await page.evaluate(
  async ({ list, noReferrer, concurrency }) => {
    const tryLoad = (src) =>
      new Promise((resolve) => {
        const img = new Image();
        if (noReferrer) img.referrerPolicy = "no-referrer";
        const timer = setTimeout(() => resolve("timeout"), 20000);
        img.onload = () => {
          clearTimeout(timer);
          resolve(img.naturalWidth > 0 ? "ok" : "empty");
        };
        img.onerror = () => {
          clearTimeout(timer);
          resolve("error");
        };
        img.src = src;
      });
    const out = [];
    let next = 0;
    async function worker() {
      while (next < list.length) {
        const item = list[next++];
        const card = await tryLoad(item.card);
        const full = card === "ok" || item.card === item.full ? card : await tryLoad(item.full);
        out.push({ ...item, card, fullResult: full, ok: card === "ok" || full === "ok" });
      }
    }
    await Promise.all(Array.from({ length: concurrency }, worker));
    return out;
  },
  { list: entries, noReferrer, concurrency }
);

await browser.close();

const failed = results.filter((r) => !r.ok).sort((a, b) => a.id.localeCompare(b.id));
const cardOnlyFailed = results.filter((r) => r.ok && r.card !== "ok");
const host = (url) => new URL(url).hostname;
const byHost = failed.reduce((acc, r) => ({ ...acc, [host(r.full)]: (acc[host(r.full)] ?? 0) + 1 }), {});

console.log(
  `check-photos${noReferrer ? " (no referrer)" : ""}: ${results.length} photos · ${results.length - failed.length} load on the site · ${failed.length} fail (placeholder shown) · ${cardOnlyFailed.length} load only after the thumbnail fails`
);
if (failed.length) {
  console.log("\nFailing hosts:");
  for (const [h, n] of Object.entries(byHost).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${h}`);
  console.log("\nFailing photos:");
  for (const r of failed) console.log(`  ${r.id.padEnd(40)} ${r.fullResult.padEnd(8)} ${r.full}`);
}
if (args.includes("--json")) {
  const file = path.join(root, noReferrer ? "photo-report-noref.json" : retryIds ? "photo-report-retry.json" : "photo-report.json");
  writeFileSync(file, JSON.stringify({ checkedAt: new Date().toISOString(), total: results.length, failed, cardOnlyFailed }, null, 2));
  console.log(`\nwritten ${path.relative(root, file)}`);
}
process.exit(failed.length ? 1 : 0);
