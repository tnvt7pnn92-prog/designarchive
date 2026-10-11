import { memo } from "react";
import { Image as KImage } from "react-konva";
import { useKonvaImage } from "../lib/moodboardHooks.js";
import { bakeBox, elementEvents, useElementRef } from "./moodboardElement.js";

// A photo uploaded by the user, drawn edge to edge with a soft shadow.
function MoodboardImage({ el, theme, draggable, onSelect, onChange, registerNode }) {
  const ref = useElementRef(el.id, registerNode);
  const image = useKonvaImage(el.src);

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
      shadowBlur={22}
      shadowOffsetY={10}
      shadowOpacity={theme.shadow}
      perfectDrawEnabled={false}
      {...elementEvents(el.id, { onSelect, onChange })}
      onTransformEnd={bakeBox(el, onChange, 40)}
    />
  );
}

export default memo(MoodboardImage);
