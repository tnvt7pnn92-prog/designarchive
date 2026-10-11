// Are the buying guide's sources still there, and are its figures still fresh?
//
//   npm run guide:sources            every URL in data-private/buying-guide.json
//   npm run guide:sources -- --only barcelona-chair
//
// Reports sources that no longer answer (or answer with an error), and data checked more than
// 12 months ago. Polite: one request at a time, at least 2 seconds apart on the same server, a
// plain user agent, no retries. A server that refuses automated visits (401/403/429, or a bot
// check) is listed as "check by hand", not as dead: the page may well be fine in a browser.
// Exits with 1 when a source is dead or a datum is stale.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sourcesOf } from "../src/lib/guideData.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILE = path.join(root, "data-private/buying-guide.json");
const STALE_MONTHS = 12;
const HOST_GAP_MS = 2000;
const TIMEOUT_MS = 20000;

if (!existsSync(FILE)) {
  console.log("guide:sources: no data-private/buying-guide.json");
  process.exit(0);
}

const args = process.argv.slice(2);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;
const guide = JSON.parse(readFileSync(FILE, "utf8"));
const today = new Date();
const staleBefore = new Date(today.getFullYear(), today.getMonth() - STALE_MONTHS, today.getDate()).toISOString().slice(0, 10);

// Every (piece, datum, source) triple, and every URL once.
const uses = new Map(); // url → [{ piece, where, checkedAt }]
const stale = [];
for (const [piece, entry] of Object.entries(guide)) {
  if (only && piece !== only) continue;
  const data = [
    ...(entry.authenticity ?? []).map((item, i) => [`authenticity[${i}]`, item]),
    ...(entry.prices ?? []).map((item, i) => [`prices[${i}] ${item.kind}`, item]),
    ...(entry.dimensions ? [["dimensions", entry.dimensions]] : []),
  ];
  for (const [where, item] of data) {
    for (const s of sourcesOf(item)) {
      if (s.checkedAt && s.checkedAt < staleBefore) stale.push(`${piece} ${where}: checked ${s.checkedAt} (${s.source})`);
      if (!s.sourceUrl) continue;
      uses.set(s.sourceUrl, [...(uses.get(s.sourceUrl) ?? []), { piece, where }]);
    }
    if (item.fx?.sourceUrl) uses.set(item.fx.sourceUrl, [...(uses.get(item.fx.sourceUrl) ?? []), { piece, where: `${where} fx` }]);
  }
  if (entry.manufacturerUrl) uses.set(entry.manufacturerUrl, [...(uses.get(entry.manufacturerUrl) ?? []), { piece, where: "manufacturerUrl" }]);
}

const lastHit = new Map();
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function probe(url) {
  const host = new URL(url).host;
  const gap = HOST_GAP_MS - (Date.now() - (lastHit.get(host) ?? 0));
  if (gap > 0) await wait(gap);
  lastHit.set(host, Date.now());
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    // GET rather than HEAD: many shops and auction sites answer HEAD with an error.
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "DesignArchive-SourceCheck/1.0 (link check, one request per page)", Accept: "text/html,application/pdf,*/*" },
    });
    const body = response.ok ? (await response.text()).slice(0, 4000) : "";
    const botCheck = /just a moment|cf-chl|captcha|are you a robot/i.test(body);
    if ([401, 403, 429].includes(response.status) || botCheck) return { state: "manual", detail: botCheck ? "bot check" : `HTTP ${response.status}` };
    if (!response.ok) return { state: "dead", detail: `HTTP ${response.status}` };
    return { state: "ok", detail: `HTTP ${response.status}` };
  } catch (error) {
    return { state: "dead", detail: error.name === "AbortError" ? "timeout" : error.message };
  } finally {
    clearTimeout(timer);
  }
}

const results = { ok: [], manual: [], dead: [] };
for (const [url, where] of uses) {
  const result = await probe(url);
  results[result.state].push({ url, where, detail: result.detail });
  process.stdout.write(result.state === "ok" ? "." : result.state === "manual" ? "?" : "x");
}
process.stdout.write("\n");

const list = (items) => items.map((r) => `  - ${r.url} (${r.detail}) — ${r.where.map((w) => `${w.piece} ${w.where}`).join("; ")}`).join("\n");
console.log(`guide:sources: ${uses.size} URLs — ${results.ok.length} ok, ${results.manual.length} to check by hand, ${results.dead.length} dead`);
if (results.manual.length) console.log(`\nRefused automated visits (open them in a browser):\n${list(results.manual)}`);
if (results.dead.length) console.log(`\nDead:\n${list(results.dead)}`);
if (stale.length) console.log(`\nChecked more than ${STALE_MONTHS} months ago:\n  - ${stale.join("\n  - ")}`);
if (results.dead.length || stale.length) process.exit(1);
