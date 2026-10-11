import { useEffect, useRef } from "react";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { CATEGORIES, STYLES, DECADES, BEFORE_1900, DESIGNERS, BRANDS, COUNTRIES, MATERIALS } from "../data/objects.js";
import "./FilterPanel.css";

function toggleInArray(arr, value) {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

// A facet option with no pieces left is shown but switched off, unless it is the one selected.
const countOf = (counts, facet, value) => counts?.[facet]?.get(value) ?? 0;

export default function FilterPanel({ filters, onChange, onReset, resultCount, counts, open, onCloseMobile }) {
  const { t } = useLanguage();

  const panelRef = useRef(null);
  // The page passes a new close handler on every render; the sheet effect must not restart for it.
  const closeRef = useRef(onCloseMobile);
  useEffect(() => {
    closeRef.current = onCloseMobile;
  });

  function patch(partial) {
    onChange({ ...filters, ...partial });
  }

  // On a phone the panel is a sheet over the page: Escape closes it, the page behind stays
  // still, and focus moves into the sheet so a keyboard lands on its controls.
  useEffect(() => {
    if (!open) return undefined;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    panelRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      root.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
    <div className={`filter-sheet-backdrop${open ? " is-open" : ""}`} onClick={onCloseMobile} aria-hidden="true" />
    <aside
      id="filter-panel"
      ref={panelRef}
      tabIndex={-1}
      className={`filter-panel${open ? " is-open" : ""}`}
      aria-label={t("filters.open")}
    >
      <span className="filter-panel__handle" aria-hidden="true" />
      <div className="filter-panel__head">
        <p className="filter-panel__count">
          <strong>{resultCount}</strong>
          <span>{t(resultCount === 1 ? "filters.result" : "filters.results")}</span>
        </p>
        <button type="button" className="filter-panel__reset" onClick={onReset}>
          {t("filters.reset")}
        </button>
        <button type="button" className="filter-panel__close" onClick={onCloseMobile} aria-label={t("lightbox.close")}>
          ×
        </button>
      </div>

      <div className="filter-panel__group">
        <label className="filter-panel__search">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m20 20-4.2-4.2" />
          </svg>
          <input
            type="search"
            placeholder={t("filters.searchPlaceholder")}
            aria-label={t("filters.searchPlaceholder")}
            value={filters.search}
            onChange={(e) => patch({ search: e.target.value })}
          />
        </label>
      </div>

      <div className="filter-panel__group">
        <h3>
          {t("filters.category")}
          {filters.category.length > 0 && <span className="filter-panel__active">{filters.category.length}</span>}
        </h3>
        <div className="filter-panel__chips">
          {CATEGORIES.map((cat) => {
            const active = filters.category.includes(cat);
            const n = countOf(counts, "category", cat);
            return (
              <button
                key={cat}
                type="button"
                className={active ? "is-active" : ""}
                aria-pressed={active}
                disabled={!active && n === 0}
                onClick={() => patch({ category: toggleInArray(filters.category, cat) })}
              >
                {t(`categories.${cat}`)} <span className="filter-panel__n">{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="filter-panel__group">
        <h3>
          {t("filters.style")}
          {filters.style.length > 0 && <span className="filter-panel__active">{filters.style.length}</span>}
        </h3>
        <div className="filter-panel__chips">
          {STYLES.map((style) => {
            const active = filters.style.includes(style);
            const n = countOf(counts, "style", style);
            return (
              <button
                key={style}
                type="button"
                className={active ? "is-active" : ""}
                aria-pressed={active}
                disabled={!active && n === 0}
                onClick={() => patch({ style: toggleInArray(filters.style, style) })}
              >
                {t(`styles.${style}`)} <span className="filter-panel__n">{n}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="filter-panel__group">
        <h3>
          {t("filters.decade")}
          {filters.decade.length > 0 && <span className="filter-panel__active">{filters.decade.length}</span>}
        </h3>
        <div className="filter-panel__chips filter-panel__chips--decades">
          {/* Decades travel as strings, so a URL value never has to be guessed back into a
              number — `decadeOf` returns "before-1900" for the oldest bucket. */}
          {DECADES.map(String).map((decade) => {
            const active = filters.decade.includes(decade);
            const n = countOf(counts, "decade", decade);
            return (
              <button
                key={decade}
                type="button"
                className={active ? "is-active" : ""}
                aria-pressed={active}
                disabled={!active && n === 0}
                onClick={() => patch({ decade: toggleInArray(filters.decade, decade) })}
              >
                {decade === BEFORE_1900 ? t("filters.before1900") : decade} <span className="filter-panel__n">{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="filter-panel__group">
        <h3>{t("filters.designer")}</h3>
        <input
          type="text"
          list="designer-options"
          className="filter-panel__input"
          placeholder={t("filters.all")}
          value={filters.designer}
          onChange={(e) => patch({ designer: e.target.value })}
        />
        <datalist id="designer-options">
          {DESIGNERS.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>
      </div>

      <div className="filter-panel__group">
        <h3>{t("filters.brand")}</h3>
        <select value={filters.brand} onChange={(e) => patch({ brand: e.target.value })} className="filter-panel__select">
          <option value="">{t("filters.all")}</option>
          {BRANDS.map((b) => {
            const n = countOf(counts, "brand", b);
            return (
              <option key={b} value={b} disabled={n === 0 && filters.brand !== b}>
                {b} ({n})
              </option>
            );
          })}
        </select>
      </div>

      <div className="filter-panel__group">
        <h3>{t("filters.country")}</h3>
        <select value={filters.country} onChange={(e) => patch({ country: e.target.value })} className="filter-panel__select">
          <option value="">{t("filters.all")}</option>
          {COUNTRIES.map((c) => {
            const n = countOf(counts, "country", c);
            return (
              <option key={c} value={c} disabled={n === 0 && filters.country !== c}>
                {c} ({n})
              </option>
            );
          })}
        </select>
      </div>

      <div className="filter-panel__group">
        <h3>
          {t("filters.material")}
          {filters.material.length > 0 && <span className="filter-panel__active">{filters.material.length}</span>}
        </h3>
        <div className="filter-panel__chips filter-panel__chips--wrap">
          {MATERIALS.map((mat) => {
            const active = filters.material.includes(mat);
            const n = countOf(counts, "material", mat);
            return (
              <button
                key={mat}
                type="button"
                className={active ? "is-active" : ""}
                aria-pressed={active}
                disabled={!active && n === 0}
                onClick={() => patch({ material: toggleInArray(filters.material, mat) })}
              >
                {mat.charAt(0).toUpperCase() + mat.slice(1)} <span className="filter-panel__n">{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Phones only: the way back to the results, saying how many are waiting. */}
      <div className="filter-panel__footer">
        <button type="button" className="filter-panel__apply" onClick={onCloseMobile}>
          {t("filters.showResults", { count: resultCount })}
        </button>
      </div>
    </aside>
    </>
  );
}
