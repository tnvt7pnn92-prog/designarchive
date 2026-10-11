import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { OBJECTS } from "../data/objects.js";
import SmartImage from "./SmartImage.jsx";
import { MATERIALS, MATERIAL_FAMILIES } from "../data/materials.js";
import { COLORS, COLOR_GROUPS } from "../data/moodboardColors.js";
import { STICKERS, STICKER_CATEGORIES } from "../data/stickers.js";
import { FONTS, SHAPE_KINDS } from "../lib/moodboard.js";
import { ARROW_PRESETS, PALETTES, TEXT_PRESETS } from "../lib/moodboardPresets.js";
import { useCollection } from "../lib/collection.js";
import { removeCustomColor, removeCustomMaterial, useLibrary } from "../lib/moodboardLibrary.js";
import { useLibraryDrag } from "../lib/useLibraryDrag.js";
import MoodboardIcon from "./MoodboardIcon.jsx";
import "./MoodboardSidebar.css";

// The icon bar: each opens its drawer. Arrows and shapes share one.
const TABS = [
  ["pieces", "pieces"],
  ["materials", "materials"],
  ["colors", "colors"],
  ["text", "text"],
  ["arrows", "arrow"],
  ["stickers", "sticker"],
];
const PHOTO_LIMIT = 24;
const PHOTO_OBJECTS = OBJECTS.filter((o) => o.image);

const norm = (s = "") => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const ARROW_ART = {
  curved: (
    <>
      <path d="M8 34C22 12 44 9 64 17" />
      <path d="m56 10 8 7-9 5" />
    </>
  ),
  straight: (
    <>
      <path d="M8 22h56" />
      <path d="m56 15 8 7-8 7" />
    </>
  ),
  dashed: (
    <>
      <path d="M8 32C24 16 44 13 64 19" strokeDasharray="5 5" />
      <path d="m56 12 8 7-9 4" />
    </>
  ),
  line: <path d="M8 22h58" />,
};

const SHAPE_ART = {
  rect: <rect x="6" y="12" width="36" height="24" />,
  circle: <circle cx="24" cy="24" r="17" />,
  arch: <path d="M11 42V22a13 13 0 0 1 26 0v20Z" />,
};

function SearchField({ value, onChange, placeholder, t }) {
  return (
    <div className="mb-side__search">
      <MoodboardIcon name="search" size={14} />
      <input type="search" value={value} placeholder={placeholder} aria-label={placeholder} onChange={(e) => onChange(e.target.value)} />
      {value && (
        <button type="button" onClick={() => onChange("")} aria-label={t("moodboard.clearSearch")}>
          <MoodboardIcon name="close" size={12} />
        </button>
      )}
    </div>
  );
}

function RemoveButton({ label, onClick }) {
  return (
    <button type="button" className="mb-side__remove" aria-label={label} title={label} onClick={onClick}>
      <MoodboardIcon name="close" size={11} />
    </button>
  );
}

// A piece in the drawer: its photo and a small label, with the collection's stamp.
function PieceItem({ object, status, drag, t }) {
  return (
    <button
      type="button"
      className="mb-side__item mb-side__piece"
      title={`${object.name} — ${object.designer}, ${object.year}`}
      aria-label={`${object.name} — ${object.designer}, ${object.year}`}
      {...drag.handlers({ kind: "photo", objectId: object.id, preview: { src: object.image } })}
    >
      <span className="mb-side__piece-img">
        <SmartImage src={object.image} cutout={object.cutout} alt="" card category={object.category} draggable={false} />
      </span>
      <span className="mb-side__piece-label">
        <span className="mb-side__piece-name">{object.name}</span>
        <span className="mb-side__piece-by">
          {object.designer.split(/[,&]/)[0].trim()}, {object.year}
        </span>
        {(status === "own" || status === "want") && <span className={`mb-side__stamp is-${status}`}>{t(`collection.status.${status}`)}</span>}
      </span>
    </button>
  );
}

// Pieces like the ones already on the board: the same decade, or a style in common.
function suggestionsFor(elements) {
  const onBoard = new Set(elements.filter((el) => el.type === "photo").map((el) => el.objectId));
  const placed = OBJECTS.filter((o) => onBoard.has(o.id));
  if (!placed.length) return [];
  const decades = new Set(placed.map((o) => Math.floor(o.year / 10)));
  const styles = new Set(placed.flatMap((o) => o.styles ?? []));
  const score = (o) => (decades.has(Math.floor(o.year / 10)) ? 2 : 0) + ((o.styles ?? []).some((s) => styles.has(s)) ? 1 : 0);
  return PHOTO_OBJECTS.filter((o) => !onBoard.has(o.id) && score(o) >= 2)
    .sort((a, b) => score(b) - score(a))
    .slice(0, 12);
}

function PiecesSection({ drag, onUpload, elements, t }) {
  const [query, setQuery] = useState("");
  const fileRef = useRef(null);
  const items = useCollection();
  const statusOf = useMemo(() => new Map(items.map((item) => [item.id, item.status])), [items]);
  const results = useMemo(() => {
    const q = norm(query.trim());
    return q ? PHOTO_OBJECTS.filter((o) => norm(`${o.name} ${o.designer} ${o.brand ?? ""} ${o.category} ${o.year}`).includes(q)).slice(0, PHOTO_LIMIT) : [];
  }, [query]);
  const mine = useMemo(() => {
    const byId = new Map(PHOTO_OBJECTS.map((o) => [o.id, o]));
    return items.filter((item) => item.status === "own" || item.status === "want").map((item) => byId.get(item.id)).filter(Boolean);
  }, [items]);
  const suggested = useMemo(() => suggestionsFor(elements), [elements]);
  const grid = (list) => (
    <div className="mb-side__grid mb-side__grid--pieces">
      {list.map((o) => (
        <PieceItem key={o.id} object={o} status={statusOf.get(o.id)} drag={drag} t={t} />
      ))}
    </div>
  );

  return (
    <>
      <SearchField value={query} onChange={setQuery} placeholder={t("moodboard.searchPhotos")} t={t} />
      {query ? (
        results.length ? grid(results) : <p className="mb-side__empty">{t("moodboard.noResults")}</p>
      ) : (
        <>
          <div className="mb-side__group">
            <p className="mb-side__label">{t("moodboard.fromCollection")}</p>
            {mine.length ? grid(mine) : <p className="mb-side__empty">{t("moodboard.collectionEmpty")}</p>}
          </div>
          <div className="mb-side__group">
            <p className="mb-side__label">{suggested.length ? t("moodboard.suggested") : t("moodboard.fromArchive")}</p>
            {grid(suggested.length ? suggested : PHOTO_OBJECTS.slice(0, 12))}
          </div>
        </>
      )}
      <button type="button" className="mb-side__create" onClick={() => fileRef.current?.click()}>
        <MoodboardIcon name="upload" size={14} /> {t("moodboard.uploadPhoto")}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = "";
        }}
      />
    </>
  );
}
function MaterialsSection({ drag, onCreate, t }) {
  const library = useLibrary();
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("all");
  const q = norm(query.trim());

  const metaFor = (m) => m.meta ?? [t(`moodboard.families.${m.family}`), ...(m.tags ?? []).slice(0, 2)].join(" · ");
  const matches = (m) =>
    (family === "all" || m.family === family) &&
    (!q || norm(`${m.name} ${metaFor(m)} ${(m.tags ?? []).join(" ")}`).includes(q));

  const card = (m) => (
    <div key={m.id} className="mb-side__cell">
      <button
        type="button"
        className="mb-side__item mb-side__material"
        aria-label={`${m.name} — ${metaFor(m)}`}
        {...drag.handlers({ kind: "material", material: m, meta: metaFor(m), preview: { src: m.src } })}
      >
        <span className="mb-side__material-img">
          <img src={m.src} alt="" loading="lazy" draggable={false} />
        </span>
        <span className="mb-side__material-name">{m.name}</span>
        <span className="mb-side__material-meta">{metaFor(m)}</span>
      </button>
      {m.custom && (
        <RemoveButton label={`${t("moodboard.removeFromLibrary")}: ${m.name}`} onClick={() => removeCustomMaterial(m.id)} />
      )}
    </div>
  );

  const own = library.materials.filter(matches);
  const builtIn = MATERIALS.filter(matches);

  return (
    <>
      <button type="button" className="mb-side__create" onClick={() => onCreate("material")}>
        <MoodboardIcon name="plus" size={14} /> {t("moodboard.createMaterial")}
      </button>
      <SearchField value={query} onChange={setQuery} placeholder={t("moodboard.searchMaterials")} t={t} />
      <div className="mb-side__chips" role="group" aria-label={t("moodboard.sections.materials")}>
        {["all", ...MATERIAL_FAMILIES].map((f) => (
          <button key={f} type="button" aria-pressed={family === f} onClick={() => setFamily(f)}>
            {f === "all" ? t("moodboard.all") : t(`moodboard.families.${f}`)}
          </button>
        ))}
      </div>
      {own.length > 0 && (
        <div className="mb-side__group">
          <p className="mb-side__label">{t("moodboard.yourMaterials")}</p>
          <div className="mb-side__grid mb-side__grid--materials">{own.map(card)}</div>
        </div>
      )}
      <div className="mb-side__grid mb-side__grid--materials">{builtIn.map(card)}</div>
      {!own.length && !builtIn.length && <p className="mb-side__empty">{t("moodboard.noResults")}</p>}
    </>
  );
}

// Ready-made palettes (added as a row of chips), and the colours of the selected photo.
function PalettesGroup({ onPalette, extractSource, t }) {
  const [state, setState] = useState({ for: null, colors: null, error: false });
  const current = state.for === extractSource ? state : { colors: null, error: false };

  async function extract() {
    const { extractPalette } = await import("../lib/extractPalette.js");
    try {
      setState({ for: extractSource, colors: await extractPalette(extractSource), error: false });
    } catch {
      setState({ for: extractSource, colors: null, error: true });
    }
  }

  return (
    <>
      <div className="mb-side__group">
        <p className="mb-side__label">{t("moodboard.palettesTitle")}</p>
        <div className="mb-side__palettes">
          {PALETTES.map((palette) => (
            <button key={palette.id} type="button" className="mb-side__palette" onClick={() => onPalette(palette.colors, t(`moodboard.palettes.${palette.id}`))}>
              <span className="mb-side__palette-chips" aria-hidden="true">
                {palette.colors.map((hex) => (
                  <span key={hex} style={{ background: hex }} />
                ))}
              </span>
              <span className="mb-side__palette-name">{t(`moodboard.palettes.${palette.id}`)}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="mb-side__group">
        <button type="button" className="mb-side__create" onClick={extract} disabled={!extractSource}>
          <MoodboardIcon name="eyedropper" size={14} /> {t("moodboard.extract")}
        </button>
        {!extractSource && <p className="mb-side__empty">{t("moodboard.extractHint")}</p>}
        {current.error && <p className="mb-side__empty">{t("moodboard.extractError")}</p>}
        {current.colors && (
          <button type="button" className="mb-side__palette" onClick={() => onPalette(current.colors, t("moodboard.extracted"))}>
            <span className="mb-side__palette-chips" aria-hidden="true">
              {current.colors.map((hex) => (
                <span key={hex} style={{ background: hex }} />
              ))}
            </span>
            <span className="mb-side__palette-name">{t("moodboard.addExtracted")}</span>
          </button>
        )}
      </div>
    </>
  );
}

function ColorsSection({ drag, onCreate, onPalette, extractSource, t }) {
  const library = useLibrary();

  const chip = (c) => (
    <div key={c.id} className="mb-side__cell">
      <button
        type="button"
        className="mb-side__item mb-side__color"
        aria-label={`${c.name} ${c.hex}`}
        {...drag.handlers({ kind: "color", color: c, preview: { hex: c.hex } })}
      >
        <span className="mb-side__chip" style={{ background: c.hex }} />
        <span className="mb-side__color-name">{c.name}</span>
        <span className="mb-side__color-hex">{c.hex}</span>
      </button>
      {c.custom && <RemoveButton label={`${t("moodboard.removeFromLibrary")}: ${c.name}`} onClick={() => removeCustomColor(c.id)} />}
    </div>
  );

  return (
    <>
      <PalettesGroup onPalette={onPalette} extractSource={extractSource} t={t} />
      <button type="button" className="mb-side__create" onClick={() => onCreate("color")}>
        <MoodboardIcon name="plus" size={14} /> {t("moodboard.createColor")}
      </button>
      {library.colors.length > 0 && (
        <div className="mb-side__group">
          <p className="mb-side__label">{t("moodboard.yourColors")}</p>
          <div className="mb-side__grid mb-side__grid--colors">{library.colors.map(chip)}</div>
        </div>
      )}
      {COLOR_GROUPS.map((group) => (
        <div key={group} className="mb-side__group">
          <p className="mb-side__label">{t(`moodboard.colorGroups.${group}`)}</p>
          <div className="mb-side__grid mb-side__grid--colors">{COLORS.filter((c) => c.group === group).map(chip)}</div>
        </div>
      ))}
    </>
  );
}

function TextSection({ drag, t }) {
  return (
    <div className="mb-side__list">
      {TEXT_PRESETS.map((p) => (
        <button
          key={p.id}
          type="button"
          className={`mb-side__item mb-side__text is-${p.id}`}
          {...drag.handlers({ kind: "text", preset: p, preview: { text: t(`moodboard.presetText.${p.id}`) } })}
        >
          <span className="mb-side__text-sample" style={{ fontFamily: FONTS[p.style.font].family }}>
            {t(`moodboard.presetText.${p.id}`)}
          </span>
          <span className="mb-side__text-name">{t(`moodboard.textPresets.${p.id}`)}</span>
        </button>
      ))}
    </div>
  );
}

function ArrowsSection({ drag, t }) {
  return (
    <div className="mb-side__grid mb-side__grid--arrows">
      {ARROW_PRESETS.map((p) => (
        <button
          key={p.id}
          type="button"
          className="mb-side__item mb-side__tool"
          {...drag.handlers({ kind: "arrow", preset: p, preview: { text: t(`moodboard.arrowPresets.${p.id}`) } })}
        >
          <svg viewBox="0 0 72 44" aria-hidden="true">
            {ARROW_ART[p.id]}
          </svg>
          <span>{t(`moodboard.arrowPresets.${p.id}`)}</span>
        </button>
      ))}
    </div>
  );
}

function ShapesSection({ drag, t }) {
  return (
    <div className="mb-side__grid mb-side__grid--shapes">
      {SHAPE_KINDS.map((kind) => (
        <button
          key={kind}
          type="button"
          className="mb-side__item mb-side__tool mb-side__tool--shape"
          {...drag.handlers({ kind: "shape", shape: kind, preview: { text: t(`moodboard.shapeKinds.${kind}`) } })}
        >
          <svg viewBox="0 0 48 48" aria-hidden="true">
            {SHAPE_ART[kind]}
          </svg>
          <span>{t(`moodboard.shapeKinds.${kind}`)}</span>
        </button>
      ))}
    </div>
  );
}

function StickersSection({ drag, t }) {
  const [category, setCategory] = useState(STICKER_CATEGORIES[0]);
  return (
    <>
      <div className="mb-side__chips" role="tablist">
        {STICKER_CATEGORIES.map((c) => (
          <button key={c} type="button" role="tab" aria-selected={category === c} aria-pressed={category === c} onClick={() => setCategory(c)}>
            {t(`moodboard.stickerCats.${c}`)}
          </button>
        ))}
      </div>
      <div className="mb-side__grid mb-side__grid--stickers" role="tabpanel">
        {STICKERS.filter((s) => s.category === category).map((s) => (
          <button
            key={s.id}
            type="button"
            className="mb-side__item mb-side__sticker"
            aria-label={t("moodboard.addSticker")}
            {...drag.handlers({ kind: "sticker", stickerId: s.id, preview: { src: s.src, width: s.width * 0.7 } })}
          >
            <img src={s.src} alt="" draggable={false} />
          </button>
        ))}
      </div>
    </>
  );
}

function DragGhost({ ghost }) {
  if (!ghost) return null;
  const { preview } = ghost.item;
  let body;
  if (preview.src) body = <img src={preview.src} alt="" style={{ width: preview.width ?? 96 }} />;
  else if (preview.hex) body = <span className="mb-ghost__chip" style={{ background: preview.hex }} />;
  else body = <span className="mb-ghost__label">{preview.text}</span>;
  return createPortal(
    <div className="mb-ghost" style={{ left: ghost.x, top: ghost.y }}>
      {body}
    </div>,
    document.body
  );
}


// The icon bar on the left of the board, and the drawer each icon opens (a sheet from the bottom
// on a phone). Items are dragged onto the board, or clicked to land in the middle of it. Esc or
// the same icon closes the drawer and gives the whole width back to the board.
export default function MoodboardSidebar({ open, onOpen, onPick, onDrop, onDragChange, onUpload, onCreate, onPalette, extractSource, elements }) {
  const { t } = useLanguage();
  const drag = useLibraryDrag({ onPick, onDrop, onDragChange });
  const drawerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && !e.defaultPrevented && onOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpen]);

  const content = {
    pieces: <PiecesSection drag={drag} onUpload={onUpload} elements={elements} t={t} />,
    materials: <MaterialsSection drag={drag} onCreate={onCreate} t={t} />,
    colors: <ColorsSection drag={drag} onCreate={onCreate} onPalette={onPalette} extractSource={extractSource} t={t} />,
    text: <TextSection drag={drag} t={t} />,
    arrows: (
      <>
        <ArrowsSection drag={drag} t={t} />
        <p className="mb-side__label">{t("moodboard.sections.shapes")}</p>
        <ShapesSection drag={drag} t={t} />
      </>
    ),
    stickers: <StickersSection drag={drag} t={t} />,
  };

  return (
    <>
      <nav className="mb-rail" aria-label={t("moodboard.elements")}>
        {TABS.map(([id, icon]) => (
          <button
            key={id}
            type="button"
            className="mb-rail__btn"
            aria-pressed={open === id}
            aria-controls={open === id ? "mb-drawer" : undefined}
            onClick={() => onOpen(open === id ? null : id)}
            title={t(`moodboard.sections.${id}`)}
          >
            <MoodboardIcon name={icon} size={20} />
            <span>{t(`moodboard.rail.${id}`)}</span>
          </button>
        ))}
      </nav>
      {open && (
        <aside id="mb-drawer" ref={drawerRef} className="mb-drawer" aria-label={t(`moodboard.sections.${open}`)}>
          <header className="mb-drawer__head">
            <div>
              <h2>{t(`moodboard.sections.${open}`)}</h2>
              <p>{t(`moodboard.sectionHints.${open}`)}</p>
            </div>
            <button type="button" className="mb-icon-btn" onClick={() => onOpen(null)} aria-label={t("moodboard.closePanel")} title={t("moodboard.closePanel")}>
              <MoodboardIcon name="close" />
            </button>
          </header>
          <div className="mb-drawer__scroll">{content[open]}</div>
        </aside>
      )}
      <DragGhost ghost={drag.ghost} />
    </>
  );
}
