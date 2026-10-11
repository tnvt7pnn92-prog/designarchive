import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { useProfile, updateProfile } from "../lib/profile.js";
import { askPosition, forgetPosition, useDevicePosition } from "../lib/nearby.js";
import { nextMarketDates } from "../lib/marketDates.js";
import { downloadIcs } from "../lib/ics.js";
import { formatDay, useToday } from "../lib/today.js";
import { siteUrl } from "../lib/site.js";
import { marketPath } from "../lib/marketPaths.js";
import "./NearbyMarkets.css";

const SHOWN = 4;

// The markets and fairs closest to the visitor, with their next dates when the frequency allows
// them, and an "Add to calendar" file for the next one. The market list and the distance helpers
// load only when this block is on screen.
export default function NearbyMarkets({ title }) {
  const { t, lang } = useLanguage();
  const { today } = useToday();
  const profile = useProfile();
  const device = useDevicePosition();
  const [data, setData] = useState(null);
  const [cityDraft, setCityDraft] = useState("");

  useEffect(() => {
    let alive = true;
    Promise.all([import("../data/marketIndex.js"), import("../lib/geo.js")]).then(([markets, geo]) => {
      if (alive) setData({ items: markets.MARKET_ITEMS, geo });
    });
    return () => {
      alive = false;
    };
  }, []);

  const origin = useMemo(() => {
    if (device.position) return { ...device.position, label: t("nearby.yourPosition") };
    if (!data || !profile.city) return null;
    const city = data.geo.findCity(profile.city);
    return city ? { lat: city.lat, lng: city.lng, label: city.label } : null;
  }, [device.position, data, profile.city, t]);

  const nearest = useMemo(() => {
    if (!data || !origin) return [];
    return data.items
      .filter((m) => m.kind !== "shop" && Number.isFinite(m.lat))
      .map((m) => ({ market: m, km: data.geo.haversine(origin, m), dates: nextMarketDates(m, today, 3) }))
      .sort((a, b) => a.km - b.km)
      .slice(0, SHOWN);
  }, [data, origin, today]);

  function chooseCity(e) {
    e.preventDefault();
    if (!data) return;
    const city = data.geo.findCity(cityDraft);
    if (city) {
      forgetPosition();
      updateProfile({ city: city.label });
      setCityDraft("");
    }
  }

  function addToCalendar(market, date) {
    downloadIcs(
      {
        uid: `${market.id}-${date}`,
        date,
        title: market.name,
        location: market.city,
        description: `${market.frequency}. ${market.description ?? ""}`.trim(),
        url: siteUrl(marketPath(market)),
      },
      `${market.id}-${date}.ics`
    );
  }

  return (
    <div className="nearby">
      <div className="nearby__head">
        <h3>{title ?? t("nearby.title")}</h3>
        {origin && (
          <p className="nearby__origin">
            {t("nearby.from", { place: origin.label })}{" "}
            <button type="button" onClick={() => (device.position ? forgetPosition() : updateProfile({ city: "" }))}>
              {t("nearby.change")}
            </button>
          </p>
        )}
      </div>

      {!origin && (
        <div className="nearby__ask">
          <p>{t("nearby.ask")}</p>
          <div className="nearby__ask-row">
            <button type="button" className="nearby__locate" onClick={askPosition} disabled={device.status === "asking"}>
              {device.status === "asking" ? t("nearby.locating") : t("nearby.useLocation")}
            </button>
            <form onSubmit={chooseCity} className="nearby__city">
              <input
                type="text"
                list="nearby-cities"
                value={cityDraft}
                onChange={(e) => setCityDraft(e.target.value)}
                placeholder={t("nearby.cityPlaceholder")}
                aria-label={t("nearby.cityPlaceholder")}
              />
              <datalist id="nearby-cities">
                {data?.geo.CITIES.map((city) => (
                  <option key={city.key} value={city.label} />
                ))}
              </datalist>
              <button type="submit">{t("nearby.go")}</button>
            </form>
          </div>
          {device.status === "denied" && <p className="nearby__note">{t("nearby.denied")}</p>}
          <p className="nearby__note">{t("nearby.privacy")}</p>
        </div>
      )}

      {origin && nearest.length > 0 && (
        <ul className="nearby__list">
          {nearest.map(({ market, km, dates }) => (
            <li key={market.id}>
              <div className="nearby__main">
                <Link to={marketPath(market)} className="nearby__name">
                  {market.name}
                </Link>
                <span className="nearby__meta">
                  {market.city} · {t("nearby.km", { km: Math.round(km) })}
                </span>
                <span className="nearby__when">
                  {dates ? t("nearby.next", { dates: dates.map((d) => formatDay(d, lang)).join(" · ") }) : market.frequency}
                </span>
              </div>
              {dates && (
                <button type="button" className="nearby__ics" onClick={() => addToCalendar(market, dates[0])}>
                  {t("nearby.addToCalendar")}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {origin && <p className="nearby__note">{t("nearby.datesNote")}</p>}
    </div>
  );
}
