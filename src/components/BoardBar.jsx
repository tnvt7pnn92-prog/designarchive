import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { useMoodboard } from "../context/MoodboardContext.jsx";
import {
  deleteBoard,
  duplicateBoard,
  renameBoard,
  setActiveBoard,
  useMoodboards,
} from "../lib/moodboards.js";
import { BACKGROUNDS, boardSize } from "../lib/moodboard.js";
import { objectById } from "../data/indexes.js";
import { MATERIALS_BY_ID } from "../data/materials.js";
import { useAuth } from "../lib/auth.js";
import { openAuth } from "../lib/authDialog.js";
import { nudge } from "../lib/nudges.js";
import { boardPng, downloadDataUrl } from "../lib/boardExport.js";
import { shareBoard, unshareBoard } from "../lib/share.js";
import { siteUrl } from "../lib/site.js";
import { showToast } from "../lib/toast.js";
import { setPrintSheet } from "../lib/printSheet.js";
import MoodboardIcon from "./MoodboardIcon.jsx";

// A small picture of a board for the list of rooms: the sheet in its colour and format, with its
// photos, materials and colour chips where they lie.
function BoardThumb({ board }) {
  const size = boardSize(board.format);
  const ground = BACKGROUNDS[board.background] ?? BACKGROUNDS.paper;
  const pct = (v, of) => `${(v / of) * 100}%`;
  return (
    <span
      className="board-thumb"
      style={{ aspectRatio: `${size.w} / ${size.h}`, background: ground.fill }}
      aria-hidden="true"
    >
      {board.elements.slice(0, 24).map((el) => {
        const style = {
          left: pct(el.x, size.w),
          top: pct(el.y, size.h),
          width: pct(el.width ?? 60, size.w),
        };
        if (el.type === "photo") {
          const object = objectById(el.objectId);
          return object?.image ? (
            <img
              key={el.id}
              src={object.image}
              alt=""
              loading="lazy"
              style={{ ...style, aspectRatio: "4 / 5" }}
            />
          ) : null;
        }
        if (el.type === "material") {
          const src = MATERIALS_BY_ID[el.materialId]?.src;
          return src ? (
            <img
              key={el.id}
              src={src}
              alt=""
              loading="lazy"
              style={{ ...style, height: pct(el.height, size.h) }}
            />
          ) : null;
        }
        if (el.type === "image")
          return (
            <img
              key={el.id}
              src={el.src}
              alt=""
              style={{ ...style, height: pct(el.height, size.h) }}
            />
          );
        if (el.type === "color")
          return (
            <i
              key={el.id}
              style={{
                ...style,
                height: pct(el.height, size.h),
                background: el.hex,
              }}
            />
          );
        if (el.type === "text")
          return (
            <i
              key={el.id}
              className="is-text"
              style={{
                ...style,
                height: pct(Math.max(6, el.fontSize * 0.5), size.h),
                background: ground.muted,
              }}
            />
          );
        return null;
      })}
    </span>
  );
}

// "Saved", "Saving…" or "Offline": boards are written to this browser at once and, with an
// account, to the account when online.
function useSaveStatus() {
  const { elements, sheet, background, saveFailed } = useMoodboard();
  const [saving, setSaving] = useState(false);
  const [online, setOnline] = useState(() => navigator.onLine !== false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return undefined;
    }
    setSaving(true);
    const timer = setTimeout(() => setSaving(false), 700);
    return () => clearTimeout(timer);
  }, [elements, sheet, background]);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine !== false);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (saveFailed) return "notSaved";
  if (!online) return "offline";
  return saving ? "saving" : "saved";
}

// Closes a popover on a click outside it or on Esc.
function usePopover() {
  const [open, setOpen] = useState(null);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(null);
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(null);
      }
    };
    document.addEventListener("pointerdown", onDown);
    // Captured first, so Esc closes the popover and nothing else (the drawer stays open).
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);
  return { open, setOpen, ref };
}

// The thin bar above the board: the way back to the site, the room's name (click to rename) and
// whether it is saved; on the right the list of rooms, sharing, and Export — the one gold action.
export default function BoardBar({
  canvasRef,
  onNew,
  onClear,
  titleOf,
}) {
  const { t } = useLanguage();
  const { boards, activeId } = useMoodboards();
  const { elements } = useMoodboard();
  const { status } = useAuth();
  const navigate = useNavigate();
  const saveStatus = useSaveStatus();
  const { open: pop, setOpen: setPop, ref: popRef } = usePopover();
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [sharing, setSharing] = useState(false);

  const active = boards.find((board) => board.id === activeId) ?? boards[0];
  // A second room is the moment to suggest keeping the rooms in an account (guests only).
  function addBoard(action) {
    setPop(null);
    action();
    if (boards.length === 1) nudge("moodboards");
  }

  function saveRename(e) {
    e.preventDefault();
    renameBoard(active.id, draft.trim());
    setRenaming(false);
  }

  async function share() {
    setPop(null);
    if (status !== "signedIn") {
      openAuth("moodboards");
      return;
    }
    setSharing(true);
    try {
      const png = await boardPng(canvasRef.current);
      const { slug, error } = await shareBoard(active, png);
      if (error) throw error;
      await navigator.clipboard
        ?.writeText(siteUrl(`/m/${slug}`))
        .catch(() => null);
      showToast({
        message: t("boards.shared"),
        action: { label: t("boards.openLink"), to: `/m/${slug}` },
      });
    } catch {
      showToast({ message: t("boards.shareError") });
    } finally {
      setSharing(false);
    }
  }

  async function stopSharing() {
    setPop(null);
    const { error } = await unshareBoard(active);
    showToast({
      message: error ? t("boards.shareError") : t("boards.unshared"),
    });
  }

  async function exportPng() {
    setPop(null);
    try {
      downloadDataUrl(
        await boardPng(canvasRef.current),
        `${(titleOf(active) || "design-archive").replace(/[^\w-]+/g, "-").toLowerCase()}.png`,
      );
    } catch {
      // A cross-origin picture without CORS headers taints the canvas.
      showToast({ message: t("moodboard.exportError") });
    }
  }

  // The PDF is the print page: it gets the picture of the board.
  async function exportPdf() {
    setPop(null);
    try {
      setPrintSheet({
        boardId: active.id,
        image: await boardPng(canvasRef.current),
      });
      navigate("/moodboard/print");
    } catch {
      showToast({ message: t("moodboard.exportError") });
    }
  }

  return (
    <header className="mb-top">
      <Link to="/" className="mb-top__home">
        <span className="mb-top__back" aria-hidden="true">
          ←
        </span>
        <span className="mb-top__brand">Design Archive</span>
      </Link>
      <span className="mb-top__rule" aria-hidden="true" />
      <div className="mb-top__name">
        {renaming ? (
          <form onSubmit={saveRename}>
            <input
              autoFocus
              value={draft}
              maxLength={80}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={saveRename}
              onKeyDown={(e) => e.key === "Escape" && setRenaming(false)}
              placeholder={titleOf(active)}
              aria-label={t("boards.rename")}
            />
          </form>
        ) : (
          <button
            type="button"
            className="mb-top__title"
            onClick={() => {
              setDraft(active.title);
              setRenaming(true);
            }}
            title={t("boards.rename")}
          >
            {titleOf(active)}
          </button>
        )}
        <span className={`mb-top__status is-${saveStatus}`} role="status">
          {t(`boards.status.${saveStatus}`)}
        </span>
      </div>

      <div className="mb-top__actions" ref={popRef}>
        <button
          type="button"
          className="mb-top__btn"
          aria-expanded={pop === "boards"}
          onClick={() => setPop(pop === "boards" ? null : "boards")}
        >
          <MoodboardIcon name="boards" />
          <span className="mb-top__label">{t("boards.mine")}</span>
          <span className="mb-top__count">{boards.length}</span>
        </button>
        <button
          type="button"
          className="mb-top__btn"
          aria-expanded={active.shareSlug ? pop === "share" : undefined}
          onClick={() =>
            active.shareSlug
              ? setPop(pop === "share" ? null : "share")
              : share()
          }
          disabled={sharing}
        >
          <MoodboardIcon name="share" />
          <span className="mb-top__label">{t("boards.shareShort")}</span>
        </button>
        <button
          type="button"
          className="btn btn--gold mb-top__export"
          aria-expanded={pop === "export"}
          onClick={() => setPop(pop === "export" ? null : "export")}
        >
          <MoodboardIcon name="download" />
          <span className="mb-top__label">{t("boards.export")}</span>
        </button>

        {pop === "boards" && (
          <div className="mb-pop mb-pop--boards">
            <p className="mb-pop__title">
              {t("boards.mine")} · {t("boards.count", { n: boards.length })}
            </p>
            <ul className="mb-pop__boards">
              {boards.map((board) => (
                <li key={board.id}>
                  <button
                    type="button"
                    className="mb-pop__board"
                    aria-current={board.id === active.id}
                    onClick={() => {
                      setActiveBoard(board.id);
                      setPop(null);
                    }}
                  >
                    <BoardThumb board={board} />
                    <span>{titleOf(board)}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="mb-pop__row">
              <button
                type="button"
                className="mb-pill"
                onClick={() => addBoard(onNew)}
              >
                + {t("boards.newRoom")}
              </button>
              <button
                type="button"
                className="mb-pill mb-pill--ghost"
                onClick={() =>
                  addBoard(() =>
                    duplicateBoard(
                      active.id,
                      `${titleOf(active)} (${t("boards.copy")})`,
                    ),
                  )
                }
              >
                {t("boards.duplicate")}
              </button>
            </div>
            {(elements.length > 0 || boards.length > 1) && (
              <div className="mb-pop__row mb-pop__row--quiet">
                {elements.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setPop(null);
                      onClear();
                    }}
                  >
                    {t("moodboard.clear")}
                  </button>
                )}
                {boards.length > 1 &&
                  (confirmDelete ? (
                    <span className="mb-pop__confirm">
                      {t("boards.deleteConfirm")}
                      <button
                        type="button"
                        onClick={() => {
                          deleteBoard(active.id);
                          setConfirmDelete(false);
                          setPop(null);
                        }}
                      >
                        {t("boards.deleteYes")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                      >
                        {t("moodboard.dialog.cancel")}
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="is-danger"
                      onClick={() => setConfirmDelete(true)}
                    >
                      {t("boards.delete")}
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}

        {pop === "share" && active.shareSlug && (
          <div className="mb-pop mb-pop--menu">
            <Link to={`/m/${active.shareSlug}`} className="mb-pop__item">
              {t("boards.openLink")}
            </Link>
            <button type="button" className="mb-pop__item" onClick={share}>
              {t("boards.updateLink")}
            </button>
            <button
              type="button"
              className="mb-pop__item"
              onClick={stopSharing}
            >
              {t("boards.unshare")}
            </button>
          </div>
        )}

        {pop === "export" && (
          <div className="mb-pop mb-pop--menu">
            <button
              type="button"
              className="mb-pop__item"
              onClick={exportPng}
              disabled={!elements.length}
            >
              <strong>PNG</strong>
              <span>{t("boards.pngText")}</span>
            </button>
            <button
              type="button"
              className="mb-pop__item"
              onClick={exportPdf}
              disabled={!elements.length}
            >
              <strong>PDF</strong>
              <span>{t("boards.pdfText")}</span>
            </button>
          </div>
        )}
      </div>

    </header>
  );
}
