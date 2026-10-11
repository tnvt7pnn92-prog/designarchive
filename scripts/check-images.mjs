// Checks every archive photo URL and reports the ones that no longer answer.
//
//   npm run check:images            full report in the terminal
//   npm run check:images -- --json  also writes image-report.json in the project root
//
// It only asks each server whether the file is there; nothing is downloaded or re-hosted.
// Requests go one host at a time with a pause in between (Wikimedia answers 429 to anything
// faster), several hosts in parallel. Hosts that refuse scripts but serve browsers — some shops
// answer 403 to anything that is not a browser — are listed separately: they work on the site
// today but are the first to break.
import { writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const load = (rel) => import(pathToFileURL(path.join(root, rel)).href);
const { OBJECT_PHOTOS, photoUrl, photoPage } = await load("src/data/objectPhotos.js");

const UA = "Mozilla/5.0 (compatible; DesignArchive-check-images/1.0; link checker, low rate)";
const HOSTS_IN_PARALLEL = 6;
const PAUSE_MS = { "upload.wikimedia.org": 400 };
const DEFAULT_PAUSE_MS = 150;
const TIMEOUT = 20_000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function probe(id, entry, attempt = 1) {
  const url = photoUrl(entry);
  const host = new URL(url).hostname;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    // A ranged GET rather than HEAD: several CDNs answer HEAD with 403/405 even for live files.
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "image/avif,image/webp,image/*,*/*;q=0.8", Referer: photoPage(entry) ?? "", Range: "bytes=0-1023" },
      signal: controller.signal,
      redirect: "follow",
    });
    res.body?.cancel().catch(() => {});
    if (res.status === 429 && attempt < 4) {
      clearTimeout(timer);
      const wait = Number(res.headers.get("retry-after")) * 1000 || attempt * 3000;
      await sleep(wait);
      return probe(id, entry, attempt + 1);
    }
    const type = res.headers.get("content-type") ?? "";
    const ok = (res.status === 200 || res.status === 206) && type.startsWith("image/");
    return { id, url, host, status: res.status, ok };
  } catch (error) {
    return { id, url, host, status: error.name === "AbortError" ? "timeout" : "network", ok: false };
  } finally {
    clearTimeout(timer);
  }
}

const byHost = new Map();
for (const [id, entry] of Object.entries(OBJECT_PHOTOS)) {
  const host = new URL(photoUrl(entry)).hostname;
  if (!byHost.has(host)) byHost.set(host, []);
  byHost.get(host).push([id, entry]);
}

const results = [];
const queue = [...byHost.entries()].sort((a, b) => b[1].length - a[1].length);
async function worker() {
  while (queue.length) {
    const [host, list] = queue.shift();
    for (const [id, entry] of list) {
      results.push(await probe(id, entry));
      if (results.length % 100 === 0) console.log(`  ${results.length}/${Object.keys(OBJECT_PHOTOS).length}`);
      await sleep(PAUSE_MS[host] ?? DEFAULT_PAUSE_MS);
    }
  }
}
await Promise.all(Array.from({ length: HOSTS_IN_PARALLEL }, worker));

const failed = results.filter((r) => !r.ok);
const refused = failed.filter((r) => r.status === 401 || r.status === 403);
const throttled = failed.filter((r) => r.status === 429);
const dead = failed.filter((r) => !refused.includes(r) && !throttled.includes(r));

const countByHost = (list) =>
  Object.entries(list.reduce((acc, r) => ({ ...acc, [r.host]: (acc[r.host] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]);

console.log(
  `\ncheck-images: ${results.length} photos · ${results.length - failed.length} ok · ${refused.length} refused to scripts · ${throttled.length} rate-limited · ${dead.length} dead or unreachable`
);
if (dead.length) {
  console.log("\nDead or unreachable (these show the placeholder on the site):");
  for (const r of dead.sort((a, b) => a.host.localeCompare(b.host))) console.log(`  ${String(r.status).padEnd(8)} ${r.id}  ${r.url}`);
}
if (refused.length) {
  console.log("\nRefused to scripts, by host (they load in a browser today, but are the most fragile):");
  for (const [host, n] of countByHost(refused)) console.log(`  ${String(n).padStart(4)}  ${host}`);
}
if (throttled.length) console.log(`\n${throttled.length} still rate-limited after retries: run the check again later.`);

if (process.argv.includes("--json")) {
  const file = path.join(root, "image-report.json");
  writeFileSync(file, JSON.stringify({ checkedAt: new Date().toISOString(), total: results.length, dead, refused, throttled }, null, 2));
  console.log(`\nwritten ${path.relative(root, file)}`);
}

// Informational: a dead photo degrades to the placeholder, it does not break the build.
process.exit(0);
