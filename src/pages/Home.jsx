import { Fragment, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { seoForRoute } from "../lib/seo.js";
import { useDocumentMeta } from "../lib/useDocumentMeta.js";
import { useFinePointer, useReducedMotion } from "../lib/motion.js";
import { clamp } from "../lib/frameLoop.js";
import SmartImage from "../components/SmartImage.jsx";
import HomeCursor from "../components/home/HomeCursor.jsx";
import HeroField from "../components/home/HeroField.jsx";
import HeroOrbit from "../components/home/HeroOrbit.jsx";
import HeroSearch from "../components/home/HeroSearch.jsx";
import RibbonPair from "../components/home/RibbonPair.jsx";
import RoomsScene from "../components/home/RoomsScene.jsx";
import StepsScene from "../components/home/StepsScene.jsx";
import TimeMachine from "../components/home/TimeMachine.jsx";
import Odometer from "../components/home/Odometer.jsx";
import CollectionWall from "../components/home/CollectionWall.jsx";
import { useScene } from "../components/home/useScene.js";
// The landing page reads a small generated summary of the archive rather than the catalogue
// itself (see scripts/build-home-data.mjs).
import { COLLECTION_DEMO, ORBIT, RIBBON, STATS, TIME } from "../data/homeData.js";
import { PROMO_IMAGES } from "../data/promoImages.js";
import { MARKET_COUNT } from "../data/stats.js";
import "./Home.css";

const LOCALES = { en: "en-GB", it: "it-IT", es: "es-ES", fr: "fr-FR", zh: "zh-CN" };

// A first visit arrives on the prerendered page, whose hero stands still: the live one then takes
// its place without playing the entrance again.
const arrivedPrerendered = typeof document !== "undefined" && Boolean(document.querySelector(".prerender .home-hero"));
let entranceSeen = false;

// The heading's words rise one by one from below their line.
function Words({ text, from = 0, em = false }) {
  return text.split(" ").map((word, i) => (
    <Fragment key={i}>
      {i > 0 && " "}
      <span className="home-word">
        <span style={{ "--w": i + from }}>{em ? <em>{word}</em> : word}</span>
      </span>
    </Fragment>
  ));
}

// The word at the end of the first line changes every few seconds (story, signature, date…).
function Rotator({ words, still }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (still) return undefined;
    const timer = setInterval(() => setIndex((i) => (i + 1) % words.length), 2600);
    return () => clearInterval(timer);
  }, [still, words.length]);
  return (
    <span className="home-rotator">
      <span className="visually-hidden">{words[0]}</span>
      {words.map((word, i) => (
        <span key={word} aria-hidden="true" className={i === index ? "is-on" : i === (index - 1 + words.length) % words.length ? "is-out" : undefined}>
          {word}
        </span>
      ))}
    </span>
  );
}

// The closing: a wall of the time machine's photos, tilted, that settles as it scrolls up.
function Closing({ still }) {
  const { t } = useLanguage();
  const section = useRef(null);
  useScene(
    section,
    (el) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--z", (1.35 - clamp(1 - r.top / window.innerHeight) * 0.3).toFixed(3));
    },
    still
  );
  const tiles = [...TIME, ...TIME].slice(0, 30);
  return (
    <section ref={section} className="home-closing" aria-labelledby="home-closing-title">
      <div className="home-closing__tiles" aria-hidden="true">
        {tiles.map((piece, i) => (
          <SmartImage key={`${piece.id}-${i}`} src={piece.image} card cutout={piece.cutout} category={piece.category} />
        ))}
      </div>
      <div className="home-wrap" data-reveal>
        <p className="home-eyebrow">{t("home.closingEyebrow")}</p>
        <h2 id="home-closing-title">
          {t("home.closingTitle")} <em>{t("home.closingTitleEm")}</em>
        </h2>
        <div className="home-closing__actions">
          <Link to="/markets" className="home-btn home-btn--gold">
            {t("home.closingMarkets")} <span className="home-arrow">→</span>
          </Link>
          <Link to="/archive" className="home-btn">
            {t("home.cta")}
          </Link>
        </div>
      </div>
    </section>
  );
}

// The landing page, a gallery at night that moves with the visitor: a hero with the makers' photos
// turning on a ring, ribbons of classics, the six rooms of the site in a row slid sideways, how it
// works, the time machine (another sideways row), the numbers, the collection and the markets. The
// page itself always scrolls freely: nothing holds the visitor back on the way down.
export default function Home() {
  useDocumentMeta(seoForRoute("/"));
  const { t, lang } = useLanguage();
  const reduced = useReducedMotion();
  const fine = useFinePointer();
  const [settled] = useState(() => arrivedPrerendered || entranceSeen);
  useEffect(() => {
    entranceSeen = true;
  }, []);
  const locale = LOCALES[lang] ?? "en-GB";
  const number = (n) => n.toLocaleString(locale);

  const rooms = [
    { key: "archive", to: "/archive", title: t("nav.archive"), figure: t("home.rooms.archive.figure", { count: number(STATS.pieces) }) },
    { key: "designers", to: "/designers", title: t("designers.title"), figure: t("home.rooms.designers.figure", { count: number(STATS.designers) }) },
    { key: "markets", to: "/markets", title: t("nav.markets"), figure: t("home.rooms.markets.figure", { count: number(MARKET_COUNT) }) },
    { key: "stories", to: "/stories", title: t("nav.stories"), figure: t("home.rooms.stories.figure") },
    { key: "collection", to: "/collection", title: t("nav.collection"), figure: t("home.rooms.collection.figure") },
    { key: "moodboard", to: "/moodboard", title: t("nav.moodboard"), figure: t("home.rooms.moodboard.figure") },
  ].map((room) => ({
    ...room,
    photo: PROMO_IMAGES[`room${room.key[0].toUpperCase()}${room.key.slice(1)}`],
    text: t(`home.rooms.${room.key}.text`, { countries: STATS.marketCountries }),
  }));

  const counts = [
    [STATS.pieces, "pieces"],
    [STATS.designers, "designers"],
    [MARKET_COUNT, "markets"],
    [STATS.marketCountries, "countries"],
    [STATS.stories, "stories"],
  ];

  return (
    <div className={`home-page${settled ? " is-settled" : ""}`}>
      {fine && !reduced && <HomeCursor />}

      <section className="home-hero" aria-labelledby="home-title">
        <HeroField still={reduced} />
        <div className="home-wrap home-hero__grid">
          <div className="home-hero__text">
            <p className="home-eyebrow">{t("home.eyebrow", { pieces: number(STATS.pieces), designers: number(STATS.designers) })}</p>
            <h1 id="home-title">
              <Words text={t("home.titleLead")} /> <Rotator words={t("home.titleWords").split("|")} still={reduced} />
              <br />
              <Words text={t("home.title2")} from={5} em />
            </h1>
            <p className="home-hero__lede">{t("home.lede")}</p>
            <HeroSearch still={reduced} />
            <p className="home-hero__facts">
              <span>
                <b>{number(STATS.pieces)}</b> {t("home.factPieces")}
              </span>
              <span>
                <b>{number(MARKET_COUNT)}</b> {t("home.factPlaces", { countries: STATS.marketCountries })}
              </span>
              <span>
                <b>{STATS.stories}</b> {t("home.factStories")}
              </span>
            </p>
          </div>
          <HeroOrbit pieces={ORBIT} still={reduced} />
        </div>
      </section>

      <RibbonPair pieces={RIBBON} still={reduced} />
      <RoomsScene rooms={rooms} still={reduced} />
      <StepsScene marketCount={number(MARKET_COUNT)} />
      <TimeMachine pieces={TIME} still={reduced} />

      <section className="home-counts-band" aria-label={t("home.countsLabel")}>
        <div className="home-wrap">
          <div className="home-counts" data-reveal>
            {counts.map(([value, key]) => (
              <div key={key} className="home-count">
                <Odometer value={value} locale={locale} still={reduced} />
                <span className="home-count__k">{t(`home.counts.${key}.label`)}</span>
                <small>{t(`home.counts.${key}.note`)}</small>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CollectionWall demo={COLLECTION_DEMO} still={reduced} />
      <Closing still={reduced} />
    </div>
  );
}
