// Merging what a browser holds with what an account holds: nothing is lost.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fromLegacy, mergeCollection } from "../src/lib/collection.js";
import { mergeLibrary } from "../src/lib/moodboardLibrary.js";
import { mergeBoards } from "../src/lib/moodboards.js";
import { boardContent, boardPayload, boardSize } from "../src/lib/moodboard.js";
import { validateGuide, publicFacts } from "../scripts/import-guide.mjs";

test("collection: union by piece, the latest edit wins (state included)", () => {
  const local = [{ id: "a", status: "own", notes: "local", addedAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-20T00:00:00Z" }];
  const remote = [
    { id: "a", status: "want", maxPrice: 200, notes: "remote", addedAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-10T00:00:00Z" },
    { id: "b", status: "seen", place: "Porta Portese", seenOn: "2026-09-05", addedAt: "2026-09-05T00:00:00Z", updatedAt: "2026-09-05T00:00:00Z" },
  ];
  const merged = mergeCollection(local, remote);
  assert.deepEqual(merged.map((item) => item.id), ["b", "a"]); // newest first
  assert.equal(merged.find((item) => item.id === "a").status, "own");
  assert.equal(merged.find((item) => item.id === "a").notes, "local");
  assert.equal(merged.find((item) => item.id === "b").place, "Porta Portese");
});

test("collection: the old saved and looking-for lists become one, nothing lost", () => {
  const wishlist = [{ id: "b", maxPrice: 300, notes: "black leather", addedAt: "2026-09-02T00:00:00Z", updatedAt: "2026-09-03T00:00:00Z" }];
  const items = fromLegacy(["a", "b", "c"], wishlist, Date.parse("2026-09-30T00:00:00Z"));
  assert.deepEqual(items.map((item) => [item.id, item.status]), [["b", "want"], ["a", "saved"], ["c", "saved"]]);
  // A piece in both lists keeps its budget and notes.
  assert.equal(items[0].maxPrice, 300);
  assert.equal(items[0].notes, "black leather");
  // The hearts keep their order (newest first).
  assert.ok(items[1].addedAt > items[2].addedAt);
  assert.deepEqual(fromLegacy(undefined, undefined), []);
  assert.deepEqual(fromLegacy(["a", 7, null], "broken").map((item) => item.id), ["a"]);
});

test("library: union by id", () => {
  const merged = mergeLibrary({ materials: [{ id: "m1" }], colors: [] }, { materials: [{ id: "m1" }, { id: "m2" }], colors: [{ id: "c1" }] });
  assert.equal(merged.materials.length, 2);
  assert.equal(merged.colors.length, 1);
});

const board = (id, over = {}) => ({
  id,
  title: "",
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
  shareSlug: null,
  version: 3,
  background: "paper",
  elements: [],
  ...over,
});

test("moodboards: union, newest edit wins, a blank local board is not added", () => {
  const local = { activeId: "l1", boards: [board("l1"), board("s1", { elements: [{ id: "e", type: "text" }], updatedAt: "2026-09-20T00:00:00Z" })] };
  const remote = { activeId: null, boards: [board("s1", { title: "old" }), board("r1", { title: "remote", createdAt: "2026-09-02T00:00:00Z" })] };
  const merged = mergeBoards(local, remote);
  assert.deepEqual(merged.boards.map((b) => b.id).sort(), ["r1", "s1"]);
  assert.equal(merged.boards.find((b) => b.id === "s1").updatedAt, "2026-09-20T00:00:00Z");
});

test("verified facts: every datum needs a source and a date; the public part holds no prices or measurements", () => {
  const ids = new Set(["egg-chair"]);
  const today = "2026-09-29";
  const sale = (amount, soldOn) => ({ source: "Auction lot", sourceUrl: "https://example.com/lot", checkedAt: "2026-09-25", amount, currency: "USD", soldOn });
  const fx = { rate: 1.14, currency: "USD", date: "2026-09-25", source: "ECB", sourceUrl: "https://example.com/ecb" };
  const good = {
    "egg-chair": {
      authenticity: [{ text: { en: "A label" }, confidence: "high", source: "Maker", sourceUrl: "https://example.com", checkedAt: "2026-09-25" }],
      prices: [{ kind: "vintage", min: 5000, max: 9000, currency: "EUR", confidence: "medium", fx, sources: [sale(6000, "2025-01-10"), sale(9500, "2024-05-02")] }],
      dimensions: { width: 86, depth: 79, height: 107, unit: "cm", confidence: "high", source: "Maker", sourceUrl: "https://example.com", checkedAt: "2026-09-25" },
    },
  };
  assert.deepEqual(validateGuide(good, ids, today), []);

  // Each rule of `npm run check:data`, broken on purpose.
  const broken = (mutate) => {
    const copy = structuredClone(good);
    mutate(copy["egg-chair"]);
    return validateGuide(copy, ids, today);
  };
  const fails = (mutate, pattern) => assert.ok(broken(mutate).some((p) => pattern.test(p)), String(pattern));
  fails((e) => delete e.prices[0].sources, /no source/);
  fails((e) => (e.prices[0].sources[0].checkedAt = ""), /checkedAt/);
  fails((e) => (e.prices[0].min = 9500), /min is greater than max/);
  fails((e) => (e.dimensions.height = "107 cm"), /height: not a number/);
  fails((e) => (e.authenticity[0].text.en = "x".repeat(241)), /characters/);
  fails((e) => (e.authenticity[0].confidence = "low"), /confidence/);
  fails((e) => (e.prices[0].sources = [e.prices[0].sources[0]]), /at least two closed sales/);
  fails((e) => (e.prices[0].sources[1].soldOn = "2020-01-01"), /more than 5 years/);
  fails((e) => delete e.prices[0].fx, /fx/);
  assert.ok(validateGuide({ "no-such-piece": {} }, ids, today).some((p) => /not an archive piece/.test(p)));

  const pub = publicFacts(good)["egg-chair"];
  assert.equal(pub.authenticity.length, 1);
  assert.equal(JSON.stringify(pub).includes("5000"), false);
  assert.equal(JSON.stringify(pub).includes("6000"), false);
  assert.equal(JSON.stringify(pub).includes("107"), false);
});

test("moodboards: a board of the previous version opens as it was drawn", () => {
  const old = boardContent({ version: 3, background: "ink", elements: [{ id: "a", type: "photo", objectId: "egg-chair", x: 10, y: 20, width: 160 }, { id: "x", type: "unknown", x: 0, y: 0 }] });
  assert.equal(old.version, 4);
  assert.equal(old.format, "wide");
  assert.deepEqual(boardSize(old.format), { w: 1400, h: 860 });
  assert.equal(old.background, "ink");
  assert.equal(old.elements.length, 1);
  assert.deepEqual(old.cartouche, { project: "", author: "", number: "", hidden: false });
  assert.equal(old.roomWidth, null);
  const saved = boardPayload({ ...old, format: "a4", cartouche: { project: "Casa", author: "", number: "02", hidden: false }, roomWidth: 420 });
  const reopened = boardContent(saved);
  assert.equal(reopened.format, "a4");
  assert.equal(reopened.cartouche.project, "Casa");
  assert.equal(reopened.roomWidth, 420);
  assert.equal(boardContent({ format: "poster" }).format, "wide");
});