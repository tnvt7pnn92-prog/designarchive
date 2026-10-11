import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { seoForMarketCity, seoForRoute } from "../lib/seo.js";
import { useDocumentMeta } from "../lib/useDocumentMeta.js";
import { MARKET_ITEMS } from "../data/marketIndex.js";
import { MARKET_COUNT } from "../data/stats.js";
import { CITIES, findCity } from "../lib/geo.js";
import { askPosition, forgetPosition, useDevicePosition } from "../lib/nearby.js";
import { useProfile } from "../lib/profile.js";
import { useToday } from "../lib/today.js";
import { downloadIcs } from "../lib/ics.js";
import { siteUrl } from "../lib/site.js";
import { slugify } from "../lib/slug.js";
import { MARKET_CITIES, cityPath, marketCity, marketPath } from "../lib/marketPlaces.js";
import NotFound from "./NotFound.jsx";
import { DEFAULT_KM, DEFAULT_PERIOD, DISTANCES, KINDS, PERIODS, MAX_KM, addDays, formatAt, globeRadiusKm, haversine, nearestCity, nextDatedAfter, parseAt, planMarkets, searchRadius, topCities, validKm, weekendOf } from "../lib/marketPlanner.js";
import MarketCalendar from "../components/MarketCalendar.jsx";
import "./Markets.css";

// The map (MapLibre) and the world view (three.js) load in their own chunks, when they are shown.
const CityMap = lazy(() => import("../components/CityMap.jsx"));
const MarketsGlobe = lazy(() => import("../components/MarketsGlobe.jsx"));

const CITY_KEY = "design-archive:markets-city";
// Where the planner starts for a first visit, by language: one of the cities with most places.
const DEFAULT_CITY = { it: "milan", fr: "paris", es: "madrid", en: "london", zh: "tokyo" };
const KIND_COLOR = { market: "var(--kind-market)", fair: "var(--kind-fair)", shop: "var(--kind-shop)", sale: "var(--kind-sale)" };
const cityName = (city) => city.label.split(",")[0];
const citySlug = (city) => slugify(cityName(city));
const cityBySlug = (slug) => CITIES.find((city) => citySlug(city) === slug) ?? null;
const cityOfMarket = (market) => CITIES.find((city) => city.key === market.city.split(",")[0].trim().toLowerCase()) ?? null;
const directions = (m) => `https://www.google.com/maps/dir/?api=1&destination=${m.lat},${m.lng}`;
const TOP_CITIES = topCities(MARKET_ITEMS, CITIES, 10);

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function readRemembered() {
  try {
    return localStorage.getItem(CITY_KEY);
  } catch {
    return null;
  }
}

function remember(slug) {
  try {
    localStorage.setItem(CITY_KEY, slug);
  } catch {
    /* storage blocked: the city simply is not remembered */
  }
}

function useDateFormat(lang) {
  return useMemo(() => {
    const locale = lang === "zh" ? "zh-CN" : lang;
    const make = (options) => new Intl.DateTimeFormat(locale, { timeZone: "UTC", ...options });
    const weekday = make({ weekday: "short" });
    const longWeekday = make({ weekday: "long" });
    const dayMonth = make({ day: "numeric", month: "long" });
    const shortMonth = make({ month: "short" });
    const longMonth = make({ month: "long" });
    const at = (key) => new Date(`${key}T00:00:00Z`);
    return {
      weekday: (key) => weekday.format(at(key)).replace(".", ""),
      longWeekday: (key) => longWeekday.format(at(key)),
      dayMonth: (key) => dayMonth.format(at(key)),
      shortMonth: (key) => shortMonth.format(at(key)).replace(".", ""),
      month: (index) => longMonth.format(new Date(Date.UTC(2026, index, 15))),
      range: (from, to) => {
        const a = at(from);
        const b = at(to);
        return a.getUTCMonth() === b.getUTCMonth() ? `${a.getUTCDate()}–${b.getUTCDate()} ${shortMonth.format(b).replace(".", "")}` : `${a.getUTCDate()} ${shortMonth.format(a)} – ${b.getUTCDate()} ${shortMonth.format(b)}`;
      },
    };
  }, [lang]);
}

// A part of the filter sentence: a word underlined in gold that opens a small menu.
function Pick({ id, label, open, onToggle, children, title }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && onToggle(null);
    const onKey = (e) => e.key === "Escape" && onToggle(null);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onToggle]);
  return (
    <span className="mk-pick" ref={ref}>
      <button type="button" className="mk-pick__button" aria-expanded={open} aria-controls={`mk-pick-${id}`} aria-label={`${title}: ${label}`} onClick={() => onToggle(open ? null : id)}>
        {label}
      </button>
      {open && (
        <span id={`mk-pick-${id}`} className="mk-pick__menu" role="group" aria-label={title}>
          {children}
        </span>
      )}
    </span>
  );
}

// A place as a ticket: the stub with its next date (or "always open"), the body with what it is,
// how far, and what to do about it.
// A place as a ticket. `selected`: picked on the map, so it stands out from the list. `onClose`:
// the same ticket shown as a card over the full-screen map (no id there: the list keeps it).
function Ticket({ entry, hot, selected = false, onClose, onHover, fmt, t, today }) {
  const { market, schedule } = entry;
  const dates = entry.dates ?? [];
  const first = dates[0];

  function addToCalendar() {
    downloadIcs(
      { uid: `${market.id}-${first}`, date: first, title: market.name, location: market.city, description: `${market.frequency}. ${market.description ?? ""}`.trim(), url: siteUrl(marketPath(market)) },
      `${market.id}-${first}.ics`
    );
  }

  return (
    <article
      id={onClose ? undefined : `market-${market.id}`}
      className={`mk-ticket${hot ? " is-hot" : ""}${selected ? " is-selected" : ""}${onClose ? " is-card" : ""}`}
      style={{ "--kind": KIND_COLOR[market.kind] }}
      onMouseEnter={() => onHover(market.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(market.id)}
      onBlur={() => onHover(null)}
    >
      {onClose && (
        <button type="button" className="mk-ticket__close" onClick={onClose} aria-label={t("lightbox.close")}>
          ×
        </button>
      )}
      <div className="mk-ticket__stub" aria-hidden={schedule.type === "dates" ? undefined : "true"}>
        {schedule.type === "dates" && first ? (
          <>
            <span className="mk-ticket__dow">{fmt.weekday(first)}</span>
            <span className="mk-ticket__day">{Number(first.slice(8))}</span>
            <span className="mk-ticket__mon">{fmt.shortMonth(first)}{first.slice(0, 4) !== today.slice(0, 4) ? ` ${first.slice(0, 4)}` : ""}</span>
          </>
        ) : schedule.type === "months" ? (
          <>
            <span className="mk-ticket__dow">{t(schedule.biennial ? "markets.planner.everyTwoYears" : "markets.planner.everyYear")}</span>
            <span className="mk-ticket__word">{fmt.month(schedule.months[0])}</span>
          </>
        ) : schedule.type === "open" ? (
          <>
            <span className="mk-ticket__dow">{t("markets.planner.open")}</span>
            <span className="mk-ticket__word">{t("markets.planner.always")}</span>
          </>
        ) : (
          <>
            <span className="mk-ticket__dow">{t("markets.planner.dates")}</span>
            <span className="mk-ticket__word">{t("markets.planner.toCheck")}</span>
          </>
        )}
      </div>
      <div className="mk-ticket__body">
        <p className="mk-ticket__meta">
          <span className="mk-ticket__kind">{t(`markets.kindLabels.${market.kind}`)}</span>
          <span>{t("markets.planner.km", { km: entry.km < 10 ? entry.km.toFixed(1).replace(".", t("markets.planner.decimal")) : Math.round(entry.km) })}</span>
        </p>
        <h3>
          <Link to={marketPath(market)}>{market.name}</Link>
        </h3>
        {market.description && <p className="mk-ticket__desc">{market.description}</p>}
        <p className="mk-ticket__when">
          {market.frequency}
          {schedule.type === "dates" && dates.length > 1 && ` · ${t("markets.planner.then", { dates: dates.slice(1, 3).map(fmt.dayMonth).join(", ") })}`}
          {schedule.type === "open" && ` · ${t("markets.planner.hoursToCheck")}`}
        </p>
        <div className="mk-ticket__actions">
          {schedule.type === "dates" && first && (
            <button type="button" onClick={addToCalendar} aria-label={`${t("nearby.addToCalendar")}: ${market.name}, ${fmt.dayMonth(first)}`}>
              {t("nearby.addToCalendar")}
            </button>
          )}
          <a href={directions(market)} target="_blank" rel="noreferrer" aria-label={`${t("markets.planner.directions")}: ${market.name}`}>
            {t("markets.planner.directions")} ↗
          </a>
        </div>
      </div>
    </article>
  );
}

// "Where are we hunting this weekend?": a planner, not a planisphere. A sentence sets the
// starting city, the distance and the period (all kept in the address, so a plan can be shared);
// a line sums up the weekend; the places follow as tickets beside a map of the city. The globe is
// the "World" view, for choosing a city far away.
export default function Markets() {
  const { city: routeCity } = useParams();
  const routeEntry = routeCity ? marketCity(routeCity) : null;
  useDocumentMeta(routeEntry ? seoForMarketCity(routeEntry) : seoForRoute("/markets"));
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const fmt = useDateFormat(lang);
  const { today } = useToday();
  const profile = useProfile();
  const device = useDevicePosition();
  const [params, setParams] = useSearchParams();
  const [pick, setPick] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [cityDraft, setCityDraft] = useState("");
  const [useDevice, setUseDevice] = useState(false);
  const mapBox = useRef(null);
  const [mapNear, setMapNear] = useState(() => typeof IntersectionObserver === "undefined");
  const [webgl] = useState(supportsWebGL);

  // ---- the plan, from the address (with sensible defaults) ----
  const marketParam = params.get("market");
  const focusMarket = marketParam ? MARKET_ITEMS.find((m) => m.id === marketParam) : null;
  const profileCity = profile.city ? findCity(profile.city) : null;
  // A city page (/markets/milan) starts there; the planner itself from the address, the last city
  // chosen, the profile, or a default for the language.
  const routeCityEntry = routeEntry && (cityBySlug(routeEntry.slug) ?? { key: routeEntry.slug, label: `${routeEntry.name}, ${routeEntry.country}`, lat: routeEntry.lat, lng: routeEntry.lng });
  const city =
    routeCityEntry ??
    cityBySlug(params.get("city") ?? "") ??
    (focusMarket && cityOfMarket(focusMarket)) ??
    cityBySlug(readRemembered() ?? "") ??
    profileCity ??
    CITIES.find((c) => c.key === (DEFAULT_CITY[lang] ?? "london"));
  const devicePosition = useDevice ? device.position : null;
  // A point chosen with "search this area" (?at=lat,lng) comes before the city and the device.
  const at = parseAt(params.get("at"));
  const atLat = at?.lat;
  const atLng = at?.lng;
  const origin = useMemo(
    () =>
      atLat !== undefined
        ? { lat: atLat, lng: atLng }
        : devicePosition
          ? { lat: devicePosition.lat, lng: devicePosition.lng }
          : { lat: city.lat, lng: city.lng },
    [atLat, atLng, devicePosition, city.lat, city.lng]
  );
  const kmParam = Number(params.get("km"));
  const km = validKm(kmParam)
    ? kmParam
    : focusMarket
      ? (DISTANCES.find((d) => d >= haversine(origin, focusMarket)) ?? 50)
      : DEFAULT_KM;
  const when = PERIODS.includes(params.get("when")) ? params.get("when") : focusMarket ? "all" : DEFAULT_PERIOD;
  const kinds = (params.get("kinds") ?? "").split(",").filter((k) => KINDS.includes(k));
  const chosenKinds = kinds.length ? kinds : KINDS;
  const world = params.get("view") === "world";

  const update = useCallback(
    (changes) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("market");
          for (const [key, value] of Object.entries(changes)) {
            if (value === null || value === undefined || value === "") next.delete(key);
            else next.set(key, String(value));
          }
          return next;
        },
        { replace: true }
      ),
    [setParams]
  );

  function chooseCity(next) {
    setUseDevice(false);
    forgetPosition();
    remember(citySlug(next));
    setPick(null);
    // The city goes into the path (a page of its own); distance, period and kinds come along.
    const keep = new URLSearchParams(params);
    for (const key of ["city", "view", "market", "at"]) keep.delete(key);
    const query = keep.toString();
    if (marketCity(citySlug(next))) navigate(`${cityPath(citySlug(next))}${query ? `?${query}` : ""}`);
    else update({ city: citySlug(next), view: null, at: null });
  }

  // ---- the places ----
  const kindsKey = chosenKinds.join();
  const calendarKinds = useMemo(() => kindsKey.split(","), [kindsKey]);
  const plan = useMemo(() => planMarkets(MARKET_ITEMS, { origin, km, when, kinds: kindsKey.split(","), today }), [origin, km, when, kindsKey, today]);
  const weekend = useMemo(() => weekendOf(today), [today]);
  const weekendPlan = useMemo(() => planMarkets(MARKET_ITEMS, { origin, km, when: "weekend", kinds: KINDS, today }), [origin, km, today]);
  const nextAfter = useMemo(() => nextDatedAfter(MARKET_ITEMS, { origin, km, kinds: ["market", "fair", "sale"], today: addDays(weekend.to, 1) }), [origin, km, weekend.to]);
  const mapEntries = useMemo(() => [...plan.dated, ...plan.yearly, ...plan.open, ...plan.unknown], [plan]);
  const mapPlaces = useMemo(() => mapEntries.map((e) => e.market), [mapEntries]);
  // The world view shows the kinds chosen, like the list; its chips count the whole world.
  const worldMarkets = useMemo(() => MARKET_ITEMS.filter((m) => kindsKey.split(",").includes(m.kind)), [kindsKey]);
  const worldCounts = useMemo(() => Object.fromEntries(KINDS.map((kind) => [kind, MARKET_ITEMS.filter((m) => m.kind === kind).length])), []);

  function toggleKind(kind) {
    const next = chosenKinds.includes(kind) ? chosenKinds.filter((k) => k !== kind) : [...chosenKinds, kind];
    if (next.length) update({ kinds: next.length === KINDS.length ? null : KINDS.filter((k) => next.includes(k)).join(",") });
  }

  // "Search this area": where the visitor has moved the map (or turned the globe) to. It belongs
  // to the search it was moved from: a new origin or distance makes it stale on its own.
  const searchKey = `${origin.lat},${origin.lng},${km},${world}`;
  const [moved, setMoved] = useState(null);
  const view = moved?.key === searchKey ? moved : null;
  // The circle to search is what the frame shows: on the globe worked out from the camera.
  const viewKm = view ? searchRadius(world ? globeRadiusKm(view.altitude, view.aspect) : view.radiusKm) : null;
  const offerHere = view
    ? world
      ? globeRadiusKm(view.altitude, view.aspect) <= MAX_KM * 1.5
      : haversine(origin, view) > view.radiusKm * 0.25 || Math.abs(viewKm - km) > km * 0.25
    : false;
  function searchHere() {
    if (!view) return;
    const nextKm = viewKm;
    setUseDevice(false);
    setMoved(null);
    update({ at: formatAt(view), km: nextKm === DEFAULT_KM ? null : nextKm, view: null });
  }

  // Full screen: the browser's own where it has it, otherwise the map simply covers the window.
  // Esc and the button leave it either way.
  const mapEl = useRef(null);
  const [full, setFull] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  function toggleFull() {
    const el = mapEl.current;
    if (full) {
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
      setFull(false);
      return;
    }
    setFull(true);
    el?.requestFullscreen?.().catch(() => {});
  }
  useEffect(() => {
    if (!full) return undefined;
    const onChange = () => !document.fullscreenElement && setFull(false);
    // Esc closes the card first, then the full screen.
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      if (selectedId) setSelectedId(null);
      else setFull(false);
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("keydown", onKey);
    };
  }, [full, selectedId]);

  // The map mounts once its frame comes near the screen (on a phone it is at the top: at once).
  useEffect(() => {
    const node = mapBox.current;
    if (mapNear || !node) return undefined;
    const observer = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setMapNear(true), { rootMargin: "200px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [mapNear]);

  // An old link to one market (/markets?market=…) lands on its ticket.
  useEffect(() => {
    if (!focusMarket) return;
    setHoveredId(focusMarket.id);
    requestAnimationFrame(() => document.getElementById(`market-${focusMarket.id}`)?.scrollIntoView({ block: "center" }));
  }, [focusMarket]);

  // A place picked on the map (or the calendar): its ticket stands out from the list and comes into
  // view; in full screen, where the list is out of sight, it opens as a card over the map.
  // Clicking the map's empty ground, Esc or a change of search lets it go.
  const selectedEntry = selectedId ? (mapEntries.find((e) => e.market.id === selectedId) ?? null) : null;
  function selectFromMap(id) {
    setSelectedId(id ?? null);
    if (!id) return;
    setHoveredId(id);
    if (full) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(`market-${id}`)?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  }
  useEffect(() => {
    if (!selectedId || full) return undefined;
    const onKey = (event) => event.key === "Escape" && setSelectedId(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selectedId, full]);

  // ---- words ----
  const areaCity = at ? nearestCity(at, CITIES) : null;
  const placeName = at
    ? areaCity
      ? t("markets.planner.areaNear", { place: cityName(areaCity) })
      : t("markets.planner.mapArea")
    : useDevice && device.position
      ? t("markets.planner.yourPosition")
      : cityName(city);
  const kindWords = chosenKinds.map((k) => t(`markets.planner.kindsPlural.${k}`));
  const kindsLabel = kindWords.length > 1 ? `${kindWords.slice(0, -1).join(", ")} ${t("merge.and")} ${kindWords.at(-1)}` : kindWords[0];
  const pieces = {
    kinds: (
      <Pick key="kinds" id="kinds" title={t("markets.planner.pickKinds")} label={kindsLabel} open={pick === "kinds"} onToggle={setPick}>
        {KINDS.map((kind) => (
          <label key={kind} className="mk-pick__option">
            <input
              type="checkbox"
              checked={chosenKinds.includes(kind)}
              disabled={chosenKinds.length === 1 && chosenKinds.includes(kind)}
              onChange={() => {
                const next = chosenKinds.includes(kind) ? chosenKinds.filter((k) => k !== kind) : [...chosenKinds, kind];
                update({ kinds: next.length === KINDS.length ? null : KINDS.filter((k) => next.includes(k)).join(",") });
              }}
            />
            <span className="mk-dot" style={{ "--kind": KIND_COLOR[kind] }} aria-hidden="true" />
            {t(`markets.kinds.${kind}`)}
          </label>
        ))}
      </Pick>
    ),
    city: (
      <Pick key="city" id="city" title={t("markets.planner.pickCity")} label={placeName} open={pick === "city"} onToggle={setPick}>
        <button
          type="button"
          className="mk-pick__option"
          onClick={() => {
            askPosition();
            setUseDevice(true);
            setPick(null);
            update({ at: null });
          }}
        >
          {device.status === "asking" ? t("nearby.locating") : t("nearby.useLocation")}
        </button>
        {profileCity && (
          <button type="button" className="mk-pick__option" onClick={() => chooseCity(profileCity)}>
            {t("markets.planner.profileCity", { city: cityName(profileCity) })}
          </button>
        )}
        {TOP_CITIES.map((c) => (
          <button key={c.key} type="button" className="mk-pick__option" aria-pressed={!useDevice && c.key === city.key} onClick={() => chooseCity(c)}>
            {cityName(c)} <span className="mk-pick__count">{t("markets.planner.places", { count: c.count })}</span>
          </button>
        ))}
        <form
          className="mk-pick__search"
          onSubmit={(e) => {
            e.preventDefault();
            const found = findCity(cityDraft);
            if (found) {
              setCityDraft("");
              chooseCity(found);
            }
          }}
        >
          <input list="mk-cities" value={cityDraft} onChange={(e) => setCityDraft(e.target.value)} placeholder={t("nearby.cityPlaceholder")} aria-label={t("nearby.cityPlaceholder")} />
          <datalist id="mk-cities">
            {CITIES.map((c) => (
              <option key={c.key} value={c.label} />
            ))}
          </datalist>
          <button type="submit">{t("nearby.go")}</button>
        </form>
        {device.status === "denied" && <span className="mk-pick__note">{t("nearby.denied")}</span>}
      </Pick>
    ),
    km: (
      <Pick key="km" id="km" title={t("markets.planner.pickDistance")} label={t("markets.planner.km", { km })} open={pick === "km"} onToggle={setPick}>
        {DISTANCES.map((d) => (
          <button key={d} type="button" className="mk-pick__option" aria-pressed={d === km} onClick={() => (update({ km: d === DEFAULT_KM ? null : d }), setPick(null))}>
            {t("markets.planner.km", { km: d })}
          </button>
        ))}
      </Pick>
    ),
    when: (
      <Pick key="when" id="when" title={t("markets.planner.pickPeriod")} label={t(`markets.planner.when.${when}`)} open={pick === "when"} onToggle={setPick}>
        {PERIODS.map((p) => (
          <button key={p} type="button" className="mk-pick__option" aria-pressed={p === when} onClick={() => (update({ when: p === DEFAULT_PERIOD ? null : p }), setPick(null))}>
            {t(`markets.planner.when.${p}`)}
          </button>
        ))}
      </Pick>
    ),
  };
  // The sentence comes from the dictionary with {kinds} {city} {km} {when} slots, so every
  // language keeps its own word order.
  const sentence = t("markets.planner.sentence")
    .split(/(\{kinds\}|\{city\}|\{km\}|\{when\})/)
    .map((part, i) => pieces[part.slice(1, -1)] ?? <span key={i}>{part}</span>);

  // The weekend, in one line.
  const weekendMarkets = weekendPlan.dated.filter((e) => e.market.kind !== "shop");
  const openCount = weekendPlan.open.length;
  const dayWord = (key) => fmt.longWeekday(key);
  const summary = weekendMarkets.length ? (
    <>
      {t("markets.planner.summaryWeekend", { place: placeName })}{" "}
      {weekendMarkets.slice(0, 4).map((e, i) => (
        <span key={e.market.id}>
          {i > 0 && ", "}
          <b>{e.market.name}</b> ({e.dates.map(dayWord).join(t("markets.planner.andShort"))})
        </span>
      ))}
      {weekendMarkets.length > 4 && ` ${t("markets.planner.andMore", { count: weekendMarkets.length - 4 })}`}
      {openCount > 0 && `, ${t("markets.planner.summaryOpen", { count: openCount })}`}.
      {nextAfter && (
        <>
          {" "}
          {t("markets.planner.summaryNext")} <b>{nextAfter.market.name}</b>, {fmt.dayMonth(nextAfter.date)}.
        </>
      )}
    </>
  ) : (
    <>
      {t("markets.planner.summaryNone", { place: placeName })}
      {openCount > 0 && ` ${t("markets.planner.summaryOnlyOpen", { count: openCount })}`}
      {nextAfter ? (
        <>
          {" "}
          {t("markets.planner.summaryNearest")} <b>{nextAfter.market.name}</b>, {fmt.dayMonth(nextAfter.date)}.
        </>
      ) : (
        ` ${t("markets.planner.summaryWider")}`
      )}
    </>
  );

  const groups = [
    ["dated", "markets.planner.groupDated"],
    ["yearly", "markets.planner.groupYearly"],
    ["open", "markets.planner.groupOpen"],
    ["unknown", "markets.planner.groupUnknown"],
  ].filter(([key]) => plan[key].length);

  if (routeCity && !routeEntry) return <NotFound />;

  return (
    <div className="markets-page">
      <section className="container mk-intro">
        <p className="mk-note">{t("markets.planner.note", { count: MARKET_COUNT })}</p>
        {/* A city page searching an area of the map is no longer that city's page. */}
        {routeEntry && !at ? (
          <h1>{t("markets.planner.cityTitle", { place: routeEntry.name })}</h1>
        ) : (
          <h1>
            {t("markets.planner.title1")} <em>{t("markets.planner.title2")}</em> {t("markets.planner.title3")}
          </h1>
        )}
        <p className="mk-sentence">{sentence}</p>
        <div className="mk-chips">
          <div className="mk-chips__group" role="group" aria-label={t("markets.planner.pickPeriod")}>
            {PERIODS.filter((p) => p !== "7").map((p) => (
              <button key={p} type="button" className="mk-chip" aria-pressed={p === when} onClick={() => update({ when: p === DEFAULT_PERIOD ? null : p })}>
                {t(`markets.planner.chip.${p}`)}
                {p === "weekend" && <span className="mk-chip__n">{fmt.range(weekend.saturday, weekend.sunday)}</span>}
              </button>
            ))}
          </div>
          <div className="mk-chips__group" role="group" aria-label={t("markets.planner.pickKinds")}>
            {KINDS.map((kind) => (
              <button
                key={kind}
                type="button"
                className="mk-chip"
                aria-pressed={chosenKinds.includes(kind)}
                onClick={() => toggleKind(kind)}
              >
                <span className="mk-dot" style={{ "--kind": KIND_COLOR[kind] }} aria-hidden="true" />
                {t(`markets.kinds.${kind}`)}
                <span className="mk-chip__n">{plan.counts[kind]}</span>
              </button>
            ))}
          </div>
        </div>
        <p className="mk-summary" aria-live="polite">
          {summary}
        </p>
      </section>

      <div className="container mk-split">
        <div className={`mk-list${selectedEntry && !full ? " has-selection" : ""}`}>
          {groups.length === 0 && <p className="mk-empty">{t("markets.planner.empty")}</p>}
          {groups.map(([key, title]) => (
            <section key={key} className="mk-group" aria-label={t(title)}>
              <h2 className="mk-group__title">
                {t(title)} <span>{plan[key].length}</span>
              </h2>
              {plan[key].map((entry) => (
                <Ticket key={entry.market.id} entry={entry} hot={hoveredId === entry.market.id} selected={selectedEntry?.market.id === entry.market.id} onHover={setHoveredId} fmt={fmt} t={t} today={today} />
              ))}
            </section>
          ))}
        </div>

        <div className="mk-mapbox" ref={mapBox}>
          <div className={`mk-map${full ? " is-full" : ""}`} ref={mapEl} role={full ? "dialog" : undefined} aria-modal={full || undefined} aria-label={full ? t("markets.planner.mapLabel", { place: placeName }) : undefined}>
            {world && !webgl ? (
              <p className="mk-map__wait">{t("markets.globe.unsupported")}</p>
            ) : world ? (
              <Suspense fallback={<p className="mk-map__wait">{t("markets.globe.loading")}</p>}>
                <MarketsGlobe
                  markets={worldMarkets}
                  selectedId={null}
                  hoveredId={null}
                  focus={null}
                  start={city}
                  autoRotate={false}
                  t={t}
                  lang={lang}
                  onSelect={(id) => {
                    const market = MARKET_ITEMS.find((m) => m.id === id);
                    const next = market && cityOfMarket(market);
                    if (next) chooseCity(next);
                  }}
                  onPickCluster={(members) => {
                    const next = members[0] && cityOfMarket(members[0]);
                    if (next) chooseCity(next);
                  }}
                  onView={(pov) => setMoved({ key: searchKey, lat: pov.lat, lng: pov.lng, altitude: pov.altitude })}
                />
              </Suspense>
            ) : mapNear ? (
              <Suspense fallback={<p className="mk-map__wait">{t("markets.planner.mapLoading")}</p>}>
                <CityMap
                  origin={origin}
                  km={km}
                  places={mapPlaces}
                  hoveredId={hoveredId ?? selectedEntry?.market.id ?? null}
                  onHover={setHoveredId}
                  onSelect={selectFromMap}
                  onMoved={(area) => setMoved({ key: searchKey, ...area })}
                  label={t("markets.planner.mapLabel", { place: placeName })}
                  failedText={t("markets.planner.mapFailed")}
                />
              </Suspense>
            ) : (
              <p className="mk-map__wait">{t("markets.planner.mapLoading")}</p>
            )}
            {world && <p className="mk-map__hint">{t("markets.planner.worldHint")}</p>}
            {full && !world && selectedEntry && (
              <div className="mk-map__card">
                <Ticket entry={selectedEntry} hot={false} onClose={() => setSelectedId(null)} onHover={setHoveredId} fmt={fmt} t={t} today={today} />
              </div>
            )}
            {offerHere && (
              <button type="button" className="mk-map__here" onClick={searchHere}>
                {world ? t("markets.planner.searchHereGlobe") : t("markets.planner.searchHere")}
              </button>
            )}
            <div className="mk-map__tools">
              <button type="button" className="mk-map__world" onClick={() => update({ view: world ? null : "world" })}>
                {world ? t("markets.planner.backToCity", { place: at ? placeName : cityName(city) }) : t("markets.planner.worldView")}
              </button>
              <button type="button" className="mk-map__world" aria-pressed={full} onClick={toggleFull}>
                {full ? t("markets.planner.mapExitFull") : t("markets.planner.mapFull")}
              </button>
            </div>
            {/* On the world and in full screen the chips above are out of sight: the kinds come along. */}
            {(world || full) && (
              <div className="mk-map__kinds" role="group" aria-label={t("markets.planner.pickKinds")}>
                {KINDS.map((kind) => (
                  <button key={kind} type="button" className="mk-chip" aria-pressed={chosenKinds.includes(kind)} onClick={() => toggleKind(kind)}>
                    <span className="mk-dot" style={{ "--kind": KIND_COLOR[kind] }} aria-hidden="true" />
                    {t(`markets.kinds.${kind}`)}
                    <span className="mk-chip__n">{world ? worldCounts[kind] : plan.counts[kind]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="mk-legend">
            {KINDS.map((kind) => (
              <span key={kind}>
                <span className="mk-dot" style={{ "--kind": KIND_COLOR[kind] }} aria-hidden="true" />
                {t(`markets.kinds.${kind}`)}
              </span>
            ))}
            {!world && <span>◎ {placeName}</span>}
          </p>
        </div>
      </div>
      <div className="container">
        <MarketCalendar origin={origin} km={km} kinds={calendarKinds} place={placeName} today={today} lang={lang} t={t} onPick={selectFromMap} />

        <section className="mk-cities" aria-labelledby="mk-cities-title">
          <h2 id="mk-cities-title">{t("markets.planner.citiesTitle")}</h2>
          <ul>
            {MARKET_CITIES.filter((c) => c.slug !== citySlug(city))
              .slice(0, 12)
              .map((c) => (
                <li key={c.slug}>
                  <Link to={cityPath(c.slug)}>
                    <b>{c.name}</b>
                    <span>{t("markets.planner.places", { count: c.count })}</span>
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
