import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { OBJECTS, BEFORE_1900, decadeOf } from "../data/objects.js";
import { FAMOUS_PIECES, ICONIC_PIECES } from "../data/iconicPieces.js";
import { DENSITIES, EMPTY_FILTERS, SORTS, filtersFromParams, paramsFromFilters } from "../lib/archiveParams.js";
import { makeSearch } from "../lib/archiveSearch.js";
import { dictionary } from "../i18n/dictionaries.js";
import { seoForRoute } from "../lib/seo.js";
import { useDocumentMeta } from "../lib/useDocumentMeta.js";
import FilterPanel from "../components/FilterPanel.jsx";
import ObjectCard from "../components/ObjectCard.jsx";
import PhotoLightbox from "../components/PhotoLightbox.jsx";
import "./Archive.css";

// Typing in the search box would otherwise rewrite the URL on every keystroke.
const SEARCH_DEBOUNCE = 300;
// The whole archive in one go was 822 cards and a 61,000 px page (131,000 px on a phone); it now
// arrives in blocks. The number of blocks is in the URL, so Back lands on the same card.
const PAGE_SIZE = 60;
// With nothing found, the filters worth dropping: each one alone, with how many pieces its
// removal would bring back.
const SUGGESTIONS = 3;
// "In evidenza": the most famous pieces first, in their order, then the other iconic pieces, then
// the rest of the catalogue in its own order (the sort is stable).
const FEATURED_RANK = new Map([...FAMOUS_PIECES, ...ICONIC_PIECES.filter((id) => !FAMOUS_PIECES.includes(id))].map((id, i) => [id, i]));
const featuredRank = (id) => FEATURED_RANK.get(id) ?? FEATURED_RANK.size;

// The translated names of a piece's category and styles, in English and in the reader's language
// (once its dictionary is loaded), so "divano" finds the sofas.
function labelsIn(lang) {
  const dicts = [dictionary("en"), lang === "en" ? null : dictionary(lang)].filter(Boolean);
  return (obj) => dicts.flatMap((d) => [d.categories?.[obj.category], ...obj.styles.map((s) => d.styles?.[s])]).filter(Boolean);
}

function searchFor(text, lang) {
  const labelLang = dictionary(lang) ? lang : "en";
  return makeSearch(text, OBJECTS, { lang: labelLang, labelsOf: labelsIn(labelLang) });
}

function matches(obj, filters, search) {
  if (filters.category.length && !filters.category.includes(obj.category)) return false;
  if (filters.style.length && !filters.style.some((s) => obj.styles.includes(s))) return false;
  if (filters.decade.length && !filters.decade.includes(String(decadeOf(obj.year)))) return false;
  if (filters.designer && !obj.designer.toLowerCase().includes(filters.designer.toLowerCase())) return false;
  if (filters.brand && obj.brand !== filters.brand) return false;
  if (filters.country && obj.country !== filters.country) return false;
  if (filters.material.length && !filters.material.some((m) => obj.materialTags.includes(m))) return false;
  return search(obj);
}

// `search` is the test built by searchFor() from filters.search.
function filterObjects(filters, search) {
  return OBJECTS.filter((obj) => matches(obj, filters, search));
}

// How many pieces each option of each filter would show, given all the other filters: the
// numbers next to the chips. A facet never narrows its own counts, so picking "Chairs" still
// says how many lamps there are.
const FACETS = {
  category: (o) => [o.category],
  style: (o) => o.styles,
  decade: (o) => [String(decadeOf(o.year))],
  material: (o) => o.materialTags,
  brand: (o) => [o.brand],
  country: (o) => [o.country],
};

function facetCounts(filters, search) {
  const counts = {};
  for (const [facet, valuesOf] of Object.entries(FACETS)) {
    const others = { ...filters, [facet]: Array.isArray(filters[facet]) ? [] : "" };
    const map = new Map();
    for (const obj of OBJECTS) {
      if (!matches(obj, others, search)) continue;
      for (const value of new Set(valuesOf(obj))) map.set(value, (map.get(value) ?? 0) + 1);
    }
    counts[facet] = map;
  }
  return counts;
}

export default function Archive() {
  const { t, lang } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lightboxId, setLightboxId] = useState(null);
  // null means "whatever the URL says"; a string is a search still being typed.
  const [draft, setDraft] = useState(null);
  const timer = useRef(null);

  useDocumentMeta(seoForRoute("/archive"));
  useEffect(() => () => clearTimeout(timer.current), []);

  // The URL is the single source of truth, so a filtered view can be shared and the Back button
  // steps through the filters.
  const { filters, sort, density, page } = useMemo(() => filtersFromParams(searchParams), [searchParams]);
  const shown = draft === null ? filters : { ...filters, search: draft };
  const sentinel = useRef(null);

  // Any change of filter, order or view starts again from the first block.
  function write(nextFilters, nextSort = sort, nextDensity = density, nextPage = 1) {
    setSearchParams(paramsFromFilters(nextFilters, nextSort, nextDensity, nextPage), { replace: true });
  }

  function apply(next) {
    clearTimeout(timer.current);
    if (next.search !== shown.search) {
      setDraft(next.search);
      timer.current = setTimeout(() => {
        setDraft(null);
        write(next);
      }, SEARCH_DEBOUNCE);
      return;
    }
    setDraft(null);
    write(next);
  }

  const search = useMemo(() => searchFor(filters.search, lang), [filters.search, lang]);

  const results = useMemo(() => {
    const sorted = filterObjects(filters, search);
    if (sort === "newest") sorted.sort((a, b) => b.year - a.year);
    else if (sort === "oldest") sorted.sort((a, b) => a.year - b.year);
    else if (sort === "az") sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "designer") sorted.sort((a, b) => a.designer.localeCompare(b.designer) || a.year - b.year);
    else sorted.sort((a, b) => featuredRank(a.id) - featuredRank(b.id));
    return sorted;
  }, [filters, sort, search]);

  const counts = useMemo(() => facetCounts(filters, search), [filters, search]);
  const visible = results.slice(0, page * PAGE_SIZE);
  const hasMore = visible.length < results.length;
  const loadMore = () => write(filters, sort, density, page + 1);

  // Scrolling near the end loads the next block by itself; the button stays as the fallback for
  // keyboards, screen readers and browsers without IntersectionObserver.
  useEffect(() => {
    const target = sentinel.current;
    if (!hasMore || !target || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          setSearchParams(paramsFromFilters(filters, sort, density, page + 1), { replace: true });
        }
      },
      { rootMargin: "800px 0px" }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, filters, sort, density, page, setSearchParams]);

  // The lightbox steps through the photographed pieces of the current results, in grid order.
  const photographed = useMemo(() => results.filter((obj) => obj.image), [results]);
  const lightboxIndex = photographed.findIndex((obj) => obj.id === lightboxId);

  const removeChip = (patch) => apply({ ...shown, ...patch });
  // Each active filter, with the change that removes it.
  const chips = [
    ...filters.category.map((v) => ({ label: t(`categories.${v}`), patch: { category: filters.category.filter((c) => c !== v) } })),
    ...filters.style.map((v) => ({ label: t(`styles.${v}`), patch: { style: filters.style.filter((s) => s !== v) } })),
    ...filters.decade.map((v) => ({
      label: v === BEFORE_1900 ? t("filters.before1900") : v,
      patch: { decade: filters.decade.filter((d) => d !== v) },
    })),
    ...filters.material.map((v) => ({
      label: v.charAt(0).toUpperCase() + v.slice(1),
      patch: { material: filters.material.filter((m) => m !== v) },
    })),
    ...(filters.designer ? [{ label: filters.designer, patch: { designer: "" } }] : []),
    ...(filters.brand ? [{ label: filters.brand, patch: { brand: "" } }] : []),
    ...(filters.country ? [{ label: filters.country, patch: { country: "" } }] : []),
    ...(filters.search ? [{ label: `"${filters.search}"`, patch: { search: "" } }] : []),
  ];

  const suggestions =
    results.length === 0
      ? chips
          .map((chip) => {
            const next = { ...filters, ...chip.patch };
            return { ...chip, count: filterObjects(next, next.search === filters.search ? search : searchFor(next.search, lang)).length };
          })
          .filter((chip) => chip.count > 0)
          .sort((a, b) => b.count - a.count)
          .slice(0, SUGGESTIONS)
      : [];

  function resetAll() {
    setDraft(null);
    write(EMPTY_FILTERS, "featured", density);
  }

  return (
    <div className="archive-page">
      <header className="archive-hero container">
        <p className="catalog-rule">
          <span>{t("archive.title")}</span>
        </p>
        <h1>{t("archive.title")}</h1>
        <p className="archive-hero__subtitle">{t("archive.subtitle")}</p>
      </header>

      <div className="container archive-layout">
        <button
          type="button"
          className="archive-filter-toggle"
          onClick={() => setMobileOpen(true)}
          aria-expanded={mobileOpen}
          aria-controls="filter-panel"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>
          {t("filters.open")}
          {chips.length > 0 && <span className="archive-filter-toggle__count">{chips.length}</span>}
        </button>

        <FilterPanel
          filters={shown}
          onChange={apply}
          onReset={resetAll}
          resultCount={results.length}
          counts={counts}
          open={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />

        <div className="archive-results">
          <h2 className="visually-hidden">{t("archive.resultsHeading")}</h2>
          <div className="archive-results__bar">
            <div className="archive-results__chips">
              {chips.length === 0 && <span className="archive-results__none">{t("filters.all")}</span>}
              {chips.map((chip, i) => (
                <button key={`${chip.label}-${i}`} type="button" className="archive-chip" aria-label={t("archive.without", { filter: chip.label })} onClick={() => removeChip(chip.patch)}>
                  {chip.label} <span aria-hidden="true">×</span>
                </button>
              ))}
            </div>
            <div className="archive-results__controls">
              <div className="archive-density" role="group" aria-label={t("archive.view")}>
                <span className="archive-density__label" aria-hidden="true">
                  {t("archive.view")}
                </span>
                <span className="archive-density__options">
                  {DENSITIES.map((d) => (
                    <button key={d} type="button" aria-pressed={density === d} onClick={() => write(filters, sort, d)}>
                      {t(`archive.densities.${d}`)}
                    </button>
                  ))}
                </span>
              </div>
              <select className="archive-sort" value={sort} onChange={(e) => write(filters, e.target.value, density)} aria-label={t("archive.sortBy")}>
                {SORTS.map((value) => (
                  <option key={value} value={value}>
                    {t(`archive.sorts.${value}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {results.length === 0 ? (
            <div className="archive-empty">
              <h2>{t("archive.emptyTitle")}</h2>
              <p>{t("archive.emptyHint")}</p>
              {suggestions.length > 0 && (
                <ul className="archive-empty__suggestions">
                  {suggestions.map((chip) => (
                    <li key={chip.label}>
                      <button type="button" onClick={() => removeChip(chip.patch)}>
                        {t("archive.without", { filter: chip.label })}
                        <span>{t(chip.count === 1 ? "designer.piece" : "designer.pieces", { count: chip.count })}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button type="button" className="btn" onClick={resetAll}>
                {t("filters.reset")}
              </button>
            </div>
          ) : (
            <div className={`archive-grid archive-grid--${density}`}>
              {visible.map((obj) => (
                <ObjectCard key={obj.id} object={obj} onOpen={(object) => setLightboxId(object.id)} />
              ))}
            </div>
          )}

          {results.length > 0 && (
            <div className="archive-more">
              <p className="archive-more__count">{t("archive.showing", { shown: visible.length, total: results.length })}</p>
              {hasMore && (
                <button type="button" className="btn" onClick={loadMore}>
                  {t("archive.loadMore")}
                </button>
              )}
              <span ref={sentinel} className="archive-more__sentinel" aria-hidden="true" />
            </div>
          )}
        </div>
      </div>

      {lightboxIndex !== -1 && (
        <PhotoLightbox
          objects={photographed}
          index={lightboxIndex}
          onClose={() => setLightboxId(null)}
          onNavigate={(i) => setLightboxId(photographed[i].id)}
        />
      )}
    </div>
  );
}
