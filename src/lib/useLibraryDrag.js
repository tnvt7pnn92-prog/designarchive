import { useRef, useState } from "react";

const DRAG_THRESHOLD = 6;

// Drag an item from the sidebar library onto the board — pointer events, so it works with
// mouse, pen and touch (where HTML5 drag & drop doesn't). A plain click/tap adds the item
// in the middle of the visible board instead. `item` is any payload; `item.preview`
// describes the ghost that follows the pointer.
export function useLibraryDrag({ onPick, onDrop, onDragChange }) {
  const [ghost, setGhost] = useState(null);
  const gesture = useRef(null);
  const suppressClick = useRef(false);

  function end() {
    if (gesture.current?.dragging) onDragChange(false);
    gesture.current = null;
    setGhost(null);
  }

  const handlers = (item) => ({
    onPointerDown: (e) => {
      if (e.button !== 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      gesture.current = { item, x: e.clientX, y: e.clientY, dragging: false };
    },
    onPointerMove: (e) => {
      const g = gesture.current;
      if (!g) return;
      if (!g.dragging && Math.hypot(e.clientX - g.x, e.clientY - g.y) > DRAG_THRESHOLD) {
        g.dragging = true;
        onDragChange(true);
      }
      if (g.dragging) setGhost({ item, x: e.clientX, y: e.clientY });
    },
    onPointerUp: (e) => {
      const g = gesture.current;
      if (g?.dragging) {
        suppressClick.current = true;
        onDrop(g.item, e.clientX, e.clientY);
      }
      end();
    },
    onPointerCancel: end,
    onClick: () => {
      if (suppressClick.current) {
        suppressClick.current = false;
        return;
      }
      onPick(item);
    },
  });

  return { handlers, ghost };
}
