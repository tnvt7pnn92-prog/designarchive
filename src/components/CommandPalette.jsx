import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { OBJECTS } from "../data/objects.js";
import { BY_DESIGNER } from "../data/indexes.js";
import { publishedStories } from "../data/stories.js";
import { cardImage } from "../lib/imageUrls.js";
import { bestScore, normalize } from "../lib/fuzzy.js";
import { FOOTER_ITEMS } from "../lib/nav.js";
import { marketPath } from "../lib/marketPaths.js";
import { useToday } from "../lib/today.js";
import SmartImage from "./SmartImage.jsx";
import "./CommandPalette.css";

// How many results each group shows.
const LIMITS = { pieces: 6, designers: 4, stories: 3, markets: 4 };

// Searchable text is prepared once, when the palette's code first loads.
const PIECES = OBJECTS.map((o) => ({
  key: `p:${o.id}`,
  href: `/piece/${o.id}`,
  title: o.name,
  sub: `${o.designer} · ${o.year}`,
  thumb: o.image ? cardImage(o.image) : null,
  category: o.category,
  fields: [normalize(o.name), normalize(o.designer), normalize(o.brand)],
}));

const DESIGNERS = [...BY_DESIGNER.values()].map((d) => ({
  key: `d:${d.slug}`,
  href: `/designer/${d.slug}`,
  title: d.name,
  count: d.objects.length,
  fields: [normalize(d.name)],
}));

function top(entries, query, limit) {
  const scored = [];
  for (const entry of entries) {
    const score = bestScore(query, entry.fields);
    if (score >= 0) scored.push([score, entry]);
  }
  return scored
    .sort((a, b) => b[0] - a[0])
    .slice(0, limit)
    .map(([, entry]) => entry);
}

// The global search (Ctrl/Cmd+K, or the magnifier in the header): pieces, designers, stories
// and markets in one list, grouped, driven from the keyboard. Follows the ARIA combobox pattern:
// focus stays in the field and the arrow keys move the highlighted option.
export default function CommandPalette({ onClose }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { today } = useToday();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState({ query: "", index: 0 });
  const [markets, setMarkets] = useState([]);
  const listRef = useRef(null);

  // Markets are the heaviest list on the site; they join the results a moment later.
  useEffect(() => {
    let alive = true;
    import("../data/marketIndex.js").then(({ MARKET_ITEMS }) => {
      if (!alive) return;
      setMarkets(
        MARKET_ITEMS.map((m) => ({
          key: `m:${m.id}`,
          href: marketPath(m),
          title: m.name,
          sub: m.city,
          fields: [normalize(m.name), normalize(m.city)],
        }))
      );
    });
    return () => {
      alive = false;
    };
  }, []);

  // The page behind stays still while the palette is open.
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, []);

  const stories = useMemo(
    () =>
      publishedStories(today).map((s) => ({
        key: `s:${s.id}`,
        href: `/stories/${s.id}`,
        title: s.title,
        sub: s.hook,
        fields: [normalize(s.title), normalize(s.hook)],
      })),
    [today]
  );

  const q = normalize(query.trim());
  const groups = useMemo(() => {
    if (!q) {
      return [
        {
          id: "go",
          label: t("palette.goTo"),
          items: [
            ...FOOTER_ITEMS.map((item) => ({ key: `n:${item.to}`, href: item.to, title: t(item.key) })),
            { key: "n:/account", href: "/account", title: t("nav.account") },
          ],
        },
      ];
    }
    return [
      { id: "pieces", label: t("palette.pieces"), items: top(PIECES, q, LIMITS.pieces) },
      {
        id: "designers",
        label: t("palette.designers"),
        items: top(DESIGNERS, q, LIMITS.designers).map((d) => ({
          ...d,
          sub: t(d.count === 1 ? "designer.piece" : "designer.pieces", { count: d.count }),
        })),
      },
      { id: "stories", label: t("palette.stories"), items: top(stories, q, LIMITS.stories) },
      { id: "markets", label: t("palette.markets"), items: top(markets, q, LIMITS.markets) },
      {
        id: "archive",
        label: t("nav.archive"),
        items: [{ key: "a:q", href: `/archive?q=${encodeURIComponent(query.trim())}`, title: t("palette.searchArchive", { query: query.trim() }) }],
      },
    ].filter((group) => group.items.length > 0);
  }, [q, query, markets, stories, t]);

  const flat = groups.flatMap((group) => group.items);
  const active = cursor.query === query ? Math.min(cursor.index, flat.length - 1) : 0;
  const optionId = (i) => `palette-option-${i}`;

  useEffect(() => {
    document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function go(item) {
    if (!item) return;
    onClose();
    navigate(item.href);
  }

  function onKeyDown(e) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setCursor({ query, index: (active + step + flat.length) % flat.length });
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(flat[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "Tab") {
      // Focus stays in the field: the list is reached with the arrow keys.
      e.preventDefault();
    }
  }

  let index = -1;
  // Rendered on the body: inside the header, whose blurred background makes it the containing block
  // of anything fixed, the full-screen palette would be squeezed into the header's 76 px.
  return createPortal(
    <div className="palette" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="palette__dialog" role="dialog" aria-modal="true" aria-label={t("palette.label")}>
        <div className="palette__field">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            autoFocus
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-autocomplete="list"
            aria-activedescendant={flat.length ? optionId(active) : undefined}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t("palette.placeholder")}
            aria-label={t("palette.placeholder")}
            spellCheck="false"
            autoComplete="off"
          />
          <button type="button" className="palette__close" onClick={onClose} aria-label={t("search.close")}>
            <kbd>Esc</kbd>
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className="palette__list" id="palette-list" role="listbox" ref={listRef} aria-label={t("palette.label")}>
          {groups.map((group) => (
            <div key={group.id} role="group" aria-labelledby={`palette-group-${group.id}`} className="palette__group">
              <div className="palette__group-label" id={`palette-group-${group.id}`}>
                {group.label}
              </div>
              {group.items.map((item) => {
                index += 1;
                const i = index;
                return (
                  <div
                    key={item.key}
                    id={optionId(i)}
                    role="option"
                    aria-selected={i === active}
                    className={`palette__option${i === active ? " is-active" : ""}`}
                    onMouseMove={() => i !== active && setCursor({ query, index: i })}
                    onClick={() => go(item)}
                  >
                    {group.id === "pieces" && (
                      <SmartImage src={item.thumb} alt="" category={item.category} ratio="1" className="palette__thumb" />
                    )}
                    <span className="palette__text">
                      <span className="palette__title">{item.title}</span>
                      {item.sub && <span className="palette__sub">{item.sub}</span>}
                    </span>
                    <span className="palette__enter" aria-hidden="true">
                      ↵
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
          {q && flat.length <= 1 && <p className="palette__none">{t("palette.none")}</p>}
        </div>

        <div className="palette__hints" aria-hidden="true">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> {t("palette.hintMove")}
          </span>
          <span>
            <kbd>↵</kbd> {t("palette.hintOpen")}
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}
