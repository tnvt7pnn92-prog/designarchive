import { useEffect, useRef } from "react";
import { onFrame, pointer, lerp } from "../../lib/frameLoop.js";

// The home page's cursor, with a mouse only and without reduced motion: a thin gold ring that
// trails the pointer and a dot exactly on it. Its shape never changes; over the gold buttons it turns
// dark so it can still be seen, and it fades when the pointer leaves the window.
const GOLD = ".home-btn--gold, .btn--gold, .home-tabs [aria-pressed='true'], .site-footer__langs [aria-pressed='true'], .home-slider__nav button:not(:disabled), .site-footer__partners";

export default function HomeCursor() {
  const ring = useRef(null);
  const dot = useRef(null);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("has-home-cursor");
    const pos = { x: pointer.x, y: pointer.y };
    const stop = onFrame(() => {
      pos.x = lerp(pos.x, pointer.x, 0.2);
      pos.y = lerp(pos.y, pointer.y, 0.2);
      if (ring.current) ring.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      if (dot.current) dot.current.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`;
    });
    const away = (hidden) => () => root.classList.toggle("home-cursor-away", hidden);
    const over = (event) => {
      const target = event.target instanceof Element ? event.target : null;
      root.classList.toggle("home-cursor-dark", Boolean(target?.closest(GOLD)));
    };
    const leave = away(true);
    const enter = away(false);
    document.addEventListener("pointerover", over, { passive: true });
    root.addEventListener("pointerleave", leave);
    root.addEventListener("pointerenter", enter);
    return () => {
      stop();
      root.classList.remove("has-home-cursor", "home-cursor-away", "home-cursor-dark");
      document.removeEventListener("pointerover", over);
      root.removeEventListener("pointerleave", leave);
      root.removeEventListener("pointerenter", enter);
    };
  }, []);

  return (
    <>
      <div ref={ring} className="home-cursor" aria-hidden="true" />
      <div ref={dot} className="home-cursor-dot" aria-hidden="true" />
    </>
  );
}
