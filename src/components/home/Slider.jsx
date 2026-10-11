import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../../i18n/LanguageContext.jsx";

// A row that the visitor moves sideways when they want to, and only then: a swipe or a trackpad,
// the arrow buttons, the keyboard's arrow keys (the row takes focus), or a drag with the mouse. The
// page's own scroll stays vertical and is never held back. onMove(track) runs once per frame while
// the row moves, for the effects that follow it (parallax, the time machine's year).
export default function Slider({ label, head, className = "", trackClassName = "", onMove, children }) {
  const { t } = useLanguage();
  const track = useRef(null);
  const [ends, setEnds] = useState({ start: true, end: false });
  const move = useRef(onMove);
  useEffect(() => {
    move.current = onMove;
  });

  useEffect(() => {
    const el = track.current;
    if (!el) return undefined;
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = el.scrollWidth - el.clientWidth;
      setEnds((prev) => {
        const next = { start: el.scrollLeft <= 2, end: el.scrollLeft >= max - 2 };
        return prev.start === next.start && prev.end === next.end ? prev : next;
      });
      move.current?.(el);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();

    // Dragging with the mouse (touch screens already swipe natively). A drag never opens a link.
    let drag = null;
    const down = (event) => {
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      drag = { x: event.clientX, left: el.scrollLeft, moved: 0 };
    };
    const dragMove = (event) => {
      if (!drag) return;
      const dx = event.clientX - drag.x;
      drag.moved = Math.max(drag.moved, Math.abs(dx));
      if (drag.moved > 5) {
        el.classList.add("is-dragging");
        el.scrollLeft = drag.left - dx;
      }
    };
    const up = () => {
      if (!drag) return;
      const moved = drag.moved;
      drag = null;
      el.classList.remove("is-dragging");
      if (moved > 5) {
        // Let the row settle on the nearest card again.
        el.scrollBy({ left: 0 });
        const block = (event) => {
          event.preventDefault();
          event.stopPropagation();
        };
        el.addEventListener("click", block, { capture: true, once: true });
        setTimeout(() => el.removeEventListener("click", block, { capture: true }), 0);
      }
    };
    const noNativeDrag = (event) => event.preventDefault();

    el.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", dragMove);
    window.addEventListener("pointerup", up);
    el.addEventListener("dragstart", noNativeDrag);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", dragMove);
      window.removeEventListener("pointerup", up);
      el.removeEventListener("dragstart", noNativeDrag);
    };
  }, []);

  // One card further, either way.
  function step(dir) {
    const el = track.current;
    const card = el?.firstElementChild;
    if (!card) return;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    el.scrollBy({ left: dir * (card.getBoundingClientRect().width + gap), behavior: "smooth" });
  }

  return (
    <div className={`home-slider ${className}`}>
      <div className="home-slider__bar">
        <div className="home-slider__head">{head}</div>
        <div className="home-slider__nav">
          <button type="button" onClick={() => step(-1)} disabled={ends.start} aria-label={t("piece.previous")}>
            <span aria-hidden="true">←</span>
          </button>
          <button type="button" onClick={() => step(1)} disabled={ends.end} aria-label={t("piece.next")}>
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
      <div ref={track} className={`home-slider__track ${trackClassName}`} tabIndex={0} role="region" aria-label={label}>
        {children}
      </div>
    </div>
  );
}
