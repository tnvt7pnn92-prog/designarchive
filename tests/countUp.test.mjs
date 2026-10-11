// node --test tests/   — which story figures count up, and how they are written while counting.
import { test } from "node:test";
import assert from "node:assert/strict";
import { countable, formatCount } from "../src/lib/countUp.js";

test("one number with words around it counts; two numbers or none do not", () => {
  assert.deepEqual(countable("145 cm"), { before: "", after: " cm", value: 145, start: 0, decimals: 0, separator: "." });
  assert.equal(countable("€21.9M").value, 21.9);
  assert.equal(countable("$3.50").decimals, 2);
  assert.equal(countable("#4").before, "#");
  for (const text of ["11-4201", "Milano", "", null]) assert.equal(countable(text), null, String(text));
});

test("a year starts a little before itself; the figure keeps its own form while counting", () => {
  assert.equal(countable("1965").start, 1885);
  assert.equal(formatCount(countable("$3.50"), 1.2), "$1.20");
  assert.equal(formatCount(countable("€21.9M"), 21.9), "€21.9M");
  assert.equal(formatCount(countable("3,5 km"), 1), "1,0 km");
});

test("a grouped whole number counts from zero and keeps its commas", () => {
  const figure = countable("1,000+");
  assert.equal(figure.value, 1000);
  assert.equal(formatCount(figure, figure.start), "0+");
  assert.equal(formatCount(figure, 1000), "1,000+");
});
