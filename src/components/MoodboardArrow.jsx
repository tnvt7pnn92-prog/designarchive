import { memo, useEffect, useState } from "react";
import { Group, Rect, Shape, Circle } from "react-konva";
import { arrowGeometry } from "../lib/moodboard.js";
import { elementEvents, takeScale, useElementRef } from "./moodboardElement.js";

const DASHES = {
  solid: () => [],
  dashed: (w) => [w * 3 + 6, w * 2.4 + 6],
  dotted: (w) => [0.1, w * 2 + 4],
};

const circleRadius = (w) => Math.max(3.5, w * 1.8);

function quadPoint(p0, c, p2, t) {
  const u = 1 - t;
  return { x: u * u * p0.x + 2 * u * t * c.x + t * t * p2.x, y: u * u * p0.y + 2 * u * t * c.y + t * t * p2.y };
}

// Sub-curve of a quadratic Bézier between t0 and t1 (blossoming).
function subQuad(p0, c, p2, t0, t1) {
  const a = (1 - t0) * (1 - t1);
  const b = (1 - t0) * t1 + t0 * (1 - t1);
  const d = t0 * t1;
  return {
    from: quadPoint(p0, c, p2, t0),
    ctrl: { x: a * p0.x + b * c.x + d * p2.x, y: a * p0.y + b * c.y + d * p2.y },
    to: quadPoint(p0, c, p2, t1),
  };
}

function curveLength(p0, c, p2) {
  let length = 0;
  let prev = p0;
  for (let i = 1; i <= 12; i++) {
    const p = quadPoint(p0, c, p2, i / 12);
    length += Math.hypot(p.x - prev.x, p.y - prev.y);
    prev = p;
  }
  return length || 1;
}

// How far the line must stop short of the tip so it doesn't poke through the head.
function headInset(head, g, w) {
  if (head === "triangle") return g.headLen * 0.75;
  if (head === "circle") return circleRadius(w);
  return 0;
}

function drawHead(ctx, head, tip, from, g, w, color) {
  if (!head || head === "none") return;
  const len = Math.hypot(tip.x - from.x, tip.y - from.y) || 1;
  const ux = (tip.x - from.x) / len;
  const uy = (tip.y - from.y) / len;
  const L = g.headLen;
  ctx.setAttr("fillStyle", color);
  ctx.setAttr("strokeStyle", color);
  ctx.setAttr("lineCap", "round");
  ctx.setAttr("lineJoin", "round");
  ctx.beginPath();
  if (head === "triangle") {
    const bx = tip.x - ux * L;
    const by = tip.y - uy * L;
    const hw = L * 0.55;
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(bx - uy * hw, by + ux * hw);
    ctx.lineTo(bx + uy * hw, by - ux * hw);
    ctx.closePath();
    ctx.setAttr("lineWidth", Math.max(1, w * 0.5));
    ctx.fill();
    ctx.stroke();
  } else if (head === "open") {
    const a = 0.52;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const l = L * 1.05;
    ctx.moveTo(tip.x - l * (ux * cos - uy * sin), tip.y - l * (ux * sin + uy * cos));
    ctx.lineTo(tip.x, tip.y);
    ctx.lineTo(tip.x - l * (ux * cos + uy * sin), tip.y - l * (-ux * sin + uy * cos));
    ctx.setAttr("lineWidth", w);
    ctx.stroke();
  } else if (head === "circle") {
    ctx.arc(tip.x, tip.y, circleRadius(w), 0, Math.PI * 2);
    ctx.fill();
  } else if (head === "bar") {
    const h = L * 0.6;
    ctx.moveTo(tip.x - uy * h, tip.y + ux * h);
    ctx.lineTo(tip.x + uy * h, tip.y - ux * h);
    ctx.setAttr("lineWidth", w);
    ctx.stroke();
  }
}

function stopBubble(e) {
  e.cancelBubble = true;
}

function setCursor(e, cursor) {
  const container = e.target.getStage()?.container();
  if (container) container.style.cursor = cursor;
}

// Arrow = group (position/rotation) + custom-drawn quadratic curve in local coordinates.
// When selected it shows handles for both ends and for the bend, on top of the shared
// Transformer handles.
function MoodboardArrow({ el, selected, handleSize, draggable, onSelect, onChange, onLiveChange, registerNode }) {
  const ref = useElementRef(el.id, registerNode);
  const [draft, setDraft] = useState(null);
  const shape = draft ? { ...el, ...draft } : el;
  const g = arrowGeometry(shape);

  useEffect(() => {
    if (draft) onLiveChange?.();
  }, [draft, onLiveChange]);

  function sceneFunc(ctx) {
    const w = shape.strokeWidth;
    const length = curveLength(g.p1, g.c, g.p2);
    const t0 = Math.min(0.45, headInset(shape.headStart, g, w) / length);
    const t1 = 1 - Math.min(0.45, headInset(shape.headEnd, g, w) / length);
    const seg = subQuad(g.p1, g.c, g.p2, t0, t1);
    ctx.beginPath();
    ctx.moveTo(seg.from.x, seg.from.y);
    ctx.quadraticCurveTo(seg.ctrl.x, seg.ctrl.y, seg.to.x, seg.to.y);
    ctx.setAttr("strokeStyle", shape.stroke);
    ctx.setAttr("lineWidth", w);
    ctx.setAttr("lineCap", "round");
    ctx.setAttr("lineJoin", "round");
    ctx.setLineDash((DASHES[shape.dash] ?? DASHES.solid)(w));
    ctx.stroke();
    ctx.setLineDash([]);
    drawHead(ctx, shape.headEnd, g.p2, g.c, g, w, shape.stroke);
    drawHead(ctx, shape.headStart, g.p1, g.c, g, w, shape.stroke);
  }

  function hitFunc(ctx, node) {
    ctx.beginPath();
    ctx.moveTo(g.p1.x, g.p1.y);
    ctx.quadraticCurveTo(g.c.x, g.c.y, g.p2.x, g.p2.y);
    ctx.fillStrokeShape(node);
  }

  const onHandleMove = (kind) => (e) => {
    const node = e.target;
    const base = draft ?? { points: el.points, bend: el.bend };
    const [x1, y1, x2, y2] = base.points;
    if (kind === "start") {
      setDraft({ ...base, points: [node.x(), node.y(), x2, y2] });
    } else if (kind === "end") {
      setDraft({ ...base, points: [x1, y1, node.x(), node.y()] });
    } else {
      // The bend handle slides along the chord's normal; near the chord it snaps straight.
      const gg = arrowGeometry({ ...el, ...base });
      let bend = (node.x() - gg.chordMid.x) * gg.normal.x + (node.y() - gg.chordMid.y) * gg.normal.y;
      if (Math.abs(bend) < 4) bend = 0;
      node.position({ x: gg.chordMid.x + gg.normal.x * bend, y: gg.chordMid.y + gg.normal.y * bend });
      setDraft({ ...base, bend });
    }
  };

  const onHandleEnd = (e) => {
    e.cancelBubble = true;
    if (draft) onChange(el.id, draft);
    setDraft(null);
  };

  const handleProps = (kind) => ({
    name: "handle",
    draggable: true,
    onMouseDown: stopBubble,
    onTouchStart: stopBubble,
    onDragMove: onHandleMove(kind),
    onDragEnd: onHandleEnd,
    onMouseEnter: (e) => setCursor(e, kind === "mid" ? "move" : "crosshair"),
    onMouseLeave: (e) => setCursor(e, ""),
  });

  return (
    <Group
      ref={ref}
      x={el.x}
      y={el.y}
      rotation={el.rotation}
      draggable={draggable}
      {...elementEvents(el.id, { onSelect, onChange })}
      onTransformEnd={(e) => {
        const node = e.target;
        if (node !== e.currentTarget) return;
        const s = takeScale(node);
        const points = el.points.map((v, i) => (i % 2 ? v * s.y : v * s.x));
        const before = arrowGeometry(el);
        const after = arrowGeometry({ ...el, points, bend: 0 });
        const m = { x: before.m.x * s.x, y: before.m.y * s.y };
        const bend = (m.x - after.chordMid.x) * after.normal.x + (m.y - after.chordMid.y) * after.normal.y;
        onChange(el.id, { x: node.x(), y: node.y(), rotation: node.rotation(), points, bend });
      }}
    >
      {/* Invisible box: gives the Transformer the arrow's true bounds (heads included). */}
      <Rect {...g.bbox} listening={false} />
      <Shape
        sceneFunc={sceneFunc}
        hitFunc={hitFunc}
        stroke={shape.stroke}
        strokeWidth={shape.strokeWidth}
        hitStrokeWidth={Math.max(22, shape.strokeWidth + 16)}
      />
      {selected && handleSize > 0 && (
        <>
          <Circle
            {...handleProps("mid")}
            x={g.m.x}
            y={g.m.y}
            radius={handleSize * 0.75}
            fill="#c9a44d"
            stroke="#0e0e0e"
            strokeWidth={handleSize * 0.25}
          />
          {[
            ["start", g.p1],
            ["end", g.p2],
          ].map(([kind, p]) => (
            <Circle
              key={kind}
              {...handleProps(kind)}
              x={p.x}
              y={p.y}
              radius={handleSize}
              fill="#0e0e0e"
              stroke="#c9a44d"
              strokeWidth={handleSize * 0.3}
            />
          ))}
        </>
      )}
    </Group>
  );
}

export default memo(MoodboardArrow);
