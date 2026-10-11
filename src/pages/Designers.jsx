import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { BY_DESIGNER } from "../data/indexes.js";
import MaterialField from "../components/MaterialField.jsx";
import SmartImage from "../components/SmartImage.jsx";
import { siteTitle } from "../lib/seo.js";
import { useDocumentMeta } from "../lib/useDocumentMeta.js";
import "./Designers.css";

// Everyone credited with at least two pieces gets a card; the long tail of single pieces is
// listed as plain names, which keeps the page readable without hiding anyone.
const ALL = [...BY_DESIGNER.values()].sort((a, b) => b.objects.length - a.objects.length || a.name.localeCompare(b.name));
const MANY = ALL.filter((d) => d.objects.length >= 2);
const ONCE = ALL.filter((d) => d.objects.length === 1).sort((a, b) => a.name.localeCompare(b.name));

const fold = (s) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export default function Designers() {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");

  useDocumentMeta({
    title: siteTitle(t("designers.title")),
    description: `${ALL.length} designers in the Design Archive, from single pieces to full bodies of work.`,
  });

  const q = fold(query.trim());
  const cards = useMemo(() => (q ? MANY.filter((d) => fold(d.name).includes(q)) : MANY), [q]);
  const rest = useMemo(() => (q ? ONCE.filter((d) => fold(d.name).includes(q)) : ONCE), [q]);

  return (
    <div className="designers-page">
      <header className="container designers-hero">
        <p className="catalog-rule">
          <span>{t("designers.eyebrow")}</span>
        </p>
        <h1>{t("designers.title")}</h1>
        <p>{t("designers.subtitle", { count: ALL.length })}</p>
        <input
          type="search"
          className="designers-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("designers.searchPlaceholder")}
          aria-label={t("designers.searchPlaceholder")}
        />
      </header>

      <div className="container designers-grid">
        {cards.map((designer) => {
          // Up to three of their pieces side by side: one photo says "a chair", three say "a hand".
          const photos = designer.objects.filter((o) => o.image).slice(0, 3);
          return (
            <Link key={designer.slug} to={`/designer/${designer.slug}`} className="designer-card">
              <span className="designer-card__media" data-count={photos.length}>
                {photos.length ? (
                  photos.map((o) => <SmartImage key={o.id} src={o.image} cutout={o.cutout} card category={o.category} fallback={<MaterialField object={o} />} />)
                ) : (
                  <SmartImage category={designer.objects[0]?.category} />
                )}
              </span>
              <span className="designer-card__body">
                <strong>{designer.name}</strong>
                <span>{t("designer.pieces", { count: designer.objects.length })}</span>
              </span>
            </Link>
          );
        })}
      </div>

      {rest.length > 0 && (
        <section className="container designers-rest">
          <h2>{t("designers.onePiece")}</h2>
          <ul>
            {rest.map((designer) => (
              <li key={designer.slug}>
                <Link to={`/designer/${designer.slug}`}>{designer.name}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
