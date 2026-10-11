import { memo, useMemo } from "react";
import Konva from "konva";
import { Group, Rect, Image as KImage, Text, Path } from "react-konva";
import { FONTS, photoLayout } from "../lib/moodboard.js";
import { useKonvaImage } from "../lib/moodboardHooks.js";
import { placeholderIcon } from "../data/placeholderIcons.js";
import { elementEvents, takeScale, useElementRef } from "./moodboardElement.js";

// The colours of the site's museum label (components/Label.css): the label looks the same on the
// board as on every page, whatever the board's ground.
const PAPER = "#efe8da";
const INK = "#1b1916";
const INK_SOFT = "#5d574c";
const RULE = "#cfc6b4";
const STAMP = { own: "#3f6b52", want: "#9a4b2c" };

function measure(text, width, fontSize, fontFamily, fontStyle = "normal") {
  const probe = new Konva.Text({ text, width, fontSize, fontFamily, fontStyle, lineHeight: 1.15 });
  const h = probe.height();
  probe.destroy();
  return h;
}

// An archive piece on the board: its photo on a card, and its museum label pinned over the
// photo's foot — country, name, designer and year, and a stamp when the piece is in the
// collection as "I own it" or "Looking for". `el.showLabel === false` leaves the bare photo.
function MoodboardTile({ el, object, theme, status, stampText, draggable, onSelect, onChange, registerNode }) {
  const ref = useElementRef(el.id, registerNode);
  const image = useKonvaImage(object.image);
  const L = photoLayout(el.width);
  const labelled = el.showLabel !== false;

  const label = useMemo(() => {
    const k = L.k;
    const width = el.width - 4 * k;
    const pad = 7 * k;
    const inner = width - pad * 2;
    const nameSize = 11 * k;
    const bySize = 7.5 * k;
    const nameH = measure(object.name, inner, nameSize, FONTS.serif.family);
    const byH = measure(`${object.designer}, ${object.year}`, inner, bySize, FONTS.serif.family, "italic");
    const lineSize = 5.6 * k;
    const stampH = STAMP[status] ? 13 * k : 0;
    const height = pad + lineSize + 5 * k + nameH + 2 * k + byH + stampH + pad;
    return { k, width, pad, inner, nameSize, bySize, nameH, byH, lineSize, stampH, height };
  }, [el.width, L.k, object.name, object.designer, object.year, status]);

  // object-fit: cover for the 4:5 picture.
  const crop = useMemo(() => {
    if (!image) return undefined;
    const target = L.imageW / L.imageH;
    const ratio = image.naturalWidth / image.naturalHeight;
    if (ratio > target) {
      const w = image.naturalHeight * target;
      return { x: (image.naturalWidth - w) / 2, y: 0, width: w, height: image.naturalHeight };
    }
    const h = image.naturalWidth / target;
    return { x: 0, y: (image.naturalHeight - h) / 2, width: image.naturalWidth, height: h };
  }, [image, L.imageW, L.imageH]);

  const cardH = L.pad * 2 + L.imageH;
  const labelY = cardH - 22 * L.k;
  const iconSize = Math.min(L.imageW * 0.38, 74 * L.k);
  const stamp = STAMP[status];

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
        const scale = takeScale(node);
        onChange(el.id, {
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          width: Math.max(80, el.width * Math.abs(scale.x)),
        });
      }}
    >
      <Rect
        width={el.width}
        height={cardH}
        fill={theme.card}
        stroke={theme.cardStroke}
        strokeWidth={1}
        shadowColor="#000"
        shadowBlur={26 * L.k}
        shadowOffsetY={16 * L.k}
        shadowOpacity={theme.shadow}
        perfectDrawEnabled={false}
      />
      {image ? (
        <KImage image={image} crop={crop} x={L.pad} y={L.pad} width={L.imageW} height={L.imageH} listening={false} />
      ) : (
        <Group x={L.pad} y={L.pad} listening={false}>
          <Rect
            width={L.imageW}
            height={L.imageH}
            fillLinearGradientStartPoint={{ x: 0, y: 0 }}
            fillLinearGradientEndPoint={{ x: L.imageW * 0.35, y: L.imageH }}
            fillLinearGradientColorStops={[0, "#1b1a17", 1, "#131210"]}
          />
          <Group x={(L.imageW - iconSize) / 2} y={(L.imageH - iconSize) / 2} scaleX={iconSize / 48} scaleY={iconSize / 48}>
            {placeholderIcon(object.category).map((d) => (
              <Path key={d} data={d} stroke="#7a7368" strokeWidth={1} opacity={0.6} />
            ))}
          </Group>
        </Group>
      )}
      {labelled && (
        <Group x={2 * L.k} y={labelY} rotation={-1} listening={false}>
          <Rect
            width={label.width}
            height={label.height}
            fill={PAPER}
            cornerRadius={1.5 * L.k}
            shadowColor="#000"
            shadowBlur={12 * L.k}
            shadowOffsetY={6 * L.k}
            shadowOpacity={0.35}
            perfectDrawEnabled={false}
          />
          <Text
            x={label.pad}
            y={label.pad}
            width={label.inner}
            align="right"
            text={String(object.country ?? "").toUpperCase()}
            fontFamily={FONTS.mono.family}
            fontSize={label.lineSize}
            letterSpacing={0.5 * L.k}
            fill={INK_SOFT}
            wrap="none"
            ellipsis
          />
          <Text
            x={label.pad}
            y={label.pad + label.lineSize + 5 * L.k}
            width={label.inner}
            text={object.name}
            fontFamily={FONTS.serif.family}
            fontSize={label.nameSize}
            lineHeight={1.15}
            fill={INK}
          />
          <Text
            x={label.pad}
            y={label.pad + label.lineSize + 7 * L.k + label.nameH}
            width={label.inner}
            text={`${object.designer}, ${object.year}`}
            fontFamily={FONTS.serif.family}
            fontStyle="italic"
            fontSize={label.bySize}
            lineHeight={1.15}
            fill={INK_SOFT}
          />
          {stamp && (
            <Group x={label.width - label.pad} y={label.height - label.pad - 5 * L.k} rotation={-4}>
              <Text
                x={-60 * L.k}
                y={-5 * L.k}
                width={60 * L.k}
                align="right"
                text={String(stampText ?? "").toUpperCase()}
                fontFamily={FONTS.mono.family}
                fontStyle="bold"
                fontSize={6 * L.k}
                letterSpacing={0.8 * L.k}
                fill={stamp}
              />
            </Group>
          )}
          <Rect x={label.pad} y={label.pad + label.lineSize + 2.5 * L.k} width={label.inner} height={0.6 * L.k} fill={RULE} />
        </Group>
      )}
    </Group>
  );
}

export default memo(MoodboardTile);
