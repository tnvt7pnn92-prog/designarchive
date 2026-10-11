import { useLayoutEffect, useRef } from "react";
import { FONTS, TEXT_LINE_HEIGHT, TEXT_PADDING } from "../lib/moodboard.js";

// In-place editor: a textarea laid exactly over the (hidden) Konva text node.
export default function MoodboardTextEditor({ el, view, onCommit }) {
  const ref = useRef(null);
  const done = useRef(false);
  const s = view.scale;
  const font = FONTS[el.font] ?? FONTS.hand;

  function autosize() {
    const ta = ref.current;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }

  useLayoutEffect(() => {
    autosize();
    ref.current.focus({ preventScroll: true });
    ref.current.select();
  }, []);

  function finish() {
    if (done.current) return;
    done.current = true;
    onCommit(ref.current.value);
  }

  return (
    <textarea
      ref={ref}
      className="mb-text-editor"
      defaultValue={el.text}
      spellCheck={false}
      style={{
        left: view.x + el.x * s,
        top: view.y + el.y * s,
        width: el.width * s,
        fontSize: el.fontSize * s,
        fontFamily: font.family,
        fontWeight: el.bold ? 700 : 400,
        fontStyle: el.italic ? "italic" : "normal",
        letterSpacing: `${font.letterSpacing}em`,
        lineHeight: TEXT_LINE_HEIGHT,
        padding: TEXT_PADDING * s,
        color: el.fill,
        textAlign: el.align,
        transform: `rotate(${el.rotation}deg)`,
      }}
      onInput={autosize}
      onBlur={finish}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape" || (e.key === "Enter" && (e.metaKey || e.ctrlKey))) {
          e.preventDefault();
          finish();
        }
      }}
    />
  );
}
