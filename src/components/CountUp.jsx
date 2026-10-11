import { useEffect, useRef } from "react";
import { countable, formatCount as format } from "../lib/countUp.js";

const DURATION = 1100;

// A figure that counts up when it scrolls into view. The page (and the prerendered HTML) carries the
// final text; the counting only rewrites it in the browser, and not at all with reduced motion.
export default function CountUp({ text, className }) {
  const node = useRef(null);

  useEffect(() => {
    const el = node.current;
    const figure = countable(text);
    if (!el || !figure || typeof IntersectionObserver === "undefined") return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    let frame = 0;
    let settle = 0;
    el.textContent = format(figure, figure.start);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        // Whatever happens to the frames (a tab put away mid-count), the figure ends on its value.
        settle = setTimeout(() => {
          cancelAnimationFrame(frame);
          el.textContent = text;
        }, DURATION + 200);
        const from = performance.now();
        const step = (now) => {
          const t = Math.min(1, (now - from) / DURATION);
          const eased = 1 - (1 - t) ** 3;
          el.textContent = t < 1 ? format(figure, figure.start + (figure.value - figure.start) * eased) : text;
          if (t < 1) frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
      },
      { rootMargin: "0px 0px -10% 0px" }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      clearTimeout(settle);
      el.textContent = text;
    };
  }, [text]);

  return (
    <b ref={node} className={className}>
      {text}
    </b>
  );
}
