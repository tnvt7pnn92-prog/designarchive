import { memo, useMemo } from "react";
import { Group, Rect, Image as KImage, Text } from "react-konva";
import { FONTS, coverCrop, labelLayout } from "../lib/moodboard.js";
import { useKonvaImage } from "../lib/moodboardHooks.js";
import { bakeBox, elementEvents, useElementRef } from "./moodboardElement.js";

// Material sample: the texture cut to the element's box, with a NAME / "Stone · Italy" caption.
function MoodboardMaterial({ el, src, theme, draggable, onSelect, onChange, registerNode }) {
  const ref = useElementRef(el.id, registerNode);
  const image = useKonvaImage(src);
  const L = labelLayout(el.width);
  const crop = useMemo(() => (image ? coverCrop(image, el.width, el.height) : undefined), [image, el.width, el.height]);

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
        height={el.height}
        fill={theme.card}
        stroke={theme.cardStroke}
        strokeWidth={1}
        shadowColor="#000"
        shadowBlur={18 * L.k}
        shadowOffsetY={8 * L.k}
        shadowOpacity={theme.shadow}
        perfectDrawEnabled={false}
      />
      {image && <KImage image={image} crop={crop} width={el.width} height={el.height} listening={false} />}
      {el.showLabel && (
        <>
          <Rect y={el.height} width={el.width} height={L.height} fill="transparent" />
          <Text
            y={el.height + L.gap}
            width={el.width}
            text={(el.name || " ").toUpperCase()}
            fontSize={L.nameSize}
            fontFamily={FONTS.sans.family}
            fontStyle="bold"
            letterSpacing={L.nameSize * 0.16}
            fill={theme.ink}
            wrap="none"
            ellipsis
          />
          {el.meta && (
            <Text
              y={el.height + L.metaY}
              width={el.width}
              text={el.meta}
              fontSize={L.metaSize * 1.12}
              fontFamily={FONTS.serif.family}
              fontStyle="italic"
              fill={theme.muted}
              wrap="none"
              ellipsis
            />
          )}
        </>
      )}
    </Group>
  );
}

export default memo(MoodboardMaterial);
