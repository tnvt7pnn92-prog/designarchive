import { useMemo, useState } from "react";
import { MARKET_ITEMS } from "../data/marketIndex.js";
import { monthCalendar } from "../lib/marketPlanner.js";
import "./MarketCalendar.css";

const KIND_COLOR = { market: "var(--kind-market)", fair: "var(--kind-fair)", sale: "var(--kind-sale)" };

// "October in Milan": the recurring markets within reach, day by day, a month at a time. On a
// phone the names become coloured dots and a day opens its own list underneath.
export default function MarketCalendar({ origin, km, kinds, place, today, lang, t, onPick }) {
  // At the end of a month (less than a week left) the calendar opens on the next one.
  const [shift, setShift] = useState(() => {
    const date = new Date(`${today}T00:00:00Z`);
    const left = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate() - date.getUTCDate();
    return left < 7 ? 1 : 0;
  });
  const [openDay, setOpenDay] = useState(null);
  const locale = lang === "zh" ? "zh-CN" : lang;
  const base = new Date(`${today}T00:00:00Z`);
  const year = base.getUTCFullYear() + Math.floor((base.getUTCMonth() + shift) / 12);
  const month = (((base.getUTCMonth() + shift) % 12) + 12) % 12;
  const days = useMemo(() => monthCalendar(MARKET_ITEMS, { origin, km, kinds, year, month }), [origin, km, kinds, year, month]);

  const monthName = new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(year, month, 15)));
  const title = t("markets.planner.calendarTitle", { month: monthName.charAt(0).toUpperCase() + monthName.slice(1), place });
  // Monday first; the weekday names from the language itself.
  const weekdays = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2026, 8, 28 + i))).replace(".", ""));
  const lead = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const longDay = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  const opened = days.find((day) => day.key === openDay);
  const move = (step) => {
    setShift((s) => s + step);
    setOpenDay(null);
  };

  return (
    <section className="mk-cal" aria-labelledby="mk-cal-title">
      <div className="mk-cal__head">
        <h2 id="mk-cal-title">{title}</h2>
        <div className="mk-cal__nav">
          <button type="button" onClick={() => move(-1)} aria-label={t("markets.planner.prevMonth")}>
            ←
          </button>
          <button type="button" onClick={() => move(1)} aria-label={t("markets.planner.nextMonth")}>
            →
          </button>
        </div>
      </div>
      <p className="mk-cal__note">{t("markets.planner.calendarNote")}</p>

      <div className="mk-cal__grid" role="grid" aria-labelledby="mk-cal-title">
        {weekdays.map((name) => (
          <div key={name} className="mk-cal__dh" role="columnheader">
            {name}
          </div>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <div key={`lead-${i}`} className="mk-cal__cell is-off" aria-hidden="true" />
        ))}
        {days.map((day) => {
          const date = Number(day.key.slice(8));
          const weekday = new Date(`${day.key}T00:00:00Z`).getUTCDay();
          const label = `${longDay.format(new Date(`${day.key}T00:00:00Z`))}: ${day.places.length ? day.places.map((m) => m.name).join(", ") : t("markets.planner.noMarkets")}`;
          return (
            <div
              key={day.key}
              role="gridcell"
              className={`mk-cal__cell${weekday === 0 || weekday === 6 ? " is-weekend" : ""}${day.key === today ? " is-today" : ""}${day.key < today ? " is-past" : ""}`}
            >
              {day.places.length ? (
                <button type="button" className="mk-cal__day" aria-label={label} aria-expanded={openDay === day.key} onClick={() => setOpenDay(openDay === day.key ? null : day.key)}>
                  {date}
                </button>
              ) : (
                <span className="mk-cal__day" aria-label={label}>
                  {date}
                </span>
              )}
              {/* The names (dots on a phone) are for the eye and the mouse; the day's button lists
                  them for everyone. */}
              {day.places.map((m) => (
                <span key={m.id} className="mk-cal__event" style={{ "--kind": KIND_COLOR[m.kind] }} title={m.name} aria-hidden="true" onClick={() => onPick?.(m.id)}>
                  {m.name}
                </span>
              ))}
            </div>
          );
        })}
      </div>

      {opened && (
        <ul className="mk-cal__day-list" aria-label={longDay.format(new Date(`${opened.key}T00:00:00Z`))}>
          {opened.places.map((m) => (
            <li key={m.id} style={{ "--kind": KIND_COLOR[m.kind] }}>
              <span className="mk-cal__dot" aria-hidden="true" />
              <strong>{m.name}</strong> <span>{m.frequency}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mk-cal__foot">{t("markets.planner.datesNote")}</p>
    </section>
  );
}
