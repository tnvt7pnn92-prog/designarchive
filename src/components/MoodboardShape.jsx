import { memo } from "react";
import { Group, Rect, Ellipse, Shape } from "react-konva";
import { bakeBox, elementEvents, useElementRef } from "./moodboardElement.js";

// Flat graphic blocks for composing the board: rectangle, circle and arch, filled or outlined.
function MoodboardShape({ el, draggable, onSelect, onChange, registerNode }) {
  const ref = useElementRef(el.id, registerNode);
  const { width: w, height: h } = el;
  // Outlined shapes stay grabbable across their whole area.
  const paint = el.outline
    ? { fill: "transparent", stroke: el.fill, strokeWidth: 2, strokeScaleEnabled: false }
    : { fill: el.fill };

  return (
    <Group
      ref={ref}
      x={el.x}
      y={el.y}
      rotation={el.rotation}
      draggable={draggable}
      {...elementEvents(el.id, { onSelect, onChange })}
      onTransformEnd={bakeBox(el, onChange)}
    >
      {el.kind === "circle" && <Ellipse x={w / 2} y={h / 2} radiusX={w / 2} radiusY={h / 2} {...paint} />}
      {el.kind === "rect" && <Rect width={w} height={h} {...paint} />}
      {el.kind === "arch" && (
        <Shape
          width={w}
          height={h}
          sceneFunc={(ctx, shape) => {
            const r = w / 2;
            const top = Math.min(r, h);
            ctx.beginPath();
            ctx.moveTo(0, h);
            ctx.lineTo(0, top);
            ctx.arc(r, top, r, Math.PI, 0);
            ctx.lineTo(w, h);
            ctx.closePath();
            ctx.fillStrokeShape(shape);
          }}
          {...paint}
        />
      )}
    </Group>
  );
}

export default memo(MoodboardShape);
