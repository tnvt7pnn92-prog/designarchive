// node --test tests/   — the market-date rules on real frequencies from src/data/markets.js.
import { test } from "node:test";
import assert from "node:assert/strict";
import { marketSchedule, nextMarketDates, parseFrequency, yearlyMonths } from "../src/lib/marketDates.js";

const market = (frequency, kind = "market") => ({ frequency, kind });
// 2026-09-25 is a Friday.
const FROM = "2026-09-25";

test("weekly markets", () => {
  assert.deepEqual(nextMarketDates(market("Sundays"), FROM), ["2026-09-27", "2026-10-04", "2026-10-11"]);
  assert.deepEqual(nextMarketDates(market("Saturdays, year-round"), FROM, 2), ["2026-09-26", "2026-10-03"]);
  assert.deepEqual(nextMarketDates(market("Weekends"), FROM, 3), ["2026-09-26", "2026-09-27", "2026-10-03"]);
  assert.deepEqual(nextMarketDates(market("Monday to Saturday"), FROM, 3), ["2026-09-25", "2026-09-26", "2026-09-28"]);
  assert.deepEqual(nextMarketDates(market("Saturday to Thursday; Friday morning Juma market"), FROM, 2), ["2026-09-26", "2026-09-27"]);
  assert.deepEqual(nextMarketDates(market("Daily except Sunday; largest on Friday & Saturday"), "2026-09-26", 2), ["2026-09-26", "2026-09-28"]);
});

test("monthly rules", () => {
  assert.deepEqual(nextMarketDates(market("First Sunday of each month"), FROM, 2), ["2026-10-04", "2026-11-01"]);
  assert.deepEqual(nextMarketDates(market("Last Sunday of each month"), FROM, 2), ["2026-09-27", "2026-10-25"]);
  assert.deepEqual(nextMarketDates(market("Second and last Tuesday of each month"), FROM, 3), ["2026-09-29", "2026-10-13", "2026-10-27"]);
  assert.deepEqual(nextMarketDates(market("First Sunday of each month and the Saturday before"), FROM, 2), ["2026-10-03", "2026-10-04"]);
  assert.deepEqual(nextMarketDates(market("21st of each month"), FROM, 2), ["2026-10-21", "2026-11-21"]);
  assert.deepEqual(nextMarketDates(market("Wednesdays, Saturdays and the first Sunday of each month"), FROM, 3), ["2026-09-26", "2026-09-30", "2026-10-03"]);
  // The first weekend: the first Saturday of the month and the Sunday after it.
  assert.deepEqual(nextMarketDates(market("First weekend of each month, except August"), FROM, 2), ["2026-10-03", "2026-10-04"]);
});

test("months left out", () => {
  assert.deepEqual(nextMarketDates(market("Every Sunday, except August"), "2027-07-26", 2), ["2027-09-05", "2027-09-12"]);
  assert.deepEqual(nextMarketDates(market("Saturdays, May to October"), "2026-10-30", 2), ["2026-10-31", "2027-05-01"]);
});

test("vague frequencies give no dates", () => {
  for (const frequency of [
    "Periodic",
    "Annually, September",
    "Several weekends a year",
    "Sundays, seasonal",
    "Saturdays, roughly April to October",
    "Monthly",
    "Every other Saturday",
    "Weekends, seasonal",
    "Thursdays, plus Sundays in summer",
    "Annually, late February",
  ]) {
    assert.equal(parseFrequency(frequency), null, frequency);
  }
  assert.equal(nextMarketDates(market("Daily", "shop"), FROM), null);
});

test("seasons with early, mid- and late: thirds of the month", () => {
  // Late April = from the 21st; late October = to the end of the month.
  assert.deepEqual(nextMarketDates(market("Sundays, late April to late October"), "2026-10-20", 3), ["2026-10-25", "2027-04-25", "2027-05-02"]);
  // Mid-November = to the 20th; mid-March = from the 11th.
  assert.deepEqual(nextMarketDates(market("Saturdays and Sundays, mid-March to mid-November"), "2026-11-14", 3), ["2026-11-14", "2026-11-15", "2027-03-13"]);
  // A qualifier outside a season stays too vague.
  assert.equal(parseFrequency("Saturdays in late spring"), null);
});

test("wordings that used to be read as vague", () => {
  // Brackets and the weather do not change the calendar.
  assert.deepEqual(nextMarketDates(market("Sundays (dates may vary in summer)"), FROM, 2), ["2026-09-27", "2026-10-04"]);
  assert.deepEqual(nextMarketDates(market("Saturdays, Sundays & public holidays, weather permitting"), FROM, 2), ["2026-09-26", "2026-09-27"]);
  // Every day but the 2nd and 4th Tuesday (13 and 27 October 2026).
  assert.deepEqual(nextMarketDates(market("Daily except the 2nd & 4th Tuesdays"), "2026-10-12", 3), ["2026-10-12", "2026-10-14", "2026-10-15"]);
  assert.equal(nextMarketDates(market("Daily except the 2nd & 4th Tuesdays"), "2026-10-27", 1)[0], "2026-10-28");
  // Thursday to Sunday of the second weekend (Saturday 10 October 2026).
  assert.deepEqual(nextMarketDates(market("Second weekend of each month, Thursday to Sunday"), FROM, 5), ["2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11", "2026-11-12"]);
  // One weekend a year.
  assert.deepEqual(nextMarketDates(market("First weekend of September, annually"), FROM, 2), ["2027-09-04", "2027-09-05"]);
});

test("fairs that come back in given months, in the order they next come round", () => {
  assert.deepEqual(yearlyMonths("Annually, September", FROM), { months: [8], biennial: false });
  assert.deepEqual(yearlyMonths("Twice a year, January and September", FROM), { months: [8, 0], biennial: false });
  assert.deepEqual(yearlyMonths("Every two years, October", FROM), { months: [9], biennial: true });
  assert.deepEqual(yearlyMonths("Annually, February to March", FROM), { months: [1, 2], biennial: false });
  assert.deepEqual(yearlyMonths("Three six-day shows a year (May, July, September)", FROM), { months: [8, 4, 6], biennial: false });
  assert.equal(yearlyMonths("Annually", FROM), null);
  assert.equal(yearlyMonths("Sundays", FROM), null);
});

test("what a place's calendar can say", () => {
  assert.deepEqual(marketSchedule(market("Sundays"), FROM, 1), { type: "dates", dates: ["2026-09-27"] });
  assert.deepEqual(marketSchedule(market("Annually, April", "fair"), FROM), { type: "months", months: [3], biennial: false });
  assert.deepEqual(marketSchedule(market("Permanent antiques street"), FROM), { type: "open" });
  assert.deepEqual(marketSchedule(market("Tuesday to Saturday", "shop"), FROM), { type: "open" });
  assert.deepEqual(marketSchedule(market("Periodic"), FROM), { type: "unknown" });
});

test("brand sales: announced days first, then the months they usually fall in", () => {
  const sale = (frequency, dates) => ({ frequency, kind: "sale", dates });
  // Announced days, in order, from today on (2026-09-25).
  assert.deepEqual(nextMarketDates(sale("Twice a year, June and December", ["2026-12-05", "2026-09-20", "2026-12-04"]), FROM), ["2026-12-04", "2026-12-05"]);
  assert.deepEqual(marketSchedule(sale("Twice a year, June and December", ["2026-12-04"]), FROM), { type: "dates", dates: ["2026-12-04"] });
  // Once they are past, the usual months again.
  assert.deepEqual(marketSchedule(sale("Twice a year, June and December", ["2026-06-12"]), FROM), { type: "months", months: [11, 5], biennial: false });
  assert.deepEqual(marketSchedule(sale("Twice a year, June and December"), FROM), { type: "months", months: [11, 5], biennial: false });
  // A factory outlet is open all year.
  assert.deepEqual(marketSchedule(sale("Permanent outlet, Monday to Saturday"), FROM), { type: "open" });
});