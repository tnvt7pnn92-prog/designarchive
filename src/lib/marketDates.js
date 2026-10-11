// The next dates of a market, worked out from its written frequency ("Sundays", "Monday to
// Saturday", "First Sunday of each month, except August", "21st of each month"…).
//
// It is deliberately cautious: only clear rules produce dates. Anything vague — "Periodic",
// "Several weekends a year", "Annually", "seasonal", "weather permitting", "roughly…" — returns
// null, and the page shows the frequency as written instead of inventing a date. Shops,
// museums and galleries have no dates at all.

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const ORDINALS = { first: 1, "1st": 1, second: 2, "2nd": 2, third: 3, "3rd": 3, fourth: 4, "4th": 4, last: -1 };

// Words that make a frequency too vague to turn into dates. (Read without the brackets: "Sundays
// (dates may vary in summer)" is still Sundays. "Weather permitting" says nothing of the calendar.)
const VAGUE = /periodic|several|selected|select |roughly|about |rotating|varies|venue|annual|every two years|twice a year|three|six times|permanent|seasonal|cancelled|every other|extravaganza|summer|winter|spring|autumn|by appointment/;

const weekdayIndex = (word) => WEEKDAYS.findIndex((day) => word.startsWith(day));

function weekdaysIn(text) {
  const days = new Set();
  // Ranges first: "Monday to Saturday", "Saturday to Thursday", "Mon–Sun".
  const range = /(sunday|monday|tuesday|wednesday|thursday|friday|saturday)s?\s*(?:to|–|-)\s*(sunday|monday|tuesday|wednesday|thursday|friday|saturday)s?/g;
  let rest = text;
  for (const m of text.matchAll(range)) {
    const from = weekdayIndex(m[1]);
    const to = weekdayIndex(m[2]);
    for (let d = from; ; d = (d + 1) % 7) {
      days.add(d);
      if (d === to) break;
    }
    rest = rest.replace(m[0], " ");
  }
  for (const m of rest.matchAll(/(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/g)) days.add(weekdayIndex(m[1]));
  if (/\bweekends?\b/.test(rest)) {
    days.add(6);
    days.add(0);
  }
  if (/\bdaily\b|\bevery day\b/.test(rest)) for (let d = 0; d < 7; d += 1) days.add(d);
  return days;
}

// Months named after "except": "except July and August".
function exceptedMonths(text) {
  const m = /except ([a-z ,&]+)/.exec(text);
  if (!m) return new Set();
  return new Set(MONTHS.map((name, i) => (m[1].includes(name) ? i : -1)).filter((i) => i >= 0));
}

// A season: "May to October", "late April to late October", "mid-March to mid-November". The
// qualifiers are read as thirds of the month — early 1–10, mid 11–20, late 21 to the end — which
// is as precise as the words are; the pages always say to check with the organiser.
const MONTH = "(january|february|march|april|may|june|july|august|september|october|november|december)";
const WINDOW = new RegExp(`(?:(early|mid-|late) ?)?${MONTH} to (?:(early|mid-|late) ?)?${MONTH}`);
const THIRDS = { early: [1, 10], "mid-": [11, 20], late: [21, 31] };

function monthWindow(text) {
  const m = WINDOW.exec(text);
  if (!m) return null;
  const from = MONTHS.indexOf(m[2]);
  const to = MONTHS.indexOf(m[4]);
  const startDay = m[1] ? THIRDS[m[1]][0] : 1;
  const endDay = m[3] ? THIRDS[m[3]][1] : 31;
  // Day of the year as month * 100 + day, so "late April" (421) sorts before "late October" (1031).
  const start = from * 100 + startDay;
  const end = to * 100 + endDay;
  return (date) => {
    const value = date.getUTCMonth() * 100 + date.getUTCDate();
    return start <= end ? value >= start && value <= end : value >= start || value <= end;
  };
}

// The nth given weekday of a month (n = -1 for the last).
function nthWeekday(year, month, weekday, n) {
  if (n > 0) {
    const first = new Date(Date.UTC(year, month, 1)).getUTCDay();
    const day = 1 + ((weekday - first + 7) % 7) + (n - 1) * 7;
    return day <= daysIn(year, month) ? day : null;
  }
  const last = daysIn(year, month);
  const lastDay = new Date(Date.UTC(year, month, last)).getUTCDay();
  return last - ((lastDay - weekday + 7) % 7);
}

const daysIn = (year, month) => new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

// Turns a frequency into a rule: a function telling whether a given date is a market day.
export function parseFrequency(frequency) {
  if (!frequency) return null;
  // The main clause only: "Saturdays; Gran Balon second Sunday…" → "Saturdays".
  const main = frequency.toLowerCase().split(";")[0];
  const plain = main.replace(/\([^)]*\)/g, " ");
  // One weekend a year: "First weekend of September, annually" (the Braderie de Lille).
  const yearly = /^(first|second|third|fourth|last) weekend of (january|february|march|april|may|june|july|august|september|october|november|december),? annually\s*$/.exec(plain.trim());
  if (yearly) {
    const n = ORDINALS[yearly[1]];
    const month = MONTHS.indexOf(yearly[2]);
    return (date) => {
      if (date.getUTCMonth() !== month) return false;
      const sat = nthWeekday(date.getUTCFullYear(), month, 6, n);
      return sat !== null && (date.getUTCDate() === sat || (date.getUTCDate() === sat + 1 && sat + 1 <= daysIn(date.getUTCFullYear(), month)));
    };
  }
  if (VAGUE.test(plain)) return null;
  if (/\bmonthly\b/.test(plain) && !/of (each|every) month/.test(plain)) return null;
  // "Early", "mid-" and "late" only make sense in a season ("late April to late October").
  if (/\b(early|late) |mid-/.test(plain) && !WINDOW.test(plain)) return null;

  // "Daily except the 2nd & 4th Tuesdays": particular weekdays of the month are left out.
  const skipped = /except the ((?:(?:1st|2nd|3rd|4th|first|second|third|fourth|last)\s*(?:&|and)?\s*)+)(sunday|monday|tuesday|wednesday|thursday|friday|saturday)s?/.exec(plain);
  if (/except the \d|except \d/.test(plain) && !skipped) return null;
  const skip = skipped
    ? {
        ns: skipped[1].split(/\s*(?:&|and)\s*|\s+/).map((word) => ORDINALS[word]).filter(Boolean),
        weekday: weekdayIndex(skipped[2]),
      }
    : null;

  let text = plain
    .replace(skipped?.[0] ?? "\u0000", " ")
    .replace(/[,&]/g, " ")
    .replace(/\b(and|public holidays?|mornings?|evenings?|afternoons?|year-round|plus)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Weekdays named after "except": "daily except sunday".
  const exceptClause = /except ([a-z ]+)/.exec(text)?.[1] ?? "";
  const excludedDays = new Set([...exceptClause.matchAll(/(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/g)].map((m) => weekdayIndex(m[1])));
  const excluded = exceptedMonths(text);
  const window = monthWindow(text);
  const skippedDay = (date) =>
    skip !== null &&
    date.getUTCDay() === skip.weekday &&
    skip.ns.some((n) => nthWeekday(date.getUTCFullYear(), date.getUTCMonth(), skip.weekday, n) === date.getUTCDate());
  const dateOk = (date) => !excluded.has(date.getUTCMonth()) && (!window || window(date)) && !skippedDay(date);
  const cleaned = text.replace(/except [a-z ,&]+/, " ").replace(WINDOW, " ");

  const rules = [];

  // "21st of each month", "21st 22nd of each month"
  const dayNumbers = [...cleaned.matchAll(/\b(\d{1,2})(?:st|nd|rd|th)\b/g)].map((m) => Number(m[1]));
  if (dayNumbers.length && /of (each|every) month/.test(cleaned)) {
    rules.push((date) => dayNumbers.includes(date.getUTCDate()));
  }

  // "the weekend before the first monday of each month"
  if (/weekend before the first monday of (each|every) month/.test(cleaned)) {
    rules.push((date) => {
      const next = new Date(date);
      next.setUTCDate(date.getUTCDate() + (date.getUTCDay() === 6 ? 2 : date.getUTCDay() === 0 ? 1 : 99));
      return next.getUTCDate() <= 7 && next.getUTCDay() === 1;
    });
  }

  // "first and fourth sundays of each month", "second last tuesday of each month",
  // "first sunday of each month the saturday before", "third weekend of each month"
  const ordinalPhrase = /((?:(?:first|second|third|fourth|last|1st|2nd|3rd|4th)\s*)+)(sunday|monday|tuesday|wednesday|thursday|friday|saturday|weekend)s? of (?:each|every) month( the saturday before)?/;
  const ordinal = ordinalPhrase.exec(cleaned);
  let remaining = cleaned;
  if (ordinal && !/weekend before/.test(cleaned)) {
    const ns = ordinal[1].trim().split(/\s+/).map((word) => ORDINALS[word]).filter(Boolean);
    const target = ordinal[2];
    const saturdayBefore = Boolean(ordinal[3]);
    rules.push((date) => {
      const y = date.getUTCFullYear();
      const m = date.getUTCMonth();
      const d = date.getUTCDate();
      if (target === "weekend") {
        // The nth weekend: the nth Saturday of the month and the Sunday after it.
        return ns.some((n) => {
          const sat = nthWeekday(y, m, 6, n);
          if (sat === null) return false;
          if (d === sat) return true;
          const sun = new Date(Date.UTC(y, m, sat + 1));
          return sun.getUTCMonth() === m && sun.getUTCDate() === d;
        });
      }
      const weekday = weekdayIndex(target);
      return ns.some((n) => {
        const day = nthWeekday(y, m, weekday, n);
        if (day === d) return true;
        if (!saturdayBefore || day === null) return false;
        return d === day - 1;
      });
    });
    remaining = cleaned.replace(ordinal[0], " ");
    if (target === "weekend" && /(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/.test(remaining)) {
      // "Second weekend of each month, Thursday to Sunday": the weekend and the days leading up
      // to it. Any other combination is too unclear to date.
      const lead = /^\s*(thursday|friday) to sunday\s*$/.exec(remaining);
      if (!lead) return null;
      const before = lead[1] === "thursday" ? 2 : 1;
      const weekendRule = rules.pop();
      rules.push((date) => {
        for (let back = 0; back <= before; back += 1) {
          const later = new Date(date);
          later.setUTCDate(date.getUTCDate() + back);
          if (later.getUTCDay() === 6 && later.getUTCMonth() === date.getUTCMonth() && weekendRule(later)) return true;
        }
        return weekendRule(date);
      });
      remaining = " ";
    }
  }

  // Plain weekdays ("sundays", "monday to saturday", "weekends", "daily"), from what is left.
  if (!/of (each|every) month/.test(remaining) || ordinal) {
    const days = weekdaysIn(remaining.replace(/(first|second|third|fourth|last) weekend of \w+/, " "));
    if (days.size) rules.push((date) => days.has(date.getUTCDay()));
  }

  if (!rules.length) return null;
  return (date) => dateOk(date) && !excludedDays.has(date.getUTCDay()) && rules.some((rule) => rule(date));
}

const toKey = (date) => date.toISOString().slice(0, 10);

// The months of a fair that comes back once or a few times a year ("Annually, September",
// "Twice a year, March and September", "Every two years, October"): which months, in the order
// they next come round from `fromKey`, and whether it is every other year. Null when the wording
// names no month.
export function yearlyMonths(frequency, fromKey) {
  const text = String(frequency ?? "").toLowerCase();
  if (!/annual|twice a year|every two years|times a year|shows a year|fairs a year/.test(text)) return null;
  const window = WINDOW.exec(text);
  let months;
  if (window) {
    months = [];
    for (let i = MONTHS.indexOf(window[2]); ; i = (i + 1) % 12) {
      months.push(i);
      if (i === MONTHS.indexOf(window[4])) break;
    }
  } else {
    months = MONTHS.map((name, i) => (new RegExp(`\\b${name}\\b`).test(text) ? i : -1)).filter((i) => i >= 0);
  }
  if (!months.length) return null;
  const now = new Date(`${fromKey}T00:00:00Z`).getUTCMonth();
  return { months: [...new Set(months)].sort((a, b) => ((a - now + 12) % 12) - ((b - now + 12) % 12)), biennial: /every two years/.test(text) };
}

// What a place's calendar can honestly say, for the pages:
//   { type: "dates", dates }            the next market days, worked out from the frequency
//   { type: "months", months, biennial } a fair that comes back in given months
//   { type: "open" }                    shops, galleries, permanent antiques streets and villages
//   { type: "unknown" }                 anything else: the frequency is shown as written
export function marketSchedule(market, fromKey, count = 3) {
  if (!market) return { type: "unknown" };
  if (market.kind === "shop" || /^permanent\b/i.test(market.frequency ?? "")) return { type: "open" };
  const dates = nextMarketDates(market, fromKey, count);
  if (dates) return { type: "dates", dates };
  const yearly = yearlyMonths(market.frequency, fromKey);
  if (yearly) return { type: "months", ...yearly };
  return { type: "unknown" };
}

// Whether a place is on, day by day: the days its organiser has announced (`dates`, as a brand
// does for its next sample sale) and those its frequency gives. Null when neither gives any.
export function marketDayRule(market) {
  if (!market || market.kind === "shop") return null;
  const announced = new Set(market.dates ?? []);
  const rule = parseFrequency(market.frequency);
  if (!announced.size) return rule;
  return (date) => announced.has(toKey(date)) || Boolean(rule?.(date));
}

// The next `count` market days from `fromKey` (YYYY-MM-DD, included), within a year; null when
// the frequency does not allow dates, or the place is not a periodic market or fair. Announced
// days come first; once they are past, the frequency takes over again.
export function nextMarketDates(market, fromKey, count = 3) {
  if (!market || market.kind === "shop") return null;
  const announced = [...new Set(market.dates ?? [])].filter((key) => key >= fromKey).sort();
  if (announced.length) return announced.slice(0, count);
  const rule = parseFrequency(market.frequency);
  if (!rule) return null;
  const dates = [];
  const date = new Date(`${fromKey}T00:00:00Z`);
  for (let i = 0; i < 400 && dates.length < count; i += 1) {
    if (rule(date)) dates.push(toKey(date));
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return dates.length ? dates : null;
}
