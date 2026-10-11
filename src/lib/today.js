import { useEffect, useState } from "react";

// Stories are scheduled by calendar date in the visitor's own time zone, as "YYYY-MM-DD" keys
// that compare correctly as plain strings.
export function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(key, days) {
  const date = new Date(`${key}T12:00:00`);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

// Days since the epoch for a "YYYY-MM-DD" key: the local day boundary from `dateKey`, then UTC
// arithmetic so the number never shifts with daylight saving. The story of the day counts from it.
export function dayNumber(key) {
  return Math.floor(Date.parse(`${key}T00:00:00Z`) / 86_400_000);
}

const LOCALES = { zh: "zh-CN" };

export function formatDay(key, lang) {
  return new Intl.DateTimeFormat(LOCALES[lang] ?? lang, { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(`${key}T12:00:00`)
  );
}

function msUntilMidnight(now) {
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight - now;
}

// Ticks once a minute, so the countdown moves and a new day's story appears without a reload.
export function useToday() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  return { today: dateKey(now), msLeft: msUntilMidnight(now) };
}
