import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { MARKETS } from "../data/markets.js";
import { marketSchedule } from "../lib/marketDates.js";
import { haversine } from "../lib/marketPlanner.js";
import { archiveCountryOf, cityNameOf, citySlugOf, cityPath, marketById, marketPath } from "../lib/marketPlaces.js";
import { archiveHref } from "../lib/archiveParams.js";
import { downloadIcs } from "../lib/ics.js";
import { seoForMarketPlace } from "../lib/seo.js";
import { siteUrl } from "../lib/site.js";
import { useToday } from "../lib/today.js";
import { useDocumentMeta } from "../lib/useDocumentMeta.js";
import ObjectCard from "../components/ObjectCard.jsx";
import MarketContactDialog from "../components/MarketContactDialog.jsx";
import { commonsPage, commonsSrcSet, commonsThumb, marketPhoto } from "../data/marketPhotos.js";
import { countryName, mainCategory, specialtiesOf } from "../lib/marketGuide.js";
import NotFound from "./NotFound.jsx";
import "./Markets.css";
import "./MarketPlace.css";

const CityMap = lazy(() => import("../components/CityMap.jsx"));
const KIND_COLOR = { market: "var(--kind-market)", fair: "var(--kind-fair)", shop: "var(--kind-shop)", sale: "var(--kind-sale)" };
const NEARBY_KM = 25;

// One market, fair, gallery or brand sale: what it is, when it is on, where, what else is near,
// and the kind of pieces its country (or, for a brand's sale, the brand) gave the archive.
export default function MarketPlace() {
  const { city: citySlug, id } = useParams();
  const { t, lang } = useLanguage();
  const { today } = useToday();
  const market = marketById(id);
  useDocumentMeta(market ? seoForMarketPlace(market, citySlugOf(market)) : undefined);
  const [pieces, setPieces] = useState(null);
  const [fixing, setFixing] = useState(false);
  const country = market ? archiveCountryOf(market) : "";
  // A brand's own sale shows that brand's pieces; any other place, its country's.
  const brand = market?.brand ?? "";

  // The archive is big: it loads only for this block.
  useEffect(() => {
    let alive = true;
    if (!brand && !country) return undefined;
    import("../data/indexes.js").then(({ BY_BRAND, BY_COUNTRY }) => {
      if (!alive) return;
      const list = brand ? ([...BY_BRAND.values()].find((b) => b.name === brand)?.objects ?? []) : (BY_COUNTRY.get(country) ?? []);
      setPieces(list.filter((o) => o.image));
    });
    return () => {
      alive = false;
    };
  }, [brand, country]);

  const nearby = useMemo(
    () =>
      market
        ? MARKETS.filter((m) => m.id !== market.id)
            .map((m) => ({ market: m, km: haversine(market, m) }))
            .filter((e) => e.km <= NEARBY_KM)
            .sort((a, b) => a.km - b.km)
            .slice(0, 6)
        : [],
    [market]
  );
  const mapPlaces = useMemo(() => (market ? [market, ...nearby.filter((e) => e.km <= 5).map((e) => e.market)] : []), [market, nearby]);
  const origin = useMemo(() => (market ? { lat: market.lat, lng: market.lng } : null), [market]);

  if (!market || citySlugOf(market) !== citySlug) return <NotFound />;

  const locale = lang === "zh" ? "zh-CN" : lang;
  const long = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  const monthName = (i) => new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2026, i, 15)));
  const schedule = marketSchedule(market, today, 3);
  const first = schedule.type === "dates" ? schedule.dates[0] : null;
  const cityName = cityNameOf(market);

  function addToCalendar() {
    downloadIcs(
      { uid: `${market.id}-${first}`, date: first, title: market.name, location: market.city, description: `${market.frequency}. ${market.description ?? ""}`.trim(), url: siteUrl(marketPath(market)) },
      `${market.id}-${first}.ics`
    );
  }

  const photo = marketPhoto(market.id);
  const themes = specialtiesOf(market);
  const countryLabel = countryName(market, lang);
  const instagram = market.instagram?.replace(/^@/, "");

  return (
    <div className="market-place container">
      <nav className="market-place__crumbs" aria-label={t("piece.breadcrumb")}>
        <Link to="/markets">{t("nav.markets")}</Link> / <Link to={cityPath(citySlug)}>{cityName}</Link> / <span>{market.name}</span>
      </nav>

      {/* A real photograph of the place, when the guide has one (data/marketPhotos.js). */}
      {photo && (
        <figure className="market-place__photo">
          <img src={commonsThumb(photo, 1280)} srcSet={commonsSrcSet(photo)} sizes="(max-width: 1100px) 100vw, 1100px" alt={`${market.name}, ${cityName}`} fetchPriority="high" decoding="async" />
          <figcaption>
            <a href={commonsPage(photo)} target="_blank" rel="noreferrer">
              {t("markets.guide.photoCredit", { author: photo.author, license: photo.license })}
            </a>
          </figcaption>
        </figure>
      )}

      <div className="market-place__grid">
        <article className="mk-ticket market-place__ticket" style={{ "--kind": KIND_COLOR[market.kind] }}>
          <div className="mk-ticket__stub">
            {first ? (
              <>
                <span className="mk-ticket__dow">{new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(new Date(`${first}T00:00:00Z`)).replace(".", "")}</span>
                <span className="mk-ticket__day">{Number(first.slice(8))}</span>
                <span className="mk-ticket__mon">{new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }).format(new Date(`${first}T00:00:00Z`)).replace(".", "")}</span>
              </>
            ) : schedule.type === "open" ? (
              <>
                <span className="mk-ticket__dow">{t("markets.planner.open")}</span>
                <span className="mk-ticket__word">{t("markets.planner.always")}</span>
              </>
            ) : schedule.type === "months" ? (
              <>
                <span className="mk-ticket__dow">{t(schedule.biennial ? "markets.planner.everyTwoYears" : "markets.planner.everyYear")}</span>
                <span className="mk-ticket__word">{monthName(schedule.months[0])}</span>
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
              <span className="mk-ticket__kind">{t(`markets.categories.${mainCategory(market)}.name`)}</span>
              <span>
                {cityName}, {countryLabel}
              </span>
            </p>
            {market.listing === "sponsored" && <p className="market-place__paid">{t("markets.guide.sponsored")}</p>}
            <h1>{market.name}</h1>
            {market.description && <p className="mk-ticket__desc">{market.description}</p>}
            {themes.length > 0 && (
              <p className="market-place__themes">
                <span>{t("markets.guide.themes")}</span> {themes.map((s) => t(`markets.specialties.${s}`)).join(" · ")}
              </p>
            )}
            <dl className="market-place__facts">
              {market.address && (
                <div>
                  <dt>{t("markets.place.address")}</dt>
                  <dd>{market.address}</dd>
                </div>
              )}
              {market.hours && (
                <div>
                  <dt>{t("markets.place.hours")}</dt>
                  <dd>{market.hours}</dd>
                </div>
              )}
              <div>
                <dt>{t("markets.place.frequency")}</dt>
                <dd>{market.frequency}</dd>
              </div>
              <div>
                <dt>{schedule.type === "dates" ? t("markets.place.nextDates") : t("markets.place.when")}</dt>
                <dd>
                  {schedule.type === "dates" ? (
                    <ul>
                      {schedule.dates.map((d) => (
                        <li key={d}>{long.format(new Date(`${d}T00:00:00Z`))}</li>
                      ))}
                    </ul>
                  ) : schedule.type === "months" ? (
                    t(schedule.biennial ? "markets.place.everyTwoYearsIn" : "markets.place.everyYearIn", { months: schedule.months.map(monthName).join(", ") })
                  ) : schedule.type === "open" ? (
                    t("markets.place.openAlways")
                  ) : (
                    t("markets.place.unknown")
                  )}
                  {/* A sample sale's days are the brand's to announce (its page is among the buttons). */}
                  {market.kind === "sale" && schedule.type !== "open" && schedule.type !== "dates" && <p className="market-place__by-brand">{t("markets.place.datesByBrand")}</p>}
                </dd>
              </div>
            </dl>
            <div className="mk-ticket__actions">
              {first && (
                <button type="button" onClick={addToCalendar}>
                  {t("nearby.addToCalendar")}
                </button>
              )}
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${market.lat},${market.lng}`} target="_blank" rel="noreferrer">
                {t("markets.planner.directions")} ↗
              </a>
              {market.url && (
                <a href={market.url} target="_blank" rel="noopener noreferrer">
                  {t("markets.place.official")} ↗
                </a>
              )}
              {instagram && (
                <a href={`https://www.instagram.com/${encodeURIComponent(instagram)}/`} target="_blank" rel="noopener noreferrer">
                  {t("markets.place.instagram")} ↗
                </a>
              )}
            </div>
          </div>
        </article>

        <div className="market-place__map">
          <Suspense fallback={<p className="mk-map__wait">{t("markets.planner.mapLoading")}</p>}>
            <CityMap origin={origin} km={5} places={mapPlaces} hoveredId={market.id} label={t("markets.planner.mapLabel", { place: market.name })} failedText={t("markets.planner.mapFailed")} />
          </Suspense>
        </div>
      </div>

      {/* Days a brand announced are its own, not worked out from the frequency. */}
      <p className="market-place__note">
        {first && market.dates?.includes(first) ? t("markets.place.datesAnnounced") : t("markets.planner.datesNote")}{" "}
        <button type="button" className="market-place__fix" onClick={() => setFixing(true)}>
          {t("markets.contact.fixLink")}
        </button>
      </p>
      {fixing && <MarketContactDialog mode="suggest" place={{ name: market.name, city: `${cityName}, ${countryLabel}` }} onClose={() => setFixing(false)} />}

      {nearby.length > 0 && (
        <section className="market-place__section">
          <h2>{t("markets.place.nearby")}</h2>
          <ul className="market-place__nearby">
            {nearby.map(({ market: m, km }) => (
              <li key={m.id} style={{ "--kind": KIND_COLOR[m.kind] }}>
                <Link to={marketPath(m)}>
                  <span className="mk-ticket__kind">{t(`markets.kindLabels.${m.kind}`)}</span>
                  <b>{m.name}</b>
                  <span className="market-place__km">
                    {t("markets.planner.km", { km: km < 10 ? km.toFixed(1).replace(".", t("markets.planner.decimal")) : Math.round(km) })} · {m.frequency}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link to={cityPath(citySlug)} className="btn btn--ghost">
            {t("markets.place.allIn", { place: cityName })}
          </Link>
        </section>
      )}

      {pieces?.length > 0 && (
        <section className="market-place__section">
          <h2>{brand ? t("markets.place.brandTitle", { brand }) : t("markets.place.findTitle")}</h2>
          {!brand && <p className="market-place__lede">{t("markets.place.findText", { country })}</p>}
          <div className="market-place__rail">
            {pieces.slice(0, 8).map((object) => (
              <ObjectCard key={object.id} object={object} />
            ))}
          </div>
          {/* "All 1 pieces" says nothing the rail has not shown. */}
          {pieces.length > 1 && (
            <Link to={archiveHref(brand ? { brand } : { country })} className="btn btn--ghost">
              {brand ? t("markets.place.brandAll", { count: pieces.length, brand }) : t("markets.place.findAll", { count: pieces.length, country })}
            </Link>
          )}
        </section>
      )}
    </div>
  );
}
