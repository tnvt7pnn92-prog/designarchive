import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { seoForRoute } from "../lib/seo.js";
import { useDocumentMeta } from "../lib/useDocumentMeta.js";
import { useReducedMotion } from "../lib/motion.js";
import { KIND_COLORS } from "../lib/marketFilters.js";
import { MARKETS } from "../data/markets.js";
import { MARKETS_HERO, commonsPage, commonsSrcSet, commonsThumb, marketPhoto } from "../data/marketPhotos.js";
import { CATEGORIES, FEATURED, countryName, filterMarkets, geography, mainCategory, specialtiesOf } from "../lib/marketGuide.js";
import { MARKET_CITIES, cityNameOf, cityPath, countryOf, marketCity, marketPath } from "../lib/marketPlaces.js";
import MarketContactDialog from "../components/MarketContactDialog.jsx";
import "./MarketsGuide.css";

// The weekend planner (city, distance, dates, map) keeps the addresses it always had: an old link
// to /markets?city=…&km=… still opens it.
const Planner = lazy(() => import("./Markets.jsx"));
// The world map of the band: its own chunk (the land outlines and topojson), loaded near the screen.
const MarketsWorldMap = lazy(() => import("../components/MarketsWorldMap.jsx"));
const PLANNER_PARAMS = ["city", "km", "when", "kinds", "at", "view", "market"];

const PAGE = 12;
const KIND_COLOR = { market: "var(--kind-market)", fair: "var(--kind-fair)", shop: "var(--kind-shop)", sale: "var(--kind-sale)" };
// Where "Plan the weekend" starts: the last city planned, or one of the largest for the language.
const DEFAULT_CITY = { it: "milan", fr: "paris", es: "madrid", en: "london", zh: "tokyo" };
const byId = new Map(MARKETS.map((m) => [m.id, m]));
const COUNTRY_COUNT = new Set(MARKETS.map(countryOf)).size;

function rememberedCity() {
  try {
    return localStorage.getItem("design-archive:markets-city");
  } catch {
    return null;
  }
}

export default function MarketsGuide() {
  const [params] = useSearchParams();
  if (PLANNER_PARAMS.some((key) => params.has(key))) {
    return (
      <Suspense fallback={<div className="route-loading" />}>
        <Planner />
      </Suspense>
    );
  }
  return <Guide />;
}

// /markets: an international guide, edited like a magazine. A cover with the search, the six ways
// in, the places worth the journey, the map of countries and cities, then the whole guide with
// its filters, and the two doors for shops and readers.
function Guide() {
  useDocumentMeta(seoForRoute("/markets"));
  const { t, lang } = useLanguage();
  const [params, setParams] = useSearchParams();
  const [dialog, setDialog] = useState(null);
  const [draft, setDraft] = useState(params.get("q") ?? "");
  const directory = useRef(null);

  const query = params.get("q") ?? "";
  const category = CATEGORIES.some((c) => c.key === params.get("type")) ? params.get("type") : "";
  const country = params.get("country") ?? "";
  const town = params.get("town") ?? "";
  const order = params.get("order") === "az" ? "az" : "editorial";

  function update(changes, { scroll = false } = {}) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(changes)) {
          if (!value) next.delete(key);
          else next.set(key, value);
        }
        return next;
      },
      { replace: true }
    );
    if (scroll) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      requestAnimationFrame(() => directory.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }));
    }
  }

  const geo = useMemo(() => geography(MARKETS), []);
  const countries = useMemo(() => geo.flatMap((r) => r.countries).sort((a, b) => countryName(a.sample, lang).localeCompare(countryName(b.sample, lang), lang)), [geo, lang]);
  const cities = useMemo(() => countries.find((c) => c.key === country)?.cities ?? [], [countries, country]);
  const results = useMemo(() => filterMarkets(MARKETS, { query, category, country, city: town, order, lang }), [query, category, country, town, order, lang]);
  const counts = useMemo(() => Object.fromEntries(CATEGORIES.map((c) => [c.key, MARKETS.filter(c.test).length])), []);
  const featured = FEATURED.map((id) => byId.get(id)).filter(Boolean);
  const navigate = useNavigate();
  const reduced = useReducedMotion();

  // The band's map loads when the band comes near the screen.
  const mapBand = useRef(null);
  const [mapNear, setMapNear] = useState(false);
  useEffect(() => {
    const el = mapBand.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && (setMapNear(true), observer.disconnect()), { rootMargin: "300px 0px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Each region opens the map at its city with most places.
  const regionCities = useMemo(
    () =>
      geo.map((r) => {
        const top = r.countries.flatMap((c) => c.cities.map((city) => ({ ...city, country: c.key }))).sort((a, b) => b.count - a.count)[0];
        const slug = top && MARKET_CITIES.find((mc) => mc.name === top.name && mc.country === top.country)?.slug;
        return { region: r.region, count: r.countries.reduce((sum, c) => sum + c.count, 0), slug, city: top?.name };
      }),
    [geo]
  );
  // A new search or filter starts the list from the top.
  const listKey = `${query}|${category}|${country}|${town}|${order}`;
  const [shown, setShown] = useState({ key: listKey, count: PAGE });
  const visible = shown.key === listKey ? shown.count : PAGE;

  const remembered = rememberedCity();
  const planSlug = remembered && marketCity(remembered) ? remembered : (DEFAULT_CITY[lang] ?? "london");
  const filtering = Boolean(query || category || country || town || order !== "editorial");
  const number = (n) => n.toLocaleString(lang === "zh" ? "zh-CN" : lang);

  return (
    <div className="mg">
      {/* ---------- the cover ---------- */}
      <header className="mg-hero">
        <img
          className="mg-hero__photo"
          src={commonsThumb(MARKETS_HERO, 1280)}
          srcSet={commonsSrcSet(MARKETS_HERO)}
          sizes="100vw"
          alt=""
          fetchPriority="high"
          decoding="async"
        />
        <div className="container mg-hero__inner">
          <p className="mg-eyebrow">{t("markets.guide.eyebrow")}</p>
          <h1>{t("markets.guide.title")}</h1>
          <p className="mg-hero__lede">{t("markets.guide.subtitle")}</p>
          <form
            className="mg-search"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              update({ q: draft.trim() }, { scroll: true });
            }}
          >
            <input type="search" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t("markets.guide.searchPlaceholder")} aria-label={t("markets.guide.searchPlaceholder")} />
            <button type="submit">{t("markets.guide.searchButton")}</button>
          </form>
          <p className="mg-hero__facts">
            <span>{t("markets.guide.facts", { places: number(MARKETS.length), countries: COUNTRY_COUNT, cities: MARKET_CITIES.length })}</span>
          </p>
        </div>
        <a className="mg-hero__credit" href={commonsPage(MARKETS_HERO)} target="_blank" rel="noreferrer">
          {MARKETS_HERO.caption} · {t("markets.guide.photoCredit", { author: MARKETS_HERO.author, license: MARKETS_HERO.license })}
        </a>
      </header>

      {/* ---------- the map: every place a dot, the way into the planner ---------- */}
      <section className="mg-mapband" id="mg-map" ref={mapBand} aria-labelledby="mg-map-title">
        <div className="container">
          <div className="mg-mapband__head">
            <div>
              <p className="mg-eyebrow">{t("markets.guide.mapEyebrow")}</p>
              <h2 id="mg-map-title" className="mg-title">
                {t("markets.guide.mapTitle", { count: number(MARKETS.length) })}
              </h2>
            </div>
            <div className="mg-mapband__intro">
              <p>{t("markets.guide.mapText")}</p>
              <div className="mg-mapband__actions">
                <Link to="/markets?view=world" className="mg-mapband__open">
                  {t("markets.guide.mapOpen")} →
                </Link>
                <Link to={cityPath(planSlug)} className="mg-mapband__plan">
                  {t("markets.guide.mapPlanIn", { city: marketCity(planSlug)?.name ?? planSlug })}
                </Link>
              </div>
            </div>
          </div>
          <div className="mg-mapband__map">
            {mapNear && (
              <Suspense fallback={null}>
                <MarketsWorldMap markets={MARKETS} onOpen={(m) => navigate(marketPath(m))} label={t("markets.guide.mapLabel", { count: number(MARKETS.length) })} still={reduced} />
              </Suspense>
            )}
          </div>
          <div className="mg-mapband__foot">
            <p className="mg-mapband__legend">
              {["market", "fair", "shop", "sale"].map((kind) => (
                <span key={kind}>
                  <i style={{ background: KIND_COLORS[kind] }} aria-hidden="true" />
                  {t(`markets.kinds.${kind}`)}
                </span>
              ))}
              <span className="mg-mapband__hint">{t("markets.guide.mapHint")}</span>
            </p>
            <nav className="mg-mapband__regions" aria-label={t("markets.guide.mapRegions")}>
              <span>{t("markets.guide.mapRegions")}</span>
              {regionCities
                .filter((r) => r.slug)
                .map((r) => (
                  <Link key={r.region} to={cityPath(r.slug)}>
                    {t(`markets.regions.${r.region}`)} <b>{number(r.count)}</b>
                  </Link>
                ))}
            </nav>
          </div>
        </div>
      </section>

      {/* ---------- six ways in ---------- */}
      <section className="container mg-section" aria-labelledby="mg-cats">
        <p className="mg-eyebrow">{t("markets.guide.catsEyebrow")}</p>
        <h2 id="mg-cats" className="mg-title">
          {t("markets.guide.catsTitle")}
        </h2>
        <ol className="mg-cats">
          {CATEGORIES.map((c, i) => (
            <li key={c.key}>
              <button type="button" className="mg-cat" aria-pressed={category === c.key} onClick={() => update({ type: category === c.key ? "" : c.key }, { scroll: true })}>
                <span className="mg-cat__n">{String(i + 1).padStart(2, "0")}</span>
                <span className="mg-cat__name">{t(`markets.categories.${c.key}.name`)}</span>
                <span className="mg-cat__text">{t(`markets.categories.${c.key}.text`)}</span>
                <span className="mg-cat__count">{t("markets.guide.count", { count: number(counts[c.key]) })} →</span>
              </button>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------- places worth the journey ---------- */}
      <section className="section-light mg-featured" aria-labelledby="mg-featured">
        <div className="container">
          <div className="mg-featured__head">
            <div>
              <p className="mg-eyebrow">{t("markets.guide.featuredEyebrow")}</p>
              <h2 id="mg-featured" className="mg-title">
                {t("markets.guide.featuredTitle")}
              </h2>
            </div>
            <p className="mg-featured__note">{t("markets.guide.featuredNote")}</p>
          </div>
          <ul className="mg-places">
            {featured.map((m, i) => {
              const photo = marketPhoto(m.id);
              return (
                <li key={m.id} className={`mg-place${i === 0 ? " mg-place--lead" : ""}`}>
                  <Link to={marketPath(m)} className="mg-place__link">
                    {photo && (
                      <span className="mg-place__photo">
                        <img src={commonsThumb(photo, i === 0 ? 1280 : 960)} srcSet={commonsSrcSet(photo)} sizes={i === 0 ? "(max-width: 900px) 100vw, 60vw" : "(max-width: 600px) 100vw, (max-width: 900px) 50vw, 30vw"} alt={`${m.name}, ${cityNameOf(m)}`} loading="lazy" decoding="async" />
                      </span>
                    )}
                    <span className="mg-place__meta">
                      {t(`markets.categories.${mainCategory(m)}.name`)} · {cityNameOf(m)}, {countryName(m, lang)}
                    </span>
                    <span className="mg-place__name">{m.name}</span>
                    {m.description && <span className="mg-place__text">{m.description}</span>}
                    <span className="mg-place__open">{t("markets.guide.open")} →</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ---------- the whole guide ---------- */}
      <section className="container mg-section mg-directory" id="mg-directory" ref={directory} aria-labelledby="mg-dir">
        <p className="mg-eyebrow">{t("markets.guide.dirEyebrow")}</p>
        <h2 id="mg-dir" className="mg-title">
          {t("markets.guide.dirTitle")}
        </h2>
        <div className="mg-filters">
          <label className="mg-filter mg-filter--search">
            <span>{t("markets.guide.searchButton")}</span>
            <input type="search" value={query} placeholder={t("markets.guide.searchPlaceholder")} onChange={(e) => (setDraft(e.target.value), update({ q: e.target.value }))} />
          </label>
          <label className="mg-filter">
            <span>{t("markets.guide.filterKind")}</span>
            <select value={category} onChange={(e) => update({ type: e.target.value })}>
              <option value="">{t("markets.guide.all")}</option>
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {t(`markets.categories.${c.key}.name`)}
                </option>
              ))}
            </select>
          </label>
          <label className="mg-filter">
            <span>{t("markets.guide.filterCountry")}</span>
            <select value={country} onChange={(e) => update({ country: e.target.value, town: "" })}>
              <option value="">{t("markets.guide.all")}</option>
              {countries.map((c) => (
                <option key={c.key} value={c.key}>
                  {countryName(c.sample, lang)} ({c.count})
                </option>
              ))}
            </select>
          </label>
          {country && cities.length > 1 && (
            <label className="mg-filter">
              <span>{t("markets.guide.filterCity")}</span>
              <select value={town} onChange={(e) => update({ town: e.target.value })}>
                <option value="">{t("markets.guide.all")}</option>
                {cities.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.count})
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="mg-filter">
            <span>{t("markets.guide.filterOrder")}</span>
            <select value={order} onChange={(e) => update({ order: e.target.value === "az" ? "az" : "" })} disabled={Boolean(query.trim())}>
              <option value="editorial">{t("markets.guide.orderEditorial")}</option>
              <option value="az">{t("markets.guide.orderAz")}</option>
            </select>
          </label>
        </div>
        <div className="mg-status">
          <p aria-live="polite">{t("markets.guide.results", { count: number(results.length) })}</p>
          {filtering && (
            <button type="button" className="mg-reset" onClick={() => (setDraft(""), update({ q: "", type: "", country: "", town: "", order: "" }))}>
              {t("markets.guide.reset")}
            </button>
          )}
        </div>

        {results.length === 0 ? (
          <p className="mg-empty">{t("markets.guide.none")}</p>
        ) : (
          <ul className="mg-list">
            {results.slice(0, visible).map((m) => {
              const themes = specialtiesOf(m).filter((s) => s !== "antiques").slice(0, 3);
              return (
                <li key={m.id} className="mg-row" style={{ "--kind": KIND_COLOR[m.kind] }}>
                  <p className="mg-row__kind">
                    {t(`markets.categories.${mainCategory(m)}.name`)}
                    {m.listing === "sponsored" && <span className="mg-row__paid">{t("markets.guide.sponsored")}</span>}
                  </p>
                  <div className="mg-row__body">
                    <h3>
                      <Link to={marketPath(m)}>{m.name}</Link>
                    </h3>
                    <p className="mg-row__where">
                      {cityNameOf(m)}, {countryName(m, lang)}
                      {themes.length > 0 && <span className="mg-row__themes"> · {themes.map((s) => t(`markets.specialties.${s}`)).join(", ")}</span>}
                    </p>
                    {m.description && <p className="mg-row__desc">{m.description}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {results.length > visible && (
          <button type="button" className="mg-more" onClick={() => setShown({ key: listKey, count: visible + PAGE })}>
            {t("markets.guide.more")} <span>({number(results.length - visible)})</span>
          </button>
        )}
      </section>

      {/* ---------- for shops, and for readers ---------- */}
      <section className="section-light mg-doors">
        <div className="container mg-doors__inner">
          <div className="mg-door">
            <h2>{t("markets.contact.ownerTitle")}</h2>
            <p>{t("markets.contact.ownerText")}</p>
            <button type="button" className="mg-door__button" onClick={() => setDialog("listing")}>
              {t("markets.contact.ownerButton")}
            </button>
          </div>
          <div className="mg-door">
            <h2>{t("markets.contact.suggestTitle")}</h2>
            <p>{t("markets.contact.suggestText")}</p>
            <button type="button" className="mg-door__button mg-door__button--ghost" onClick={() => setDialog("suggest")}>
              {t("markets.contact.suggestButton")}
            </button>
          </div>
        </div>
      </section>

      {dialog && <MarketContactDialog mode={dialog} onClose={() => setDialog(null)} />}
    </div>
  );
}
