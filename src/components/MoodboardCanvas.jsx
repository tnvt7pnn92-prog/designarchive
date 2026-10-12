import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { Stage, Layer, Group, Rect, Transformer } from "react-konva";
import { BACKGROUNDS, boardSize, rotatePoint } from "../lib/moodboard.js";
import { useBoardFontsReady, useCoarsePointer } from "../lib/moodboardHooks.js";
import { useLibrary } from "../lib/moodboardLibrary.js";
import { objectById } from "../data/indexes.js";
import { STICKERS_BY_ID } from "../data/stickers.js";
import { MATERIALS_BY_ID } from "../data/materials.js";
import MoodboardTile from "./MoodboardTile.jsx";
import MoodboardText from "./MoodboardText.jsx";
import MoodboardArrow from "./MoodboardArrow.jsx";
import MoodboardSticker from "./MoodboardSticker.jsx";
import MoodboardMaterial from "./MoodboardMaterial.jsx";
import MoodboardSwatch from "./MoodboardSwatch.jsx";
import MoodboardShape from "./MoodboardShape.jsx";
import MoodboardImage from "./MoodboardImage.jsx";
import MoodboardTextEditor from "./MoodboardTextEditor.jsx";
import MoodboardCartouche, { ScaleBar } from "./MoodboardCartouche.jsx";
import "./MoodboardCanvas.css";

const MAX_ZOOM = 4;
const CORNERS = ["top-left", "top-right", "bottom-left", "bottom-right"];
const SIDES_X = ["middle-left", "middle-right"];
const ALL_ANCHORS = [...CORNERS, ...SIDES_X, "top-center", "bottom-center"];

const TRANSFORMER_BY_TYPE = {
  photo: { enabledAnchors: CORNERS, keepRatio: true, padding: 4 },
  sticker: { enabledAnchors: ALL_ANCHORS, keepRatio: true, padding: 4 },
  text: { enabledAnchors: [...CORNERS, ...SIDES_X], keepRatio: true, padding: 6 },
  arrow: { enabledAnchors: CORNERS, keepRatio: false, padding: 12 },
  material: { enabledAnchors: ALL_ANCHORS, keepRatio: false, padding: 6 },
  color: { enabledAnchors: ALL_ANCHORS, keepRatio: false, padding: 6 },
  shape: { enabledAnchors: ALL_ANCHORS, keepRatio: false, padding: 4 },
  image: { enabledAnchors: CORNERS, keepRatio: true, padding: 4 },
};

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// The sheet is fitted with a margin around it, so it reads as a sheet lying on the table, and
// clear of the pill of tools at the foot of the window.
const FIT = { side: 28, top: 28, bottom: 92 };

function fitScale(w, h, board) {
  return Math.max(0.05, Math.min((w - FIT.side * 2) / board.w, (h - FIT.top - FIT.bottom) / board.h));
}

function fitView(w, h, board) {
  const scale = fitScale(w, h, board);
  return { scale, x: (w - board.w * scale) / 2, y: FIT.top + (h - FIT.top - FIT.bottom - board.h * scale) / 2, fitted: true };
}

// Centre the board on an axis where it fits, otherwise keep it covering the viewport
// (with a small margin so the sheet edge stays visible).
function clampView(v, w, h, board) {
  const margin = 60;
  const bw = board.w * v.scale;
  const bh = board.h * v.scale;
  return {
    ...v,
    x: bw <= w ? (w - bw) / 2 : clamp(v.x, w - bw - margin, margin),
    y: bh <= h ? (h - bh) / 2 : clamp(v.y, h - bh - margin, margin),
  };
}

function touchPoints(e, rect) {
  const [a, b] = e.touches;
  const p1 = { x: a.clientX - rect.left, y: a.clientY - rect.top };
  const p2 = { x: b.clientX - rect.left, y: b.clientY - rect.top };
  return {
    points: [p1, p2],
    center: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
    dist: Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1,
    angle: (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI,
  };
}

// The board: a sheet of the board's format lying on the dark, dotted table (the table is the
// wrapper's CSS). On the sheet: the elements, the title block in the bottom-right corner (as on an
// architect's presentation board) and, with real proportions, a "1 m" scale bar.
//   sheet     { format, cartouche, roomWidth } — see lib/moodboard.js
//   titleBlock{ title, date, author } — what the title block shows besides the sheet's own fields
//   statuses  Map objectId → collection status, for the stamps on the labels (stampLabels: their words)
//   onCartouche  called when the title block is clicked (to edit it)
export default function MoodboardCanvas({
  apiRef,
  elements,
  background,
  sheet,
  titleBlock,
  statuses,
  stampLabels,
  logo,
  selectedId,
  editingId,
  onSelect,
  onChange,
  onEdit,
  onCommitText,
  onZoomChange,
  onCartouche,
}) {
  const theme = BACKGROUNDS[background] ?? BACKGROUNDS.ink;
  const board = boardSize(sheet?.format);
  const library = useLibrary();
  const wrapRef = useRef(null);
  const stageRef = useRef(null);
  const contentRef = useRef(null);
  const trRef = useRef(null);
  const nodes = useRef(new Map());
  const [size, setSize] = useState(null);
  const [view, setView] = useState(null);
  const sizeRef = useRef(null);
  const viewRef = useRef(null);
  const boardRef = useRef(board);
  const selectedRef = useRef(selectedId);
  const fontsReady = useBoardFontsReady();
  const coarse = useCoarsePointer();

  useLayoutEffect(() => {
    viewRef.current = view;
    selectedRef.current = selectedId;
    boardRef.current = board;
  });

  /* ---------- viewport sizing & zoom ---------- */

  // ResizeObserver also fires once right after observe(), which gives the initial size.
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const ro = new ResizeObserver(() => {
      const rect = wrap.getBoundingClientRect();
      const next = { w: Math.round(rect.width), h: Math.round(rect.height) };
      const prev = sizeRef.current;
      if (prev && prev.w === next.w && prev.h === next.h) return;
      sizeRef.current = next;
      setSize(next);
      // Stay "fitted" until the user zooms; otherwise keep their zoom but re-clamp.
      const b = boardRef.current;
      setView((v) =>
        !v || v.fitted
          ? fitView(next.w, next.h, b)
          : clampView({ ...v, scale: Math.max(v.scale, fitScale(next.w, next.h, b)) }, next.w, next.h, b)
      );
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  // Another board (perhaps of another format) was opened: fit it.
  useLayoutEffect(() => {
    const s = sizeRef.current;
    if (s) setView(fitView(s.w, s.h, board));
  }, [board]);

  useEffect(() => {
    if (view) onZoomChange?.(Math.round(view.scale * 100) / 100);
  }, [view, onZoomChange]);

  const applyZoom = useCallback((getScale, point) => {
    setView((v) => {
      const s = sizeRef.current;
      const b = boardRef.current;
      if (!v || !s) return v;
      const fit = fitScale(s.w, s.h, b);
      const scale = clamp(getScale(v.scale), fit, Math.max(fit, MAX_ZOOM));
      if (scale <= fit + 1e-4) return fitView(s.w, s.h, b);
      const p = point ?? { x: s.w / 2, y: s.h / 2 };
      const bx = (p.x - v.x) / v.scale;
      const by = (p.y - v.y) / v.scale;
      return clampView({ scale, x: p.x - bx * scale, y: p.y - by * scale, fitted: false }, s.w, s.h, b);
    });
  }, []);

  /* ---------- selection / transformer ---------- */

  const registerNode = useCallback((id, node) => {
    if (node) nodes.current.set(id, node);
    else nodes.current.delete(id);
  }, []);

  const refreshTransformer = useCallback(() => {
    trRef.current?.forceUpdate();
    trRef.current?.getLayer()?.batchDraw();
  }, []);

  const hasStage = Boolean(size && view);

  useLayoutEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const el = elements.find((e) => e.id === selectedId);
    const node = el && !editingId ? nodes.current.get(el.id) : null;
    if (!node) {
      tr.nodes([]);
    } else {
      tr.setAttrs({
        ...TRANSFORMER_BY_TYPE[el.type],
        anchorSize: coarse ? 18 : 10,
        rotateAnchorOffset: coarse ? 34 : 26,
      });
      tr.nodes([node]);
      tr.forceUpdate();
    }
    tr.getLayer()?.batchDraw();
  }, [elements, selectedId, editingId, fontsReady, coarse, hasStage, statuses]);

  /* ---------- two-finger gestures ---------- */
  // Pinch on the selected element resizes/rotates it; anywhere else it zooms the board.

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    const container = stage.container();
    let pinch = null;

    const stopDrags = () => {
      if (stage.isDragging()) stage.stopDrag();
      nodes.current.forEach((n) => n.isDragging() && n.stopDrag());
    };

    const onStart = (e) => {
      if (e.touches.length !== 2) return;
      e.preventDefault();
      stopDrags();
      const rect = container.getBoundingClientRect();
      const t = touchPoints(e, rect);
      const node = selectedRef.current ? nodes.current.get(selectedRef.current) : null;
      let onNode = false;
      if (node && node.draggable()) {
        const box = node.getClientRect({ skipStroke: true });
        const inBox = (p) => p.x >= box.x && p.x <= box.x + box.width && p.y >= box.y && p.y <= box.y + box.height;
        onNode = inBox(t.center) || t.points.some(inBox);
      }
      stage.draggable(false);
      if (onNode) {
        const parentBox = node.getClientRect({ relativeTo: node.getParent(), skipStroke: true });
        const center = { x: parentBox.x + parentBox.width / 2, y: parentBox.y + parentBox.height / 2 };
        pinch = {
          mode: "element",
          node,
          start: t,
          center,
          offset: { x: node.x() - center.x, y: node.y() - center.y },
          rotation: node.rotation(),
          draggable: node.draggable(),
        };
        node.draggable(false);
      } else {
        pinch = { mode: "view", start: t, view: viewRef.current };
      }
    };

    const onMove = (e) => {
      if (!pinch || e.touches.length !== 2) return;
      e.preventDefault();
      const t = touchPoints(e, container.getBoundingClientRect());
      const ratio = t.dist / pinch.start.dist;
      if (pinch.mode === "view") {
        const s = sizeRef.current;
        const b = boardRef.current;
        const v0 = pinch.view;
        const fit = fitScale(s.w, s.h, b);
        const scale = clamp(v0.scale * ratio, fit, Math.max(fit, MAX_ZOOM));
        const bx = (pinch.start.center.x - v0.x) / v0.scale;
        const by = (pinch.start.center.y - v0.y) / v0.scale;
        setView(
          scale <= fit + 1e-4
            ? fitView(s.w, s.h, b)
            : clampView({ scale, x: t.center.x - bx * scale, y: t.center.y - by * scale, fitted: false }, s.w, s.h, b)
        );
        return;
      }
      const viewScale = viewRef.current.scale;
      const dRot = t.angle - pinch.start.angle;
      const off = rotatePoint(pinch.offset.x * ratio, pinch.offset.y * ratio, dRot);
      const cx = pinch.center.x + (t.center.x - pinch.start.center.x) / viewScale;
      const cy = pinch.center.y + (t.center.y - pinch.start.center.y) / viewScale;
      pinch.node.setAttrs({ x: cx + off.x, y: cy + off.y, rotation: pinch.rotation + dRot, scaleX: ratio, scaleY: ratio });
      refreshTransformer();
    };

    const onEnd = (e) => {
      if (!pinch || e.touches.length >= 2) return;
      if (pinch.mode === "element") {
        pinch.node.draggable(pinch.draggable);
        // Reuse each element's own "bake the scale" logic.
        pinch.node.fire("transformend");
      }
      stage.draggable(Boolean(viewRef.current && !viewRef.current.fitted));
      pinch = null;
    };

    const opts = { passive: false, capture: true };
    container.addEventListener("touchstart", onStart, opts);
    container.addEventListener("touchmove", onMove, opts);
    container.addEventListener("touchend", onEnd, opts);
    container.addEventListener("touchcancel", onEnd, opts);
    return () => {
      container.removeEventListener("touchstart", onStart, opts);
      container.removeEventListener("touchmove", onMove, opts);
      container.removeEventListener("touchend", onEnd, opts);
      container.removeEventListener("touchcancel", onEnd, opts);
    };
  }, [hasStage, refreshTransformer]);

  /* ---------- imperative API for the editor ---------- */

  useImperativeHandle(
    apiRef,
    () => ({
      zoomIn: () => applyZoom((s) => s * 1.25),
      zoomOut: () => applyZoom((s) => s / 1.25),
      zoomFit: () => sizeRef.current && setView(fitView(sizeRef.current.w, sizeRef.current.h, boardRef.current)),
      board: () => boardRef.current,
      viewCenter: () => {
        const v = viewRef.current;
        const s = sizeRef.current;
        const b = boardRef.current;
        if (!v || !s) return { x: b.w / 2, y: b.h / 2 };
        return {
          x: clamp((s.w / 2 - v.x) / v.scale, 100, b.w - 100),
          y: clamp((s.h / 2 - v.y) / v.scale, 80, b.h - 80),
        };
      },
      // Board coordinates for a viewport point, or null when it's outside the canvas.
      clientToBoard: (clientX, clientY) => {
        const rect = wrapRef.current?.getBoundingClientRect();
        const v = viewRef.current;
        const b = boardRef.current;
        if (!rect || !v) return null;
        if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;
        return {
          x: clamp((clientX - rect.left - v.x) / v.scale, 0, b.w),
          y: clamp((clientY - rect.top - v.y) / v.scale, 0, b.h),
        };
      },
      // Renders the full board at the given resolution (2× by default) regardless of the current
      // zoom, without UI chrome. Photos whose host refuses to share them (marked by
      // lib/moodboardHooks.js) would make the whole picture unreadable: they are left out, and
      // counted in `skipped`. Returns { url, skipped }.
      exportImage: ({ pixelRatio = 2 } = {}) => {
        const stage = stageRef.current;
        const layer = contentRef.current;
        const tr = trRef.current;
        const b = boardRef.current;
        const prev = { x: stage.x(), y: stage.y(), scale: stage.scaleX() };
        const attached = tr.nodes();
        const handles = layer.find(".handle");
        const blocked = layer.find("Image").filter((node) => node.visible() && node.image()?.dataset?.tainted);
        tr.nodes([]);
        handles.forEach((h) => h.hide());
        blocked.forEach((node) => node.hide());
        stage.position({ x: 0, y: 0 });
        stage.scale({ x: 1, y: 1 });
        try {
          return { url: layer.toDataURL({ x: 0, y: 0, width: b.w, height: b.h, pixelRatio }), skipped: blocked.length };
        } finally {
          stage.position({ x: prev.x, y: prev.y });
          stage.scale({ x: prev.scale, y: prev.scale });
          handles.forEach((h) => h.show());
          blocked.forEach((node) => node.show());
          tr.nodes(attached);
          stage.batchDraw();
        }
      },
    }),
    [applyZoom]
  );

  /* ---------- stage events ---------- */

  function handlePress(e) {
    const stage = e.target.getStage();
    if (e.target === stage || e.target.name() === "board-bg") onSelect(null);
  }

  function handleWheel(e) {
    const evt = e.evt;
    const v = viewRef.current;
    if (!v) return;
    evt.preventDefault();
    if (evt.ctrlKey || evt.metaKey) {
      // Ctrl/⌘ + wheel, and trackpad pinch, zoom around the pointer.
      const factor = Math.exp(-evt.deltaY * 0.0025);
      applyZoom((s) => s * factor, stageRef.current.getPointerPosition());
    } else if (!v.fitted) {
      // The board fills the window: the wheel pans it when zoomed in.
      const s = sizeRef.current;
      setView((cur) => clampView({ ...cur, x: cur.x - evt.deltaX, y: cur.y - evt.deltaY }, s.w, s.h, boardRef.current));
    }
  }

  const pannable = Boolean(view && !view.fitted && !editingId);
  const editingEl = editingId ? elements.find((el) => el.id === editingId) : null;
  const handleSize = (coarse ? 11 : 7) / (view?.scale || 1);

  function renderElement(el) {
    const common = { el, theme, draggable: !editingId, onSelect, onChange, registerNode };
    switch (el.type) {
      case "material": {
        const src =
          MATERIALS_BY_ID[el.materialId]?.src ?? library.materials.find((m) => m.id === el.materialId)?.src ?? null;
        return <MoodboardMaterial {...common} key={el.id} src={src} />;
      }
      case "color":
        return <MoodboardSwatch {...common} key={el.id} />;
      case "shape":
        return <MoodboardShape {...common} key={el.id} />;
      case "image":
        return <MoodboardImage {...common} key={el.id} />;
      case "photo": {
        const object = objectById(el.objectId);
        return object ? <MoodboardTile {...common} key={el.id} object={object} status={statuses?.get(el.objectId) ?? null} stampText={stampLabels?.[statuses?.get(el.objectId)]} /> : null;
      }
      case "sticker": {
        const sticker = STICKERS_BY_ID[el.stickerId];
        return sticker ? <MoodboardSticker {...common} key={el.id} sticker={sticker} /> : null;
      }
      case "text":
        return <MoodboardText {...common} key={el.id} editing={editingId === el.id} onEdit={onEdit} />;
      case "arrow": {
        const selected = selectedId === el.id && !editingId;
        return (
          <MoodboardArrow
            {...common}
            key={el.id}
            selected={selected}
            handleSize={selected ? handleSize : 0}
            onLiveChange={refreshTransformer}
          />
        );
      }
      default:
        return null;
    }
  }

  return (
    <div ref={wrapRef} className={`mb-canvas${pannable ? " is-pannable" : ""}`}>
      {hasStage && (
        <Stage
          ref={stageRef}
          width={size.w}
          height={size.h}
          x={view.x}
          y={view.y}
          scaleX={view.scale}
          scaleY={view.scale}
          draggable={pannable}
          dragBoundFunc={(pos) => {
            const c = clampView({ ...viewRef.current, x: pos.x, y: pos.y }, sizeRef.current.w, sizeRef.current.h, boardRef.current);
            return { x: c.x, y: c.y };
          }}
          onDragEnd={(e) => {
            const stage = e.target.getStage();
            if (e.target !== stage) return;
            setView((v) => ({ ...v, x: stage.x(), y: stage.y() }));
          }}
          onMouseDown={handlePress}
          onTouchStart={handlePress}
          onWheel={handleWheel}
        >
          <Layer ref={contentRef}>
            <Rect
              name="board-bg"
              width={board.w}
              height={board.h}
              fill={theme.fill}
              shadowColor="#000"
              shadowBlur={40}
              shadowOffsetY={14}
              shadowOpacity={0.5}
              shadowForStrokeEnabled={false}
            />
            <Group clipX={0} clipY={0} clipWidth={board.w} clipHeight={board.h}>
              {fontsReady && elements.map(renderElement)}
            </Group>
            {fontsReady && sheet?.roomWidth && <ScaleBar board={board} roomWidth={sheet.roomWidth} theme={theme} />}
            {fontsReady && sheet && !sheet.cartouche?.hidden && (
              <MoodboardCartouche board={board} cartouche={sheet.cartouche} titleBlock={titleBlock} theme={theme} logo={logo} onEdit={onCartouche} />
            )}
          </Layer>
          <Layer>
            <Transformer
              ref={trRef}
              flipEnabled={false}
              ignoreStroke
              rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
              rotationSnapTolerance={6}
              borderStroke={theme.accent}
              borderDash={[4, 4]}
              anchorStroke={theme.accent}
              anchorFill={theme.fill}
              anchorStrokeWidth={1.5}
              anchorCornerRadius={10}
              boundBoxFunc={(oldBox, newBox) =>
                Math.abs(newBox.width) < 16 || Math.abs(newBox.height) < 12 ? oldBox : newBox
              }
            />
          </Layer>
        </Stage>
      )}
      {editingEl && view && (
        <MoodboardTextEditor
          key={editingEl.id}
          el={editingEl}
          view={view}
          onCommit={(text) => onCommitText(editingEl.id, text)}
        />
      )}
    </div>
  );
}
