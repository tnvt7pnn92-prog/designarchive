import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { useMoodboard } from "../context/MoodboardContext.jsx";
import {
  BACKGROUNDS,
  createArrow,
  createColor,
  createImage,
  createMaterial,
  createPhoto,
  createShape,
  createSticker,
  createText,
} from "../lib/moodboard.js";
import { SHAPE_FILLS } from "../lib/moodboardPresets.js";
import { readImageFile } from "../lib/moodboardLibrary.js";
import { STICKERS_BY_ID } from "../data/stickers.js";
import { objectById } from "../data/indexes.js";
import { useCollection } from "../lib/collection.js";
import { createBoard, useMoodboards } from "../lib/moodboards.js";
import { readLogo } from "../lib/printSheet.js";
import { formatDay } from "../lib/today.js";
import MoodboardCanvas from "./MoodboardCanvas.jsx";
import MoodboardToolbar from "./MoodboardToolbar.jsx";
import MoodboardInspector from "./MoodboardInspector.jsx";
import MoodboardSidebar from "./MoodboardSidebar.jsx";
import MoodboardCreateDialog from "./MoodboardCreateDialog.jsx";
import MoodboardStartDialog from "./MoodboardStartDialog.jsx";
import MoodboardIcon from "./MoodboardIcon.jsx";
import BoardBar from "./BoardBar.jsx";
import "./MoodboardEditor.css";

const SHORTCUTS = [
  ["undo", "Ctrl/⌘ Z"],
  ["redo", "Ctrl/⌘ ⇧ Z · Ctrl Y"],
  ["delete", "Delete · ⌫"],
  ["duplicate", "Ctrl/⌘ D"],
  ["nudge", "← ↑ → ↓ (⇧ ×10)"],
  ["order", "Ctrl/⌘ ↑ ↓ · ⇧"],
  ["editText", "Enter"],
  ["deselect", "Esc"],
  ["zoom", "+ − 0"],
  ["help", "?"],
];

function isTypingTarget(target) {
  return Boolean(target?.closest?.("input, textarea, select, [contenteditable='true']"));
}

function ShortcutsDialog({ onClose }) {
  const { t } = useLanguage();
  const closeRef = useRef(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return createPortal(
    <div className="mb-dialog" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="mb-keys" role="dialog" aria-modal="true" aria-labelledby="mb-keys-title">
        <header>
          <h2 id="mb-keys-title">{t("moodboard.shortcuts.title")}</h2>
          <button ref={closeRef} type="button" className="mb-icon-btn" onClick={onClose} aria-label={t("moodboard.dialog.cancel")}>
            <MoodboardIcon name="close" />
          </button>
        </header>
        <dl>
          {SHORTCUTS.map(([key, keys]) => (
            <div key={key}>
              <dt>{t(`moodboard.shortcuts.${key}`)}</dt>
              <dd>
                <kbd>{keys}</kbd>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>,
    document.body
  );
}

// The room, full screen: a thin bar on top, the icon bar and its drawer on the left, the board
// as large as the window allows, the inspector floating on the right while something is
// selected, and the pill of view tools at the bottom.
export default function MoodboardEditor() {
  const { t, lang } = useLanguage();
  const {
    elements,
    background,
    setBackground,
    sheet,
    setSheet,
    saveFailed,
    addElement,
    updateElement,
    removeElement,
    duplicateElement,
    reorderElement,
    clear,
    startFrom,
    undo,
    redo,
    canUndo,
    canRedo,
    boardId,
  } = useMoodboard();
  const { boards } = useMoodboards();
  const items = useCollection();
  const canvas = useRef(null);
  const [selectedId, setSelectedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  // Open on a wide screen; on tablets and phones the drawer covers the board, so it starts closed.
  const [drawer, setDrawer] = useState(() => (window.matchMedia?.("(max-width: 1100px)").matches ? null : "pieces"));
  const [dialog, setDialog] = useState(null);
  const [sheetPanel, setSheetPanel] = useState(false);
  const [dropActive, setDropActive] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [uploadError, setUploadError] = useState(false);
  const theme = BACKGROUNDS[background] ?? BACKGROUNDS.ink;
  const board = boards.find((b) => b.id === boardId) ?? boards[0];
  const titleOf = useCallback((b) => b.title || t("boards.untitled", { n: boards.indexOf(b) + 1 }), [boards, t]);

  // Undo / delete can remove the selected element: derive instead of syncing state.
  const selected = elements.find((el) => el.id === selectedId) ?? null;
  const activeId = selected ? selectedId : null;
  const activeEditingId = editingId && elements.some((el) => el.id === editingId) ? editingId : null;

  const statuses = useMemo(() => new Map(items.map((item) => [item.id, item.status])), [items]);
  const stampLabels = useMemo(() => ({ own: t("collection.status.own"), want: t("collection.status.want") }), [t]);
  const titleBlock = useMemo(
    () => ({
      title: titleOf(board),
      date: formatDay(board.createdAt.slice(0, 10), lang),
      labels: {
        project: t("moodboard.cartouche.project"),
        date: t("moodboard.cartouche.date"),
        sheet: t("moodboard.cartouche.number"),
        author: t("moodboard.cartouche.author"),
      },
    }),
    [board, titleOf, lang, t]
  );
  const logo = readLogo();
  // The photo whose colours "Extract" reads: the selected archive piece or uploaded picture.
  const extractSource = selected?.type === "photo" ? objectById(selected.objectId)?.image : selected?.type === "image" ? selected.src : null;

  /* ---------- canvas callbacks (stable, so memoised elements don't re-render) ---------- */

  const handleSelect = useCallback((id) => {
    setSelectedId(id);
    if (id) setSheetPanel(false);
  }, []);
  const handleChange = useCallback((id, patch) => updateElement(id, patch), [updateElement]);
  const handleEdit = useCallback((id) => {
    setSelectedId(id);
    setEditingId(id);
  }, []);
  const handleCommitText = useCallback(
    (id, text) => {
      setEditingId(null);
      if (text.trim()) updateElement(id, { text });
      else removeElement(id);
    },
    [updateElement, removeElement]
  );
  const closeDialog = useCallback(() => setDialog(null), []);
  const openCartouche = useCallback(() => {
    setSelectedId(null);
    setSheetPanel(true);
  }, []);
  const closeDrawer = useCallback((id) => setDrawer(id), []);

  /* ---------- adding elements ---------- */

  // Centre of the visible board, scattered a little so repeated adds don't stack exactly.
  const center = (spread = 80) => {
    const c = canvas.current?.viewCenter() ?? { x: 700, y: 430 };
    return { x: c.x + (Math.random() - 0.5) * spread, y: c.y + (Math.random() - 0.5) * spread };
  };

  function add(el) {
    addElement(el);
    setSelectedId(el.id);
    setSheetPanel(false);
    return el;
  }

  // Where the drawer covers the board (tablets, phones) it closes once something has been placed.
  const afterPick = () => window.matchMedia?.("(max-width: 1100px)").matches && setDrawer(null);

  // Places a library item (from a click or a drop) centred on `point`, in board coordinates.
  function insert(item, point) {
    const p = point ?? center();
    const at = { cx: p.x, cy: p.y };
    switch (item.kind) {
      case "photo": {
        const el = createPhoto(item.objectId, 0, { x: 0, y: 0, rotation: Math.round(Math.random() * 6 - 3) });
        add({ ...el, x: p.x - el.width / 2, y: p.y - 140 });
        break;
      }
      case "material":
        add(createMaterial(item.material, at, item.meta));
        break;
      case "color":
        add(createColor(item.color, at));
        break;
      case "text": {
        const el = add(createText({ ...at, text: t(`moodboard.presetText.${item.preset.id}`), fill: theme.ink, ...item.preset.style }));
        setEditingId(el.id);
        break;
      }
      case "arrow":
        add(createArrow({ ...at, stroke: theme.ink, strokeWidth: 2, ...item.preset.style }));
        break;
      case "shape":
        add(createShape(item.shape, at, SHAPE_FILLS[background] ?? SHAPE_FILLS.ink));
        break;
      case "sticker": {
        const sticker = STICKERS_BY_ID[item.stickerId];
        if (sticker) add(createSticker(sticker, at, Math.round(Math.random() * 16 - 8)));
        break;
      }
      default:
        break;
    }
    afterPick();
  }

  // A palette: its chips in a row across the middle of the visible board.
  function addPalette(colors, name) {
    const c = center(0);
    const width = 96;
    const gap = 12;
    const left = c.x - (colors.length * width + (colors.length - 1) * gap) / 2;
    colors.forEach((hex, i) => {
      const chip = createColor({ hex, name }, { cx: 0, cy: 0 });
      addElement({ ...chip, width, height: 84, x: left + i * (width + gap), y: c.y - 60 });
    });
    afterPick();
  }

  async function uploadImage(file, point) {
    setUploadError(false);
    try {
      const image = await readImageFile(file, { maxSize: 1000 });
      const p = point ?? center();
      add(createImage(image, { cx: p.x, cy: p.y }));
      afterPick();
    } catch {
      setUploadError(true);
    }
  }

  /* ---------- selection actions ---------- */

  const deleteSelected = useCallback(() => {
    if (!activeId) return;
    removeElement(activeId);
    setSelectedId(null);
  }, [activeId, removeElement]);

  const duplicateSelected = useCallback(() => {
    if (activeId) setSelectedId(duplicateElement(activeId));
  }, [activeId, duplicateElement]);

  const reorderSelected = useCallback((direction) => activeId && reorderElement(activeId, direction), [activeId, reorderElement]);

  /* ---------- keyboard shortcuts ---------- */

  useEffect(() => {
    function onKeyDown(e) {
      if (dialog || activeEditingId || isTypingTarget(e.target) || e.defaultPrevented) return;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (e.key === "?") {
        setDialog("shortcuts");
        return;
      }
      if (!mod && (e.key === "+" || e.key === "=")) return canvas.current?.zoomIn();
      if (!mod && e.key === "-") return canvas.current?.zoomOut();
      if (!mod && e.key === "0") return canvas.current?.zoomFit();
      if (mod && key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && key === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if (!selected) {
        if (e.key === "Escape" && sheetPanel) setSheetPanel(false);
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
      } else if (mod && key === "d") {
        e.preventDefault();
        duplicateSelected();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setSelectedId(null);
      } else if (e.key === "Enter" && selected.type === "text" && !e.target.closest?.("button, a")) {
        e.preventDefault();
        setEditingId(selected.id);
      } else if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        const up = e.key === "ArrowUp";
        const down = e.key === "ArrowDown";
        if (mod && (up || down)) {
          reorderSelected(up ? (e.shiftKey ? "front" : "forward") : e.shiftKey ? "back" : "backward");
          return;
        }
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = up ? -step : down ? step : 0;
        updateElement(selected.id, { x: selected.x + dx, y: selected.y + dy }, { coalesce: "nudge" });
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dialog, selected, sheetPanel, activeEditingId, undo, redo, deleteSelected, duplicateSelected, reorderSelected, updateElement]);

  /* ---------- board actions ---------- */

  function handleClear() {
    setSelectedId(null);
    setEditingId(null);
    clear();
  }

  // "New room" makes a board; the empty state's buttons start the board already open.
  function handleStart(content) {
    if (dialog === "new") createBoard("", content);
    else startFrom(content);
    setDialog(null);
    setSelectedId(null);
  }

  // Image files dragged straight from the desktop onto the board.
  function handleFileDrop(e) {
    const file = [...(e.dataTransfer?.files ?? [])].find((f) => f.type.startsWith("image/"));
    if (!file) return;
    e.preventDefault();
    setDropActive(false);
    uploadImage(file, canvas.current?.clientToBoard(e.clientX, e.clientY));
  }

  const errorKey = uploadError ? "uploadError" : saveFailed ? "storageFull" : null;

  return (
    <div className={`mb-studio${drawer ? " has-drawer" : ""}`}>
      <BoardBar canvasRef={canvas} onNew={() => setDialog("new")} onClear={handleClear} titleOf={titleOf} />

      <div className="mb-studio__body">
        <MoodboardSidebar
          open={drawer}
          onOpen={closeDrawer}
          onPick={(item) => insert(item)}
          onDrop={(item, clientX, clientY) => {
            const point = canvas.current?.clientToBoard(clientX, clientY);
            if (point) insert(item, point);
          }}
          onDragChange={setDropActive}
          onUpload={(file) => uploadImage(file)}
          onCreate={setDialog}
          onPalette={addPalette}
          extractSource={extractSource}
          elements={elements}
        />

        <div
          className={`mb-studio__stage${dropActive ? " is-drop-target" : ""}`}
          onDragOver={(e) => {
            if ([...(e.dataTransfer?.types ?? [])].includes("Files")) {
              e.preventDefault();
              setDropActive(true);
            }
          }}
          onDragLeave={() => setDropActive(false)}
          onDrop={handleFileDrop}
        >
          <h1 className="visually-hidden">{titleOf(board)}</h1>
          <MoodboardCanvas
            apiRef={canvas}
            elements={elements}
            background={background}
            sheet={sheet}
            titleBlock={titleBlock}
            statuses={statuses}
            stampLabels={stampLabels}
            logo={logo}
            selectedId={activeId}
            editingId={activeEditingId}
            onSelect={handleSelect}
            onChange={handleChange}
            onEdit={handleEdit}
            onCommitText={handleCommitText}
            onZoomChange={setZoom}
            onCartouche={openCartouche}
          />

          {elements.length === 0 && (
            <div className="mb-empty">
              <div className="mb-empty__card">
                <p className="mb-empty__title">{t("moodboard.empty")}</p>
                <p className="mb-empty__hint">{t("moodboard.emptyHint")}</p>
                <div className="mb-empty__actions">
                  <button type="button" className="mb-pill" onClick={() => setDialog("start")}>
                    {t("moodboard.start.fromTemplate")}
                  </button>
                  <button type="button" className="mb-pill mb-pill--ghost" onClick={() => setDrawer("pieces")}>
                    {t("moodboard.addPieces")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {errorKey && (
            <p className="mb-studio__error" role="alert">
              {t(`moodboard.${errorKey}`)}
            </p>
          )}

          <MoodboardInspector
            el={activeEditingId ? null : selected}
            sheet={sheetPanel ? sheet.cartouche : null}
            onSheet={(cartouche) => setSheet({ cartouche })}
            onClose={() => {
              setSelectedId(null);
              setSheetPanel(false);
            }}
            onUpdate={(patch, coalesce) => updateElement(activeId, patch, { coalesce })}
            onEditText={() => setEditingId(activeId)}
            onReorder={reorderSelected}
            onDuplicate={duplicateSelected}
            onDelete={deleteSelected}
          />

          <MoodboardToolbar
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
            zoom={zoom}
            onZoomIn={() => canvas.current?.zoomIn()}
            onZoomOut={() => canvas.current?.zoomOut()}
            onZoomFit={() => canvas.current?.zoomFit()}
            background={background}
            onGround={() => setBackground(background === "paper" ? "ink" : "paper")}
            onHelp={() => setDialog("shortcuts")}
          />
        </div>
      </div>

      {(dialog === "material" || dialog === "color") && <MoodboardCreateDialog mode={dialog} onClose={closeDialog} />}
      {(dialog === "new" || dialog === "start") && <MoodboardStartDialog onClose={closeDialog} onDone={handleStart} />}
      {dialog === "shortcuts" && <ShortcutsDialog onClose={closeDialog} />}
    </div>
  );
}
