import { useLanguage } from "../i18n/LanguageContext.jsx";
import MoodboardIcon from "./MoodboardIcon.jsx";
import RealScale from "./RealScale.jsx";

// The pill at the bottom of the board: undo and redo, zoom, real proportions, the board's ground
// (paper or ink) and the keyboard shortcuts. On a phone, icons only, and zoom by pinching.
export default function MoodboardToolbar({ canUndo, canRedo, onUndo, onRedo, zoom, onZoomIn, onZoomOut, onZoomFit, background, onGround, onHelp }) {
  const { t } = useLanguage();
  const icon = (name, label, onClick, disabled, extra = "") => (
    <button type="button" className={`mb-pillbar__btn${extra}`} onClick={onClick} disabled={disabled} title={label} aria-label={label}>
      <MoodboardIcon name={name} />
    </button>
  );

  return (
    <div className="mb-pillbar" role="toolbar" aria-label={t("moodboard.tools")}>
      {icon("undo", t("moodboard.undo"), onUndo, !canUndo)}
      {icon("redo", t("moodboard.redo"), onRedo, !canRedo)}
      <span className="mb-pillbar__rule" aria-hidden="true" />
      {icon("minus", t("moodboard.zoomOut"), onZoomOut, false, " mb-pillbar__btn--step")}
      <button type="button" className="mb-pillbar__zoom" onClick={onZoomFit} title={t("moodboard.zoomFit")} aria-label={`${t("moodboard.zoomFit")} (${Math.round(zoom * 100)}%)`}>
        {Math.round(zoom * 100)}%
      </button>
      {icon("plus", t("moodboard.zoomIn"), onZoomIn, false, " mb-pillbar__btn--step")}
      <span className="mb-pillbar__rule" aria-hidden="true" />
      <RealScale />
      <button
        type="button"
        className="mb-pillbar__btn"
        onClick={onGround}
        title={t("moodboard.groundToggle", { ground: t(`moodboard.grounds.${background === "paper" ? "ink" : "paper"}`) })}
        aria-label={t("moodboard.groundToggle", { ground: t(`moodboard.grounds.${background === "paper" ? "ink" : "paper"}`) })}
      >
        <MoodboardIcon name="ground" />
      </button>
      {icon("help", t("moodboard.shortcuts.title"), onHelp)}
    </div>
  );
}
