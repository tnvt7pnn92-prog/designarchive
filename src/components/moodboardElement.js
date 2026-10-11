import { useCallback } from "react";
import { BOARD_W, BOARD_H } from "../lib/moodboard.js";

// Keep at least this much of an element on the board so nothing can be lost off-sheet.
const EDGE = 40;

export function keepOnBoard(node) {
  const parent = node.getParent();
  const rect = node.getClientRect({ relativeTo: parent, skipStroke: true, skipShadow: true });
  // The elements' group is clipped to the sheet, so its clip is the sheet's size.
  const W = parent.clipWidth?.() || BOARD_W;
  const H = parent.clipHeight?.() || BOARD_H;
  let dx = 0;
  let dy = 0;
  if (rect.x + rect.width < EDGE) dx = EDGE - (rect.x + rect.width);
  else if (rect.x > W - EDGE) dx = W - EDGE - rect.x;
  if (rect.y + rect.height < EDGE) dy = EDGE - (rect.y + rect.height);
  else if (rect.y > H - EDGE) dy = H - EDGE - rect.y;
  return { x: node.x() + dx, y: node.y() + dy };
}

export function useElementRef(id, registerNode) {
  return useCallback((node) => registerNode(id, node), [id, registerNode]);
}

// Select on press (so one gesture selects and drags) and commit the position once the
// drag ends — nothing is written to state while the pointer is moving.
export function elementEvents(id, { onSelect, onChange }) {
  return {
    onMouseDown: () => onSelect(id),
    onTouchStart: () => onSelect(id),
    onDragEnd: (e) => {
      // Ignore drag events bubbling up from child handles (arrow endpoints).
      if (e.target !== e.currentTarget) return;
      const pos = keepOnBoard(e.target);
      e.target.position(pos);
      onChange(id, pos);
    },
  };
}

// Transformer resizes by scaling; bake the scale back into real dimensions so stroke
// widths, fonts and later transforms stay predictable.
export function takeScale(node) {
  const scale = { x: node.scaleX(), y: node.scaleY() };
  node.scale({ x: 1, y: 1 });
  return scale;
}

// transformend handler for free-ratio boxes (materials, colours, shapes, images).
export function bakeBox(el, onChange, min = 24) {
  return (e) => {
    const node = e.target;
    const scale = takeScale(node);
    onChange(el.id, {
      x: node.x(),
      y: node.y(),
      rotation: node.rotation(),
      width: Math.max(min, el.width * Math.abs(scale.x)),
      height: Math.max(min, el.height * Math.abs(scale.y)),
    });
  };
}
