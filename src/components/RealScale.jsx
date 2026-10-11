import { useState } from "react";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { useMoodboard } from "../context/MoodboardContext.jsx";
import { loadFullGuide } from "../lib/guide.js";
import { boardSize } from "../lib/moodboard.js";
import { showToast } from "../lib/toast.js";
import MoodboardIcon from "./MoodboardIcon.jsx";

const MIN_WIDTH = 40;

// "Real proportions": the visitor gives the width of the room (or the wall) the board stands for,
// and every piece on it whose measurements are known is resized to its true share of that width;
// the sheet then shows a scale bar. One click, undoable like any other change. Measurements are
// among the verified facts of a piece.
export default function RealScale() {
  const { t } = useLanguage();
  const { elements, updateElement, sheet, setSheet } = useMoodboard();
  const [open, setOpen] = useState(false);
  const [room, setRoom] = useState(() => String(sheet.roomWidth ?? 400));
  const [busy, setBusy] = useState(false);

  async function apply(e) {
    e.preventDefault();
    const roomWidth = Number(room);
    if (!Number.isFinite(roomWidth) || roomWidth < 50) return;
    setBusy(true);
    const boardW = boardSize(sheet.format).w;
    const photos = elements.filter((el) => el.type === "photo");
    const ids = [...new Set(photos.map((el) => el.objectId))];
    const guides = Object.fromEntries(await Promise.all(ids.map(async (id) => [id, await loadFullGuide(id)])));
    let resized = 0;
    for (const el of photos) {
      const width = guides[el.objectId]?.dimensions?.width;
      if (!width) continue;
      updateElement(el.id, { width: Math.max(MIN_WIDTH, Math.round((width / roomWidth) * boardW)) }, { coalesce: "real-scale" });
      resized += 1;
    }
    setSheet({ roomWidth: Math.round(roomWidth) });
    setBusy(false);
    setOpen(false);
    showToast({ message: resized ? t("boards.scaled", { n: resized, total: photos.length }) : t("boards.noMeasures") });
  }

  return (
    <span className="real-scale">
      <button
        type="button"
        className="mb-pillbar__btn mb-pillbar__btn--text"
        aria-expanded={open}
        aria-pressed={Boolean(sheet.roomWidth)}
        aria-label={t("boards.realScale")}
        title={t("boards.realScale")}
        onClick={() => setOpen((v) => !v)}
      >
        <MoodboardIcon name="ruler" />
        <span className="mb-pillbar__label">{t("boards.realScale")}</span>
      </button>
      {open && (
        <form className="real-scale__panel" onSubmit={apply}>
          <label>
            <span>{t("boards.roomWidth")}</span>
            <input type="number" min="50" step="10" value={room} onChange={(e) => setRoom(e.target.value)} autoFocus />
          </label>
          <p>{t("boards.realScaleHint")}</p>
          <div className="real-scale__actions">
            {sheet.roomWidth && (
              <button
                type="button"
                className="mb-pill mb-pill--ghost"
                onClick={() => {
                  setSheet({ roomWidth: null });
                  setOpen(false);
                }}
              >
                {t("boards.scaleOff")}
              </button>
            )}
            <button type="submit" className="mb-pill" disabled={busy}>
              {t("boards.apply")}
            </button>
          </div>
        </form>
      )}
    </span>
  );
}
