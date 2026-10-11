// The hunt planner behind the Markets page: which places are within reach of a starting point,
// what their calendar says, and in what order to show them. Plain functions over the market list,
// so the page and the tests share them.
import { marketDayRule, marketSchedule } from "./marketDates.js";

// "sale": brands' factory outlets (open all year) and sample sales (a month or announced days).
export const KINDS = ["market", "fair", "shop", "sale"];
export const DISTANCES = [5, 10, 25, 50];
export const PERIODS = ["weekend", "7", "30", "all"];
export const DEFAULT_KM = 10;
export const DEFAULT_PERIOD = "30";

const EARTH_RADIUS_KM = 6371;
const toRad = (deg) => (deg * Math.PI) / 180;
export function haversine(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

// "Search this area": a point picked on the map travels in the address as ?at=lat,lng.
const round4 = (n) => Math.round(n * 1e4) / 1e4;

export function parseAt(value) {
  const match = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/.exec(value ?? "");
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (Math.abs(lat) > 85 || Math.abs(lng) > 180) return null;
  return { lat: round4(lat), lng: round4(lng) };
}

export const formatAt = ({ lat, lng }) => `${round4(lat)},${round4(lng)}`;

// "Search this area" searches what the map shows, however wide: the radius, rounded up to a
// readable number (1 km steps under 10, 5 under 100, 10 above), within MAX_KM.
export const MAX_KM = 3000;
export function searchRadius(radiusKm) {
  const r = Math.max(1, radiusKm);
  const step = r < 10 ? 1 : r < 100 ? 5 : 10;
  return Math.min(MAX_KM, Math.ceil(r / step) * step);
}

// A distance read from the address: one of the menu's, or any whole number up to MAX_KM (what a
// "search this area" leaves there).
export const validKm = (km) => DISTANCES.includes(km) || (Number.isInteger(km) && km >= 1 && km <= MAX_KM);

// How far the globe shows from its centre, at a camera altitude (in earth radii, as globe.gl
// counts it) and a frame aspect (width / height): where the edge of the 50° view meets the earth,
// or the horizon when the view reaches past it. Like the city map, along the wider of the two
// half-views (side to side in a landscape frame).
const EARTH_KM = 6371;
const HALF_FOV = (25 * Math.PI) / 180;
export function globeRadiusKm(altitude, aspect = 1) {
  const d = 1 + altitude;
  const half = Math.max(HALF_FOV, Math.atan(Math.tan(HALF_FOV) * aspect));
  const reach = d * Math.sin(half) >= 1 ? Math.acos(1 / d) : Math.asin(d * Math.sin(half)) - half;
  return EARTH_KM * reach;
}

// The nearest known city to a point, to name the area searched; null when none is that close.
export function nearestCity(point, cities, maxKm = 50) {
  let best = null;
  for (const city of cities) {
    const distance = haversine(point, city);
    if (distance <= maxKm && (!best || distance < best.km)) best = { city, km: distance };
  }
  return best?.city ?? null;
}

const day = (key) => new Date(`${key}T00:00:00Z`);
export const addDays = (key, n) => {
  const date = day(key);
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
};

// This weekend: today and tomorrow on a Saturday, today on a Sunday, the coming one otherwise.
export function weekendOf(todayKey) {
  const weekday = day(todayKey).getUTCDay();
  if (weekday === 0) return { from: todayKey, to: todayKey, saturday: addDays(todayKey, -1), sunday: todayKey };
  const saturday = addDays(todayKey, 6 - weekday);
  return { from: weekday === 6 ? todayKey : saturday, to: addDays(saturday, 1), saturday, sunday: addDays(saturday, 1) };
}

// The days a period covers, as { from, to } (both included); null for "any time".
export function periodWindow(when, todayKey) {
  if (when === "weekend") {
    const { from, to } = weekendOf(todayKey);
    return { from, to };
  }
  if (when === "7") return { from: todayKey, to: addDays(todayKey, 6) };
  if (when === "30") return { from: todayKey, to: addDays(todayKey, 29) };
  return null;
}

const monthsOf = (window) => {
  const months = new Set();
  for (let key = window.from; key <= window.to; key = addDays(key, 1)) months.add(day(key).getUTCMonth());
  return months;
};

// Everything within `km` of `origin`, sorted into what the page shows:
//   dated    markets and fairs with a day in the period, by date, then distance
//   yearly   fairs known only by their month: in the next 30 days when their month is in it, and
//            all of them for "all" (never for a weekend or a week: their days are not known)
//   open     shops, galleries and permanent places, by distance (the period does not apply)
//   unknown  places whose frequency gives no date, only for "all", by distance
//   counts   per kind, within reach and in the period, whatever kinds are chosen (for the chips)
export function planMarkets(items, { origin, km = DEFAULT_KM, when = DEFAULT_PERIOD, kinds = KINDS, today }) {
  const plan = { dated: [], yearly: [], open: [], unknown: [], counts: Object.fromEntries(KINDS.map((kind) => [kind, 0])) };
  if (!origin) return plan;
  const window = periodWindow(when, today);
  const windowMonths = window ? monthsOf(window) : null;
  for (const market of items) {
    if (!Number.isFinite(market.lat) || !Number.isFinite(market.lng)) continue;
    const distance = haversine(origin, market);
    if (distance > km) continue;
    const schedule = marketSchedule(market, today, 4);
    const entry = { market, km: distance, schedule };
    let group = null;
    if (schedule.type === "open") group = "open";
    else if (schedule.type === "dates") {
      const inWindow = window ? schedule.dates.filter((date) => date >= window.from && date <= window.to) : schedule.dates;
      if (inWindow.length) {
        entry.dates = inWindow;
        group = "dated";
      }
    } else if (schedule.type === "months") {
      // A fair known only by its month cannot be promised for a weekend or a given week.
      if (!windowMonths || (when === "30" && schedule.months.some((month) => windowMonths.has(month)))) group = "yearly";
    } else if (!window) group = "unknown";
    if (!group) continue;
    plan.counts[market.kind] += 1;
    if (kinds.includes(market.kind)) plan[group].push(entry);
  }
  plan.dated.sort((a, b) => a.dates[0].localeCompare(b.dates[0]) || a.km - b.km);
  plan.yearly.sort((a, b) => a.schedule.months[0] - b.schedule.months[0] || a.km - b.km);
  plan.open.sort((a, b) => a.km - b.km);
  plan.unknown.sort((a, b) => a.km - b.km);
  return plan;
}

// A month of markets within reach, day by day: [{ key: "2026-10-01", places: [market…] }, …].
// Only the places whose frequency or announced days give days (markets, fairs, sample sales);
// nearest first on each day.
export function monthCalendar(items, { origin, km = DEFAULT_KM, kinds = KINDS, year, month }) {
  const reachable = items
    .filter((m) => m.kind !== "shop" && kinds.includes(m.kind) && !/^permanent\b/i.test(m.frequency ?? "") && haversine(origin, m) <= km)
    .map((m) => ({ market: m, km: haversine(origin, m), rule: marketDayRule(m) }))
    .filter((entry) => entry.rule)
    .sort((a, b) => a.km - b.km);
  const days = [];
  const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  for (let d = 1; d <= count; d++) {
    const date = new Date(Date.UTC(year, month, d));
    days.push({ key: date.toISOString().slice(0, 10), places: reachable.filter((entry) => entry.rule(date)).map((entry) => entry.market) });
  }
  return days;
}

// The next market day after the period, for "nothing this weekend — the nearest date is…".
export function nextDatedAfter(items, { origin, km = DEFAULT_KM, kinds = KINDS, today }) {
  let best = null;
  for (const market of items) {
    if (!kinds.includes(market.kind) || market.kind === "shop" || haversine(origin, market) > km) continue;
    const schedule = marketSchedule(market, today, 1);
    if (schedule.type === "dates" && (!best || schedule.dates[0] < best.date)) best = { market, date: schedule.dates[0] };
  }
  return best;
}

// The cities with most places, for the starting-point menu: [{ key, label, lat, lng, count }].
export function topCities(items, cities, count = 10) {
  const byKey = new Map(cities.map((city) => [city.key, city]));
  const tally = new Map();
  for (const market of items) {
    const key = market.city.split(",")[0].trim().toLowerCase();
    tally.set(key, (tally.get(key) ?? 0) + 1);
  }
  return [...tally]
    .filter(([key]) => byKey.has(key))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, count)
    .map(([key, n]) => ({ ...byKey.get(key), count: n }));
}
