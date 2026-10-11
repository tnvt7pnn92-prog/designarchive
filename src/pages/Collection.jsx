import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { useMoodboard } from "../context/MoodboardContext.jsx";
import { objectById } from "../data/indexes.js";
import { COLLECTION_DEMO } from "../data/homeData.js";
import { removeFromCollection, updateItem, useCollection } from "../lib/collection.js";
import { searchLinks } from "../lib/guide.js";
import { useAuth } from "../lib/auth.js";
import { seoForRoute } from "../lib/seo.js";
import { showToast } from "../lib/toast.js";
import { formatDay } from "../lib/today.js";
import { useDocumentMeta } from "../lib/useDocumentMeta.js";
import { useShareLabel } from "../lib/useShareLabel.js";
import SmartImage from "../components/SmartImage.jsx";
import MaterialField from "../components/MaterialField.jsx";
import Label from "../components/Label.jsx";
import CollectionMenu from "../components/CollectionMenu.jsx";
import NearbyMarkets from "../components/NearbyMarkets.jsx";
import "./Collection.css";

const FILTERS = ["all", "own", "want", "seen", "saved"];
const filterLabel = (f) => (f === "all" || f === "saved" ? `collection.filter.${f}` : `collection.status.${f}`);
// The example's personal line, one per label, as on the home page.
const EXAMPLE_ROWS = ["where", "budget", "seen", "note"];

// An empty collection shows what a full one looks like — the home page's example labels, marked as
// an example — rather than a sentence alone on a dark page.
function ExampleWall() {
  const { t } = useLanguage();
  return (
    <figure className="collection-example">
      <figcaption className="catalog-rule">
        <span>{t("home.collectionExampleNote")}</span>
      </figcaption>
      <div className="collection-example__wall">
        {COLLECTION_DEMO.map((piece, i) => (
          <Label
            key={piece.id}
            as="article"
            variant="collection"
            status={piece.country}
            nameAs="p"
            name={<Link to={`/piece/${piece.id}`}>{piece.name}</Link>}
            by={`${piece.designer}, ${piece.year}`}
            rows={[{ label: t(`home.example.${EXAMPLE_ROWS[i]}`), value: t(`home.example.${EXAMPLE_ROWS[i]}Value`) }]}
            stamp={{ status: piece.status, text: t(`collection.status.${piece.status}`) }}
          />
        ))}
      </div>
    </figure>
  );
}

// One piece of the collection: its photo, and its label with the stamp of its state and the
// visitor's own lines — budget and notes for a piece they are looking for (with the search links
// on the big marketplaces), where and when for one they have seen, notes for the rest.
function CollectionCard({ item, object }) {
  const { t, lang } = useLanguage();
  const [editing, setEditing] = useState(false);
  const { sharePiece } = useShareLabel();
  const patch = (key) => (event) => updateItem(item.id, { [key]: event.target.value === "" ? null : event.target.value });
  const links = item.status === "want" ? searchLinks(object, lang) : [];

  const rows = [
    item.status === "want" && item.maxPrice !== null && { label: t("collection.field.budget"), value: `€ ${item.maxPrice.toLocaleString(lang === "zh" ? "zh-CN" : lang)}` },
    item.status === "seen" && { label: t("collection.field.place"), value: item.place },
    item.status === "seen" && item.seenOn && { label: t("collection.field.seenOn"), value: formatDay(item.seenOn, lang) },
    { label: t("collection.field.notes"), value: item.notes },
    links.length > 0 && {
      label: t("collection.field.searchOn"),
      value: links.map((link, i) => (
        <span key={link.id}>
          {i > 0 && " · "}
          <a href={link.url} target="_blank" rel="noreferrer">
            {link.label}
          </a>
        </span>
      )),
    },
  ];

  return (
    <article className="collection-card">
      <Link to={`/piece/${object.id}`} className="collection-card__photo" tabIndex={-1} aria-hidden="true">
        <SmartImage src={object.image} cutout={object.cutout} card alt="" category={object.category} fallback={<MaterialField object={object} />} />
      </Link>
      <Label
        variant="collection"
        status={object.country}
        nameAs="h2"
        name={<Link to={`/piece/${object.id}`}>{object.name}</Link>}
        by={`${object.designer}, ${object.year}`}
        rows={rows}
        stamp={{ status: item.status, text: t(`collection.status.${item.status}`) }}
      />
      {editing && (
        <div className="collection-card__fields">
          {item.status === "want" && (
            <label>
              <span>{t("collection.field.budget")}</span>
              <input type="number" min="0" step="10" inputMode="numeric" value={item.maxPrice ?? ""} onChange={patch("maxPrice")} placeholder="€" />
            </label>
          )}
          {item.status === "seen" && (
            <>
              <label>
                <span>{t("collection.field.place")}</span>
                <input type="text" maxLength={120} value={item.place} onChange={patch("place")} placeholder={t("collection.field.placePlaceholder")} />
              </label>
              <label>
                <span>{t("collection.field.seenOn")}</span>
                <input type="date" value={item.seenOn ?? ""} onChange={patch("seenOn")} />
              </label>
            </>
          )}
          <label className="collection-card__wide">
            <span>{t("collection.field.notes")}</span>
            <input type="text" maxLength={500} value={item.notes} onChange={patch("notes")} placeholder={t("collection.field.notesPlaceholder")} />
          </label>
        </div>
      )}
      <div className="collection-card__actions">
        <button type="button" aria-expanded={editing} onClick={() => setEditing((value) => !value)}>
          {editing ? t("collection.done") : t("collection.edit")}
        </button>
        <CollectionMenu object={object}>{t("collection.changeStatus")}</CollectionMenu>
        <button type="button" onClick={() => sharePiece(object, item.status)} aria-label={`${t("label.share")}: ${object.name}`}>
          {t("label.shareShort")}
        </button>
        <button type="button" onClick={() => removeFromCollection(item.id)} aria-label={`${t("collection.remove")}: ${object.name}`}>
          {t("collection.remove")}
        </button>
      </div>
    </article>
  );
}

// "My collection": one page for what used to be two lists (saved, "Looking for"). The filter
// lives in the address (?f=want), so the old pages can send their visitors to the right drawer.
export default function Collection() {
  const { t } = useLanguage();
  useDocumentMeta(seoForRoute("/collection"));
  const [params, setParams] = useSearchParams();
  const items = useCollection();
  const { status } = useAuth();
  const { isInMoodboard, addItem } = useMoodboard();
  const filter = FILTERS.includes(params.get("f")) ? params.get("f") : "all";

  const rows = items.map((item) => ({ item, object: objectById(item.id) })).filter((row) => row.object);
  const count = (state) => rows.filter((row) => row.item.status === state).length;
  const shown = rows.filter((row) => filter === "all" || row.item.status === filter);
  const missing = shown.filter((row) => !isInMoodboard(row.object.id));
  const summary = t("collection.summary", { own: count("own"), want: count("want"), seen: count("seen") });
  const { shareWall } = useShareLabel();

  function sendToRoom() {
    missing.forEach((row) => addItem(row.object));
    showToast({ message: t("collection.sent", { count: missing.length }), action: { label: t("toast.openRoom"), to: "/moodboard" } });
  }

  return (
    <div className="collection-page container">
      <header className="collection-hero">
        <p className="catalog-rule">
          <span>{summary}</span>
        </p>
        <h1>{t("nav.collection")}</h1>
        <p>{t("collection.intro")}</p>
      </header>

      <div className="collection-bar">
        <div className="collection-tabs" role="group" aria-label={t("nav.collection")}>
          {FILTERS.map((f) => (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => setParams(f === "all" ? {} : { f }, { replace: true })}>
              {t(filterLabel(f))}
              <span>{f === "all" ? rows.length : count(f)}</span>
            </button>
          ))}
        </div>
        {shown.length > 0 && (
          <div className="collection-bar__actions">
            <button type="button" className="btn btn--ghost" onClick={() => shareWall(shown, summary)}>
              {t("label.shareWall")}
            </button>
            <button type="button" className="btn btn--ghost" onClick={sendToRoom} disabled={missing.length === 0}>
              {missing.length ? t("collection.sendAll", { count: missing.length }) : t("collection.allInRoom")}
            </button>
          </div>
        )}
      </div>

      {shown.length === 0 ? (
        <div className="collection-empty">
          <p>{rows.length === 0 ? t("collection.empty") : t("collection.emptyFilter")}</p>
          <div className="collection-empty__actions">
            <Link to="/archive" className="btn btn--gold">
              {t("home.cta")}
            </Link>
          </div>
          {rows.length === 0 && <ExampleWall />}
        </div>
      ) : (
        <div className="collection-grid">
          {shown.map(({ item, object }) => (
            <CollectionCard key={item.id} item={item} object={object} />
          ))}
        </div>
      )}

      {/* Where to go looking: the markets nearby with their next dates, for whoever is after a piece. */}
      {count("want") > 0 && (
        <section className="collection-markets">
          <NearbyMarkets title={t("collection.nextMarket")} />
        </section>
      )}
      {status !== "signedIn" && rows.length > 0 && <p className="collection-note">{t("collection.localNote")}</p>}
    </div>
  );
}
