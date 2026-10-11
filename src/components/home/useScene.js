import { useEffect, useLayoutEffect, useRef } from "react";
import { onFrame } from "../../lib/frameLoop.js";

// Calls draw(element) on every frame while the section is near the screen; never with reduced
// motion. draw is read through a ref, so it can close over fresh values.
export function useScene(ref, draw, still) {
  const latest = useRef(draw);
  useLayoutEffect(() => {
    latest.current = draw;
  });
  useEffect(() => {
    const el = ref.current;
    if (!el || still) return undefined;
    let stop = null;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !stop) stop = onFrame(() => latest.current(el));
        else if (!entry.isIntersecting && stop) {
          latest.current(el);
          stop();
          stop = null;
        }
      },
      { rootMargin: "200px 0px" }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      stop?.();
    };
  }, [ref, still]);
}
