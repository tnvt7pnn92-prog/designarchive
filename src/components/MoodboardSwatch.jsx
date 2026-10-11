import { memo } from "react";
import { Group, Rect, Text } from "react-konva";
import { FONTS, labelLayout } from "../lib/moodboard.js";
import { hexToRgb, isPale } from "../data/moodboardColors.js";
import { bakeBox, elementEvents, useElementRef } from "./moodboardElement.js";

const CARD = "#ffffff";
const CARD_INK = "#16150f";
const CARD_MUTED = "#77705f";

// Colour swatch as a Pantone-style chip: a white card with the colour block on top and the
// NAME / "HEX · RGB" caption printed on the white strip below. `width` is the card width,
// `height` the colour block's height.
function MoodboardSwatch({ el, theme, draggable, onSelect, onChange, registerNode }) {
  const ref = useElementRef(el.id, registerNode);
  const L = labelLayout(el.width);
  const pad = Math.max(4, el.width * 0.065);
  const inner = el.width - pad * 2;
  const captionH = el.showLabel ? L.height + pad * 0.9 : pad;
  const cardH = pad + el.height + captionH;

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
      <Rect
        width={el.width}
        height={cardH}
        fill={CARD}
        stroke={theme.cardStroke}
        strokeWidth={0.5}
        cornerRadius={1.5 * L.k}
        shadowColor="#000"
        shadowBlur={16 * L.k}
        shadowOffsetY={7 * L.k}
        shadowOpacity={theme.shadow}
        perfectDrawEnabled={false}
      />
      <Rect
        x={pad}
        y={pad}
        width={inner}
        height={el.height}
        fill={el.hex}
        stroke={isPale(el.hex) ? "rgba(0,0,0,0.08)" : undefined}
        strokeWidth={1}
        listening={false}
      />
      {el.showLabel && (
        <>
          <Text
            x={pad}
            y={pad + el.height + L.gap * 0.85}
            width={inner}
            text={(el.name || el.hex).toUpperCase()}
            fontSize={L.nameSize}
            fontFamily={FONTS.sans.family}
            fontStyle="bold"
            letterSpacing={L.nameSize * 0.12}
            fill={CARD_INK}
            wrap="none"
            ellipsis
            listening={false}
          />
          <Text
            x={pad}
            y={pad + el.height + L.metaY * 0.95}
            width={inner}
            text={`${el.hex.toUpperCase()} · RGB ${hexToRgb(el.hex).join(" ")}`}
            fontSize={L.metaSize}
            fontFamily={FONTS.mono.family}
            fill={CARD_MUTED}
            wrap="none"
            ellipsis
            listening={false}
          />
        </>
      )}
    </Group>
  );
}

export default memo(MoodboardSwatch);
