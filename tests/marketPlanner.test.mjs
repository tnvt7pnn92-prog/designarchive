// The Markets page's planner: reach, periods and groups, on a small made-up city.
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatAt, globeRadiusKm, searchRadius, validKm, monthCalendar, nearestCity, nextDatedAfter, parseAt, periodWindow, planMarkets, topCities, weekendOf } from "../src/lib/marketPlanner.js";

// 2026-09-30 is a Wednesday.
const TODAY = "2026-09-30";
const origin = { lat: 45.4642, lng: 9.19 }; // Milan, the Duomo
const place = (id, kind, frequency, dLat = 0) => ({ id, name: id, city: "Milan, Italy", kind, frequency, lat: origin.lat + dLat, lng: origin.lng });
const items = [
  place("saturdays", "market", "Saturdays"), // this weekend
  place("third-weekend", "market", "Third weekend of each month"), // 17–18 October
  place("last-sunday", "market", "Last Sunday of each month"), // 25 October
  place("gallery", "shop", "Tuesday to Saturday", 0.02), // about 2 km
  place("antiques-street", "market", "Permanent antiques street", 0.01),
  place("april-fair", "fair", "Annually, April"),
  place("october-fair", "fair", "Annually, October"),
  place("periodic", "market", "Periodic"),
  place("far-away", "market", "Sundays", 0.3), // about 33 km
];

test("search this area: the point in the address, the distance and the area's name", () => {
  assert.deepEqual(parseAt("45.46421,9.19"), { lat: 45.4642, lng: 9.19 });
  assert.deepEqual(parseAt(" -33.8688 , 151.2093 "), { lat: -33.8688, lng: 151.2093 });
  for (const bad of [null, "", "milan", "45.4", "45,9,1", "95,9", "45,190"]) assert.equal(parseAt(bad), null, String(bad));
  assert.equal(formatAt({ lat: 45.464211, lng: 9.190009 }), "45.4642,9.19");
  // The whole visible circle, rounded up to a readable distance, however wide.
  assert.deepEqual([0.3, 3.2, 12, 87, 412, 2994, 9000].map(searchRadius), [1, 4, 15, 90, 420, 3000, 3000]);
  assert.ok([5, 10, 25, 50, 137, 3000].every(validKm));
  assert.ok(![0, -5, 2.5, 3001, NaN].some(validKm));
  // The globe close to the ground shows a few hundred km; pulled back, a whole hemisphere.
  const near = globeRadiusKm(0.1);
  assert.ok(near > 250 && near < 400, String(near));
  assert.ok(globeRadiusKm(0.1, 1.6) > near); // a wide frame shows more side to side
  assert.ok(Math.abs(globeRadiusKm(4) - 6371 * Math.acos(1 / 5)) < 1); // only the horizon limits it
  const cities = [{ key: "milan", lat: 45.4642, lng: 9.19 }, { key: "monza", lat: 45.5845, lng: 9.2744 }];
  assert.equal(nearestCity({ lat: 45.57, lng: 9.27 }, cities).key, "monza");
  assert.equal(nearestCity({ lat: 41.9, lng: 12.5 }, cities), null); // Rome: nothing within 50 km
});

test("periods: this weekend, 7 and 30 days, any time", () => {
  assert.deepEqual(weekendOf(TODAY), { from: "2026-10-03", to: "2026-10-04", saturday: "2026-10-03", sunday: "2026-10-04" });
  // On a Saturday the weekend is today and tomorrow; on a Sunday, today.
  assert.deepEqual(periodWindow("weekend", "2026-10-03"), { from: "2026-10-03", to: "2026-10-04" });
  assert.deepEqual(periodWindow("weekend", "2026-10-04"), { from: "2026-10-04", to: "2026-10-04" });
  assert.deepEqual(periodWindow("7", TODAY), { from: "2026-09-30", to: "2026-10-06" });
  assert.deepEqual(periodWindow("30", TODAY), { from: "2026-09-30", to: "2026-10-29" });
  assert.equal(periodWindow("all", TODAY), null);
});

test("this weekend within 10 km: one market with a date, the places always open", () => {
  const plan = planMarkets(items, { origin, km: 10, when: "weekend", today: TODAY });
  assert.deepEqual(plan.dated.map((e) => [e.market.id, e.dates]), [["saturdays", ["2026-10-03"]]]);
  assert.deepEqual(plan.open.map((e) => e.market.id), ["antiques-street", "gallery"]); // nearest first
  assert.deepEqual(plan.yearly, []);
  assert.deepEqual(plan.unknown, []);
  assert.deepEqual(plan.counts, { market: 2, fair: 0, shop: 1, sale: 0 });
});

test("brand sales: the outlet is always open, the sample sale on its announced days or its month", () => {
  const sales = [
    { ...place("outlet", "sale", "Permanent outlet, Monday to Saturday", 0.01), url: "https://example.com" },
    { ...place("sample-sale", "sale", "Twice a year, June and December"), url: "https://example.com", dates: ["2026-10-16", "2026-10-17"] },
    { ...place("october-sale", "sale", "Annually, October"), url: "https://example.com" },
  ];
  const plan = planMarkets(sales, { origin, km: 10, when: "30", today: TODAY });
  assert.deepEqual(plan.open.map((e) => e.market.id), ["outlet"]);
  assert.deepEqual(plan.dated.map((e) => [e.market.id, e.dates]), [["sample-sale", ["2026-10-16", "2026-10-17"]]]);
  assert.deepEqual(plan.yearly.map((e) => e.market.id), ["october-sale"]);
  assert.equal(plan.counts.sale, 3);
  // Only the sales, when they alone are chosen; and their announced days are in the calendar.
  assert.deepEqual(planMarkets([...items, ...sales], { origin, km: 10, when: "30", kinds: ["sale"], today: TODAY }).dated.map((e) => e.market.id), ["sample-sale"]);
  const days = monthCalendar(sales, { origin, km: 10, year: 2026, month: 9 });
  assert.deepEqual(days[15].places.map((m) => m.id), ["sample-sale"]);
  assert.deepEqual(days[17].places, []);
});

test("the next 30 days: dates in order, the fair of the month, nothing vague", () => {
  const plan = planMarkets(items, { origin, km: 10, when: "30", today: TODAY });
  assert.deepEqual(plan.dated.map((e) => e.market.id), ["saturdays", "third-weekend", "last-sunday"]);
  assert.equal(plan.dated[1].dates[0], "2026-10-17");
  assert.deepEqual(plan.yearly.map((e) => e.market.id), ["october-fair"]);
  assert.deepEqual(plan.unknown, []);
});

test("any time: every fair and the places without dates too; distance still applies", () => {
  const plan = planMarkets(items, { origin, km: 10, when: "all", today: TODAY });
  assert.deepEqual(plan.yearly.map((e) => e.market.id), ["april-fair", "october-fair"]);
  assert.deepEqual(plan.unknown.map((e) => e.market.id), ["periodic"]);
  assert.equal([...plan.dated, ...plan.open, ...plan.yearly, ...plan.unknown].some((e) => e.market.id === "far-away"), false);
  assert.equal(planMarkets(items, { origin, km: 50, when: "all", today: TODAY }).dated.some((e) => e.market.id === "far-away"), true);
});

test("kinds filter the lists but not the counts on the chips", () => {
  const plan = planMarkets(items, { origin, km: 10, when: "all", kinds: ["shop"], today: TODAY });
  assert.deepEqual([...plan.dated, ...plan.yearly, ...plan.unknown], []);
  assert.deepEqual(plan.open.map((e) => e.market.id), ["gallery"]);
  assert.equal(plan.counts.market, 5);
});

test("the nearest date when the period is empty, and the cities with most places", () => {
  assert.deepEqual(nextDatedAfter(items, { origin, km: 10, today: "2026-10-05" }), { market: items[0], date: "2026-10-10" });
  const cities = [{ key: "milan", label: "Milan, Italy", lat: 1, lng: 2 }, { key: "paris", label: "Paris, France", lat: 3, lng: 4 }];
  const paris = { ...items[0], id: "p", city: "Paris, France" };
  assert.deepEqual(topCities([...items, paris], cities, 5).map((c) => [c.key, c.count]), [["milan", 9], ["paris", 1]]);
});

test("the month, day by day: recurring markets only, within reach", () => {
  const days = monthCalendar(items, { origin, km: 10, year: 2026, month: 9 }); // October 2026
  assert.equal(days.length, 31);
  const on = (d) => days[d - 1].places.map((m) => m.id);
  assert.deepEqual(on(3), ["saturdays"]); // a Saturday
  assert.deepEqual(on(17), ["saturdays", "third-weekend"]);
  assert.deepEqual(on(18), ["third-weekend"]);
  assert.deepEqual(on(25), ["last-sunday"]);
  assert.deepEqual(on(1), []); // a Thursday
  // No shops, permanent places, fairs known by month only, or places out of reach.
  const everything = new Set(days.flatMap((day) => day.places.map((m) => m.id)));
  for (const id of ["gallery", "antiques-street", "october-fair", "far-away", "periodic"]) assert.equal(everything.has(id), false, id);
});