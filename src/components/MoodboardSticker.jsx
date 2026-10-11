import { memo } from "react";
import { Image as KImage } from "react-konva";
import { useKonvaImage } from "../lib/moodboardHooks.js";
import { elementEvents, takeScale, useElementRef } from "./moodboardElement.js";

function MoodboardSticker({ el, sticker, draggable, onSelect, onChange, registerNode }) {
  const ref = useElementRef(el.id, registerNode);
  const image = useKonvaImage(sticker.src);

  return (
    <KImage
      ref={ref}
      image={image}
      x={el.x}
      y={el.y}
      width={el.width}
      height={el.height}
      rotation={el.rotation}
      draggable={draggable}
      shadowColor="#000"
      shadowBlur={10}
      shadowOffsetY={4}
      shadowOpacity={0.35}
      perfectDrawEnabled={false}
      {...elementEvents(el.id, { onSelect, onChange })}
      onTransformEnd={(e) => {
        const node = e.target;
        const scale = takeScale(node);
        onChange(el.id, {
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          width: Math.max(16, el.width * Math.abs(scale.x)),
          height: Math.max(16, el.height * Math.abs(scale.y)),
        });
      }}
    />
  );
}

export default memo(MoodboardSticker);
