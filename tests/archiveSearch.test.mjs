// node --test tests/   — the archive's search box, on the real catalogue.
import { test } from "node:test";
import assert from "node:assert/strict";
import { OBJECTS } from "../src/data/objects.js";
import { fold, makeSearch } from "../src/lib/archiveSearch.js";
import en from "../src/i18n/dictionaries/en.js";
import it from "../src/i18n/dictionaries/it.js";

const labelsOf = (obj) => [en, it].flatMap((d) => [d.categories[obj.category], ...obj.styles.map((s) => d.styles[s])]).filter(Boolean);
const find = (query) => OBJECTS.filter(makeSearch(query, OBJECTS, { lang: "it", labelsOf })).map((o) => o.id);
const sofas = OBJECTS.filter((o) => o.category === "sofas").map((o) => o.id);

test("fold drops case, accents and punctuation", () => {
  assert.equal(fold("Poäng — Chair (1976)"), "poang chair 1976");
  assert.equal(fold("  "), "");
});

test("an empty search lets everything through", () => {
  assert.equal(find("").length, OBJECTS.length);
  assert.equal(find("  ,. ").length, OBJECTS.length);
});

test("singular, plural and the category name all find the sofas", () => {
  for (const query of ["sofa", "sofas", "Sofas", "divano", "divani"]) {
    const found = find(query);
    for (const id of sofas) assert.ok(found.includes(id), `"${query}" misses ${id}`);
  }
});

test("half words and other plurals", () => {
  assert.ok(find("barcel").includes("barcelona-chair"));
  assert.ok(find("chairs").includes("egg-chair"));
  assert.ok(find("lamps").includes("arco-lamp"));
  assert.ok(find("lampada").includes("arco-lamp"));
  assert.ok(find("sedia").includes("egg-chair"));
});

test("every word must match, in any order", () => {
  assert.ok(find("lounge eames").includes("eames-lounge-chair"));
  assert.ok(find("jacobsen egg").includes("egg-chair"));
  assert.ok(!find("jacobsen egg").includes("eames-lounge-chair"));
});

test("one slip is forgiven only for words the archive does not know", () => {
  assert.ok(find("barcellona").includes("barcelona-chair"));
  assert.ok(find("jacobsn").includes("egg-chair"));
  // "table" is a real word here: no typo tolerance, so nothing that merely looks like it ("stable",
  // "cable"). Every hit says "table" somewhere, if only in its category ("Coffee-table books").
  const says = (obj) => fold(`${JSON.stringify(obj)} ${labelsOf(obj).join(" ")}`).includes("table");
  assert.ok(find("table").every((id) => says(OBJECTS.find((o) => o.id === id))));
});

test("nonsense finds nothing", () => {
  assert.deepEqual(find("zzzqxw"), []);
});
