import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../i18n/LanguageContext.jsx";
import { useAuth } from "../../lib/auth.js";
import { useCollection } from "../../lib/collection.js";
import Label from "../Label.jsx";

// The example collection's personal line, one per label: invented, and the page says so.
const EXAMPLE_ROWS = ["where", "budget", "seen", "note"];
const FILTERS = ["all", "own", "want", "seen"];
const TILTS = [-1.6, 1.2, -0.6, 1.8];

// "My collection": the visitor's own labels once there are some, otherwise an example — clearly
// marked as one — with the way in. The labels are pinned up one by one as the wall scrolls into
// view, each stamped a moment later.
export default function CollectionWall({ demo, still }) {
  const { t } = useLanguage();
  const { status } = useAuth();
  const collection = useCollection();
  const [own, setOwn] = useState(null);
  const [filter, setFilter] = useState("all");
  const [pinned, setPinned] = useState("still");
  const wall = useRef(null);
  const key = collection.map((item) => `${item.id}:${item.status}`).join(",");

  // The visitor's pieces come from the catalogue, which the home page does not load up front.
  useEffect(() => {
    let alive = true;
    if (!key) return undefined;
    import("../../data/indexes.js").then(({ objectById }) => {
      if (!alive) return;
      setOwn(
        key
          .split(",")
          .map((entry) => entry.split(":"))
          .map(([id, state]) => ({ object: objectById(id), state }))
          .filter((entry) => entry.object)
          .map(({ object, state }) => ({ ...object, status: state }))
      );
    });
    return () => {
      alive = false;
    };
  }, [key]);

  // Only a wall that starts below the fold waits to be pinned up.
  useEffect(() => {
    const el = wall.current;
    if (still || !el || typeof IntersectionObserver === "undefined") return undefined;
    if (el.getBoundingClientRect().top < window.innerHeight) return undefined;
    setPinned("waiting");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setPinned("in");
        io.disconnect();
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [still]);

  const example = !key || !own?.length;
  const pieces = example ? demo.map((piece, i) => ({ ...piece, row: EXAMPLE_ROWS[i] })) : own;
  // The wall holds four labels: the newest, or the newest with the chosen state.
  const shown = pieces.filter((piece) => filter === "all" || piece.status === filter).slice(0, 4);
  const count = (s) => pieces.filter((piece) => piece.status === s).length;
  const signedIn = status === "signedIn";

  return (
    <section className="home-collection" aria-labelledby="home-collection-title">
      <div className="home-wrap home-collection__grid">
        <div className="home-collection__text" data-reveal>
          <p className="home-eyebrow">{t("nav.collection")}</p>
          <h2 id="home-collection-title">
            {t("home.collectionTitle")} <em>{t("home.collectionTitleEm")}</em>
          </h2>
          <p>{t("home.collectionText")}</p>
          <div className="home-tabs" role="group" aria-label={t("nav.collection")}>
            {FILTERS.map((f) => (
              <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>
                {t(f === "all" ? "collection.filter.all" : `collection.status.${f}`)}
              </button>
            ))}
          </div>
          <p className="home-collection__summary">{t("collection.summary", { own: count("own"), want: count("want"), seen: count("seen") })}</p>
          {example ? (
            <Link to={signedIn ? "/archive" : "/registrati"} className="home-btn">
              {signedIn ? t("home.collectionFirst") : t("home.collectionStart")} <span className="home-arrow">→</span>
            </Link>
          ) : (
            <Link to="/collection" className="home-btn">
              {t("home.collectionOpen")} <span className="home-arrow">→</span>
            </Link>
          )}
          {example && <p className="home-collection__example">{t("home.collectionExampleNote")}</p>}
        </div>
        <div ref={wall} className={`home-wall is-${pinned}`}>
          {shown.map((piece, i) => (
            <Label
              key={piece.id}
              as="article"
              variant="collection"
              className="home-card"
              style={{ "--r": `${TILTS[i]}deg`, "--i": i }}
              status={piece.country}
              nameAs="p"
              name={<Link to={`/piece/${piece.id}`}>{piece.name}</Link>}
              by={`${piece.designer}, ${piece.year}`}
              rows={piece.row ? [{ label: t(`home.example.${piece.row}`), value: t(`home.example.${piece.row}Value`) }] : []}
              stamp={{ status: piece.status, text: t(`collection.status.${piece.status}`) }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
