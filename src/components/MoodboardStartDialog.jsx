import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { OBJECTS } from "../data/objects.js";
import { BACKGROUNDS, NEW_FORMATS, FORMATS } from "../lib/moodboard.js";
import { TEMPLATES, templatePieces } from "../lib/moodboardPresets.js";
import { collectionContent, collectionStartCount, templateContent } from "../lib/moodboardStart.js";
import { useCollection } from "../lib/collection.js";
import SmartImage from "./SmartImage.jsx";
import "./MoodboardStartDialog.css";

// How a room starts: a template (a board already composed with real archive pieces), the pieces
// of your collection, or a blank sheet — and the sheet's format. The options are museum labels,
// like everything else on the site. `onDone(content)` gets the board's starting content.
export default function MoodboardStartDialog({ onClose, onDone }) {
  const { t } = useLanguage();
  const items = useCollection();
  const [start, setStart] = useState(TEMPLATES[0].id);
  const [format, setFormat] = useState("a3");
  const panelRef = useRef(null);
  const ownCount = collectionStartCount(items);
  const previews = useMemo(() => Object.fromEntries(TEMPLATES.map((tpl) => [tpl.id, templatePieces(tpl, OBJECTS)])), []);

  useEffect(() => {
    panelRef.current?.querySelector("input:checked")?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function submit(e) {
    e.preventDefault();
    if (start === "blank") onDone({ format, background: "paper", elements: [] });
    else if (start === "collection") onDone(collectionContent(items, format));
    else
      onDone(
        templateContent(start, format, {
          title: t(`moodboard.templates.${start}`),
          paletteName: t(`moodboard.palettes.${TEMPLATES.find((tpl) => tpl.id === start).palette}`),
          ink: BACKGROUNDS.paper.ink,
        })
      );
  }

  const option = (value, number, title, line, extra, disabled = false) => (
    <label key={value} className={`mb-start__option${start === value ? " is-on" : ""}${disabled ? " is-disabled" : ""}`}>
      <input type="radio" name="mb-start" value={value} checked={start === value} disabled={disabled} onChange={() => setStart(value)} />
      <span className="mb-start__line">
        <span>{number}</span>
      </span>
      <span className="mb-start__name">{title}</span>
      <span className="mb-start__by">{line}</span>
      {extra}
    </label>
  );

  return createPortal(
    <div className="mb-dialog" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form ref={panelRef} className="mb-start" role="dialog" aria-modal="true" aria-labelledby="mb-start-title" onSubmit={submit}>
        <header className="mb-start__head">
          <h2 id="mb-start-title">{t("moodboard.start.title")}</h2>
          <p>{t("moodboard.start.intro")}</p>
        </header>

        <fieldset className="mb-start__group">
          <legend>{t("moodboard.start.fromTemplate")}</legend>
          <div className="mb-start__grid">
            {TEMPLATES.map((tpl, i) =>
              option(
                tpl.id,
                `N. ${String(i + 1).padStart(2, "0")}`,
                t(`moodboard.templates.${tpl.id}`),
                t("moodboard.start.pieces", { n: previews[tpl.id].length }),
                <span className="mb-start__photos" aria-hidden="true">
                  {previews[tpl.id].slice(0, 4).map((o) => (
                    <SmartImage key={o.id} src={o.image} cutout={o.cutout} alt="" card category={o.category} />
                  ))}
                </span>
              )
            )}
          </div>
        </fieldset>

        <fieldset className="mb-start__group">
          <legend>{t("moodboard.start.orElse")}</legend>
          <div className="mb-start__grid mb-start__grid--two">
            {option("collection", t("nav.collection"), t("moodboard.start.fromCollection"), ownCount ? t("moodboard.start.collectionCount", { n: ownCount }) : t("moodboard.start.collectionNone"), null, !ownCount)}
            {option("blank", "—", t("moodboard.start.blank"), t("moodboard.start.blankLine"))}
          </div>
        </fieldset>

        <fieldset className="mb-start__group">
          <legend>{t("moodboard.start.format")}</legend>
          <div className="mb-start__formats" role="radiogroup">
            {NEW_FORMATS.map((f) => (
              <label key={f} className={`mb-start__format${format === f ? " is-on" : ""}`}>
                <input type="radio" name="mb-format" value={f} checked={format === f} onChange={() => setFormat(f)} />
                <span className="mb-start__sheet" style={{ aspectRatio: `${FORMATS[f].w} / ${FORMATS[f].h}` }} aria-hidden="true" />
                <span>{t(`moodboard.formats.${f}`)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <footer className="mb-start__actions">
          <button type="button" className="mb-dialog__cancel" onClick={onClose}>
            {t("moodboard.dialog.cancel")}
          </button>
          <button type="submit" className="btn">
            {t("moodboard.start.create")}
          </button>
        </footer>
      </form>
    </div>,
    document.body
  );
}
