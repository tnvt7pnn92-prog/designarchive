import { memo } from "react";
import { Text } from "react-konva";
import { FONTS, TEXT_LINE_HEIGHT, TEXT_PADDING, fontStyle } from "../lib/moodboard.js";
import { elementEvents, takeScale, useElementRef } from "./moodboardElement.js";

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// Free text box. Side handles reflow the width, corner handles scale the type.
function MoodboardText({ el, draggable, editing, onSelect, onChange, onEdit, registerNode }) {
  const ref = useElementRef(el.id, registerNode);
  const font = FONTS[el.font] ?? FONTS.hand;

  return (
    <Text
      ref={ref}
      x={el.x}
      y={el.y}
      rotation={el.rotation}
      width={el.width}
      text={el.text || " "}
      fontSize={el.fontSize}
      fontFamily={font.family}
      fontStyle={fontStyle(el)}
      letterSpacing={font.letterSpacing * el.fontSize}
      lineHeight={TEXT_LINE_HEIGHT}
      padding={TEXT_PADDING}
      align={el.align}
      fill={el.fill}
      visible={!editing}
      draggable={draggable}
      {...elementEvents(el.id, { onSelect, onChange })}
      onDblClick={() => onEdit(el.id)}
      onDblTap={() => onEdit(el.id)}
      onTransform={(e) => {
        const node = e.target;
        // Corner handles keep the ratio (sx === sy); a side handle only changes sx.
        if (Math.abs(node.scaleX() - node.scaleY()) > 0.001) {
          node.setAttrs({ width: Math.max(40, node.width() * node.scaleX()), scaleX: 1, scaleY: 1 });
        }
      }}
      onTransformEnd={(e) => {
        const node = e.target;
        const scale = Math.abs(takeScale(node).x);
        onChange(el.id, {
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          width: Math.max(40, node.width() * scale),
          fontSize: clamp(Math.round(el.fontSize * scale), 8, 320),
        });
      }}
    />
  );
}

export default memo(MoodboardText);
