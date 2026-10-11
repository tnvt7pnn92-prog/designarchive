import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { objectById } from "../data/indexes.js";
import { STATUSES, useCollection } from "../lib/collection.js";
import { useCollectionAction } from "../lib/useRoomToggle.js";
import { loadFullGuide } from "../lib/guide.js";
import { ARROW_DASHES, ARROW_HEADS, FONTS, FONT_KEYS, SHAPE_KINDS, SWATCHES } from "../lib/moodboard.js";
import { splitTags } from "../lib/moodboardPresets.js";
import { hexToRgb, normalizeHex } from "../data/moodboardColors.js";
import MoodboardIcon from "./MoodboardIcon.jsx";

const HEAD_ICONS = { triangle: "headTriangle", open: "headOpen", circle: "headCircle", bar: "headBar", none: "headNone" };
const ALIGNS = [
  ["left", "alignLeft"],
  ["center", "alignCenter"],
  ["right", "alignRight"],
];

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

function Field({ label, children }) {
  return (
    <div className="mb-field">
      <span className="mb-field__label">{label}</span>
      {children}
    </div>
  );
}

function Segmented({ label, options, value, onChange }) {
  return (
    <div className="mb-seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          title={o.title}
          aria-label={o.title}
          onClick={() => onChange(o.value)}
        >
          {o.icon ? <MoodboardIcon name={o.icon} /> : o.text}
        </button>
      ))}
    </div>
  );
}

function Toggle({ label, icon, pressed, onToggle }) {
  return (
    <div className="mb-seg">
      <button type="button" aria-pressed={pressed} title={label} aria-label={label} onClick={onToggle}>
        <MoodboardIcon name={icon} />
      </button>
    </div>
  );
}

function Swatches({ label, customLabel, value, onChange }) {
  const current = value.toLowerCase();
  return (
    <div className="mb-swatches" role="group" aria-label={label}>
      {SWATCHES.map((c) => (
        <button
          key={c}
          type="button"
          className="mb-swatch"
          style={{ "--swatch": c }}
          aria-pressed={current === c}
          aria-label={c}
          title={c}
          onClick={() => onChange(c)}
        />
      ))}
      <label className="mb-swatch mb-swatch--custom" title={customLabel} aria-pressed={!SWATCHES.includes(current)}>
        <input type="color" value={current} onChange={(e) => onChange(e.target.value, "color")} aria-label={customLabel} />
      </label>
    </div>
  );
}

function Stepper({ label, value, min, max, step, onChange }) {
  const set = (v, coalesce) => onChange(clamp(v, min, max), coalesce);
  return (
    <div className="mb-stepper" role="group" aria-label={label}>
      <button type="button" onClick={() => set(value - step, "step")} aria-label={`${label} −`}>
        <MoodboardIcon name="minus" size={14} />
      </button>
      <input
        type="number"
        min={min}
        max={max}
        value={Math.round(value)}
        aria-label={label}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v) && v > 0) set(v, "typing");
        }}
      />
      <button type="button" onClick={() => set(value + step, "step")} aria-label={`${label} +`}>
        <MoodboardIcon name="plus" size={14} />
      </button>
    </div>
  );
}

function TextControls({ el, onUpdate, onEditText, t }) {
  return (
    <>
      <Field label={t("moodboard.font")}>
        <select
          className="mb-select"
          value={el.font}
          onChange={(e) => onUpdate({ font: e.target.value })}
          style={{ fontFamily: FONTS[el.font]?.family }}
        >
          {FONT_KEYS.map((k) => (
            <option key={k} value={k} style={{ fontFamily: FONTS[k].family }}>
              {t(`moodboard.fonts.${k}`)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("moodboard.size")}>
        <Stepper
          label={t("moodboard.size")}
          value={el.fontSize}
          min={8}
          max={320}
          step={2}
          onChange={(fontSize, coalesce) => onUpdate({ fontSize }, coalesce)}
        />
      </Field>
      <div className="mb-seg" role="group" aria-label={t("moodboard.style")}>
        <button
          type="button"
          aria-pressed={el.bold}
          title={t("moodboard.bold")}
          aria-label={t("moodboard.bold")}
          onClick={() => onUpdate({ bold: !el.bold })}
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          aria-pressed={el.italic}
          title={t("moodboard.italic")}
          aria-label={t("moodboard.italic")}
          onClick={() => onUpdate({ italic: !el.italic })}
        >
          <em className="mb-italic-glyph">I</em>
        </button>
      </div>
      <Segmented
        label={t("moodboard.align")}
        value={el.align}
        onChange={(align) => onUpdate({ align })}
        options={ALIGNS.map(([value, icon]) => ({ value, icon, title: t(`moodboard.aligns.${value}`) }))}
      />
      <Field label={t("moodboard.color")}>
        <Swatches
          label={t("moodboard.color")}
          customLabel={t("moodboard.customColor")}
          value={el.fill}
          onChange={(fill, coalesce) => onUpdate({ fill }, coalesce)}
        />
      </Field>
      <button type="button" className="mb-pill" onClick={onEditText}>
        <MoodboardIcon name="edit" /> {t("moodboard.editText")}
      </button>
    </>
  );
}

function ArrowControls({ el, onUpdate, t }) {
  const curved = el.bend !== 0;
  const double = el.headStart !== "none";
  const [x1, y1, x2, y2] = el.points;
  const length = Math.hypot(x2 - x1, y2 - y1);

  return (
    <>
      <Segmented
        label={t("moodboard.shape")}
        value={curved ? "curved" : "straight"}
        onChange={(v) => onUpdate({ bend: v === "curved" ? -Math.max(30, length * 0.25) : 0 })}
        options={[
          { value: "straight", icon: "straight", title: t("moodboard.straight") },
          { value: "curved", icon: "curved", title: t("moodboard.curved") },
        ]}
      />
      <Field label={t("moodboard.color")}>
        <Swatches
          label={t("moodboard.color")}
          customLabel={t("moodboard.customColor")}
          value={el.stroke}
          onChange={(stroke, coalesce) => onUpdate({ stroke }, coalesce)}
        />
      </Field>
      <Field label={t("moodboard.thickness")}>
        <Stepper
          label={t("moodboard.thickness")}
          value={el.strokeWidth}
          min={1}
          max={24}
          step={1}
          onChange={(strokeWidth, coalesce) => onUpdate({ strokeWidth }, coalesce)}
        />
      </Field>
      <Segmented
        label={t("moodboard.lineStyle")}
        value={el.dash}
        onChange={(dash) => onUpdate({ dash })}
        options={ARROW_DASHES.map((d) => ({ value: d, icon: d, title: t(`moodboard.dashes.${d}`) }))}
      />
      <Field label={t("moodboard.head")}>
        <Segmented
          label={t("moodboard.head")}
          value={el.headEnd}
          onChange={(h) => onUpdate(double ? { headEnd: h, headStart: h === "none" ? "none" : h } : { headEnd: h })}
          options={ARROW_HEADS.map((h) => ({ value: h, icon: HEAD_ICONS[h], title: t(`moodboard.heads.${h}`) }))}
        />
      </Field>
      <div className="mb-seg" role="group" aria-label={t("moodboard.doubleHead")}>
        <button
          type="button"
          aria-pressed={double}
          title={t("moodboard.doubleHead")}
          aria-label={t("moodboard.doubleHead")}
          onClick={() =>
            onUpdate({ headStart: double ? "none" : el.headEnd === "none" ? "triangle" : el.headEnd, ...(el.headEnd === "none" && !double ? { headEnd: "triangle" } : {}) })
          }
        >
          <MoodboardIcon name="double" />
        </button>
      </div>
    </>
  );
}

// Tag chips with an inline "add tag" field (Enter or comma adds, Backspace on empty removes).
function TagEditor({ tags = [], onChange, t }) {
  const [draft, setDraft] = useState("");
  const commit = () => {
    const added = splitTags(draft);
    if (added.length) onChange([...new Set([...tags, ...added])]);
    setDraft("");
  };

  return (
    <div className="mb-tags">
      {tags.map((tag) => (
        <span key={tag} className="mb-tag">
          {tag}
          <button
            type="button"
            aria-label={`${t("moodboard.removeTag")}: ${tag}`}
            onClick={() => onChange(tags.filter((x) => x !== tag))}
          >
            ×
          </button>
        </span>
      ))}
      <input
        className="mb-tags__input"
        value={draft}
        placeholder={`+ ${t("moodboard.addTag")}`}
        aria-label={t("moodboard.addTag")}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          } else if (e.key === "Backspace" && !draft && tags.length) {
            onChange(tags.slice(0, -1));
          }
        }}
      />
    </div>
  );
}

function NameField({ el, onUpdate, t }) {
  return (
    <input
      className="mb-input mb-input--name"
      value={el.name ?? ""}
      aria-label={t("moodboard.name")}
      placeholder={t("moodboard.name")}
      onChange={(e) => onUpdate({ name: e.target.value }, "typing")}
    />
  );
}

function MaterialControls({ el, onUpdate, t }) {
  return (
    <>
      <NameField el={el} onUpdate={onUpdate} t={t} />
      <input
        className="mb-input mb-input--meta"
        value={el.meta ?? ""}
        aria-label={t("moodboard.details")}
        placeholder={t("moodboard.details")}
        onChange={(e) => onUpdate({ meta: e.target.value }, "typing")}
      />
      <Field label={t("moodboard.tags")}>
        <TagEditor key={el.id} tags={el.tags} onChange={(tags) => onUpdate({ tags })} t={t} />
      </Field>
      <Toggle label={t("moodboard.showLabel")} icon="caption" pressed={el.showLabel} onToggle={() => onUpdate({ showLabel: !el.showLabel })} />
    </>
  );
}

function ColorControls({ el, onUpdate, t }) {
  // While typing, the field shows the draft; the swatch updates as soon as it's a valid HEX.
  const [draft, setDraft] = useState(null);

  return (
    <>
      <NameField el={el} onUpdate={onUpdate} t={t} />
      <Field label={t("moodboard.hex")}>
        <label className="mb-swatch mb-swatch--custom" style={{ background: el.hex }} title={t("moodboard.customColor")}>
          <input
            type="color"
            value={el.hex.toLowerCase()}
            aria-label={t("moodboard.customColor")}
            onChange={(e) => onUpdate({ hex: e.target.value.toUpperCase() }, "color")}
          />
        </label>
        <input
          className="mb-input mb-input--hex"
          value={draft ?? el.hex}
          aria-label={t("moodboard.hex")}
          aria-invalid={draft !== null && !normalizeHex(draft)}
          spellCheck={false}
          onChange={(e) => {
            setDraft(e.target.value);
            const hex = normalizeHex(e.target.value);
            if (hex && e.target.value.replace("#", "").length === 6) onUpdate({ hex }, "typing");
          }}
          onBlur={() => {
            const hex = normalizeHex(draft);
            if (hex) onUpdate({ hex });
            setDraft(null);
          }}
        />
      </Field>
      <span className="mb-readout">RGB {hexToRgb(el.hex).join(" ")}</span>
      <Toggle label={t("moodboard.showLabel")} icon="caption" pressed={el.showLabel} onToggle={() => onUpdate({ showLabel: !el.showLabel })} />
    </>
  );
}

function ShapeControls({ el, onUpdate, t }) {
  return (
    <>
      <Segmented
        label={t("moodboard.shape")}
        value={el.kind}
        onChange={(kind) => onUpdate({ kind })}
        options={SHAPE_KINDS.map((k) => ({ value: k, icon: `shape-${k}`, title: t(`moodboard.shapeKinds.${k}`) }))}
      />
      <Field label={t("moodboard.fill")}>
        <Swatches
          label={t("moodboard.fill")}
          customLabel={t("moodboard.customColor")}
          value={el.fill}
          onChange={(fill, coalesce) => onUpdate({ fill }, coalesce)}
        />
      </Field>
      <Toggle label={t("moodboard.outline")} icon="outline" pressed={el.outline} onToggle={() => onUpdate({ outline: !el.outline })} />
    </>
  );
}

// The pieces of the archive: label on or off, the real measurements (from the complete buying
// verified facts — or why they are missing), the piece's state in the collection, and its page.
function PhotoControls({ el, object, onUpdate, t }) {
  const items = useCollection();
  const act = useCollectionAction();
  const status = items.find((item) => item.id === object.id)?.status ?? null;
  const [dims, setDims] = useState({ id: null, value: undefined });

  useEffect(() => {
    let alive = true;
    loadFullGuide(object.id).then((guide) => alive && setDims({ id: object.id, value: guide?.dimensions ?? null }));
    return () => {
      alive = false;
    };
  }, [object.id]);

  const measures = dims.id === object.id ? dims.value : undefined;
  const line = measures
    ? ["width", "depth", "height"]
        .filter((key) => measures[key])
        .map((key) => `${t(`guide.dims.${key}`)} ${measures[key]}`)
        .join(" · ") + ` ${measures.unit ?? "cm"}`
    : null;

  return (
    <>
      <div className="mb-insp__piece">
        <p className="mb-insp__name">{object.name}</p>
        <p className="mb-insp__by">
          {object.designer}, {object.year}
        </p>
      </div>
      <label className="mb-switch">
        <input type="checkbox" checked={el.showLabel !== false} onChange={() => onUpdate({ showLabel: el.showLabel === false })} />
        <span>{t("moodboard.showPieceLabel")}</span>
      </label>
      <Field label={t("moodboard.measures")}>
        {measures === undefined ? (
          <span className="mb-readout">…</span>
        ) : line ? (
          <span className="mb-readout">{line}</span>
        ) : (
          <span className="mb-insp__note">{t("moodboard.noMeasure")}</span>
        )}
      </Field>
      <Field label={t("moodboard.inCollection")}>
        <div className="mb-seg mb-seg--wrap" role="group" aria-label={t("moodboard.inCollection")}>
          {STATUSES.map((s) => (
            <button key={s} type="button" aria-pressed={status === s} onClick={() => act(object, s)}>
              {t(`collection.status.${s}`)}
            </button>
          ))}
        </div>
      </Field>
      <Link to={`/piece/${object.id}`} className="mb-pill mb-pill--ghost mb-insp__open">
        {t("moodboard.openPiece")} →
      </Link>
    </>
  );
}

// The title block: project, sheet number, author, shown or hidden. The room's name and the date
// come from the board itself.
function SheetControls({ cartouche, onChange, t }) {
  const field = (key, max) => (
    <label className="mb-insp__field">
      <span>{t(`moodboard.cartouche.${key}`)}</span>
      <input className="mb-input" value={cartouche[key]} maxLength={max} onChange={(e) => onChange({ ...cartouche, [key]: e.target.value })} />
    </label>
  );
  return (
    <>
      <p className="mb-insp__note">{t("moodboard.cartouche.intro")}</p>
      {field("project", 60)}
      {field("number", 12)}
      {field("author", 60)}
      <label className="mb-switch">
        <input type="checkbox" checked={!cartouche.hidden} onChange={() => onChange({ ...cartouche, hidden: !cartouche.hidden })} />
        <span>{t("moodboard.cartouche.show")}</span>
      </label>
    </>
  );
}

// Floating on the right of the board (a sheet from the bottom on a phone), only while something
// is selected: what the element is, its settings, and order / duplicate / delete. With
// `sheet` it edits the board's title block instead.
export default function MoodboardInspector({ el, sheet, onSheet, onClose, onUpdate, onEditText, onReorder, onDuplicate, onDelete }) {
  const { t } = useLanguage();
  const object = el?.type === "photo" ? objectById(el.objectId) : null;
  if (!el && !sheet) return null;

  return (
    <aside className="mb-insp" aria-label={el ? t(`moodboard.types.${el.type}`) : t("moodboard.cartouche.title")}>
      <header className="mb-insp__head">
        <span className="mb-insp__type">{el ? t(`moodboard.types.${el.type}`) : t("moodboard.cartouche.title")}</span>
        <button type="button" className="mb-icon-btn" onClick={onClose} aria-label={t("moodboard.closeInspector")} title={t("moodboard.closeInspector")}>
          <MoodboardIcon name="close" />
        </button>
      </header>
      <div className="mb-insp__body">
        {!el && <SheetControls cartouche={sheet} onChange={onSheet} t={t} />}
        {object && <PhotoControls el={el} object={object} onUpdate={onUpdate} t={t} />}
        {el?.type === "text" && <TextControls el={el} onUpdate={onUpdate} onEditText={onEditText} t={t} />}
        {el?.type === "arrow" && <ArrowControls el={el} onUpdate={onUpdate} t={t} />}
        {el?.type === "material" && <MaterialControls el={el} onUpdate={onUpdate} t={t} />}
        {el?.type === "color" && <ColorControls key={el.id} el={el} onUpdate={onUpdate} t={t} />}
        {el?.type === "shape" && <ShapeControls el={el} onUpdate={onUpdate} t={t} />}
      </div>
      {el && (
        <footer className="mb-insp__actions">
          <button type="button" className="mb-icon-btn" onClick={() => onReorder("forward")} title={t("moodboard.forward")} aria-label={t("moodboard.forward")}>
            <MoodboardIcon name="forward" />
          </button>
          <button type="button" className="mb-icon-btn" onClick={() => onReorder("backward")} title={t("moodboard.backward")} aria-label={t("moodboard.backward")}>
            <MoodboardIcon name="backward" />
          </button>
          <button type="button" className="mb-icon-btn" onClick={onDuplicate} title={t("moodboard.duplicate")} aria-label={t("moodboard.duplicate")}>
            <MoodboardIcon name="duplicate" />
          </button>
          <button type="button" className="mb-icon-btn is-danger" onClick={onDelete} title={t("moodboard.delete")} aria-label={t("moodboard.delete")}>
            <MoodboardIcon name="trash" />
          </button>
        </footer>
      )}
    </aside>
  );
}