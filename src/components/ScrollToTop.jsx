import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

// Where each history entry was scrolled to, so Back returns to the same spot.
const positions = new Map();

// The browser's own restoration would race ours on every Back press.
if (typeof window !== "undefined" && "scrollRestoration" in window.history) window.history.scrollRestoration = "manual";

// Scroll behaviour across the whole site:
//   - following a link to another page starts at its top;
//   - Back/Forward returns to where you were on that page — in the archive that means the same
//     card, since the number of loaded blocks is in the URL too;
//   - changes that only rewrite the URL in place (filters, "load more") leave the scroll alone.
export default function ScrollToTop() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const keyRef = useRef(location.key);
  const pathRef = useRef(location.pathname);
  // While a new page is being put in place the old one is torn down and the scroll clamps to 0;
  // that clamp must not overwrite the position we want to come back to.
  const settling = useRef(false);

  const urlRef = useRef(location.pathname + location.search);

  useEffect(() => {
    const onScroll = () => {
      if (settling.current) return;
      // Right after a link is followed the address bar already shows the new page while the old
      // entry is still current here: a scroll event in that gap is the old page being clamped
      // as it unmounts, not the visitor scrolling, so it is not recorded.
      if (window.location.pathname + window.location.search !== urlRef.current) return;
      positions.set(keyRef.current, window.scrollY);
    };
    // Also take a reading at the moment of leaving — a link click (capture phase, before the
    // router acts) or a Back/Forward press — in case no scroll event arrived since the last move.
    const onLeave = () => {
      if (!settling.current) positions.set(keyRef.current, window.scrollY);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("click", onLeave, true);
    window.addEventListener("popstate", onLeave);
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onLeave, true);
      window.removeEventListener("popstate", onLeave);
    };
  }, []);

  useEffect(() => {
    const samePage = pathRef.current === location.pathname;
    keyRef.current = location.key;
    pathRef.current = location.pathname;
    urlRef.current = location.pathname + location.search;

    if (navigationType === "PUSH" && !samePage) {
      window.scrollTo(0, 0);
      return undefined;
    }
    if (navigationType !== "POP") return undefined;

    const target = positions.get(location.key);
    if (target === undefined) {
      if (!samePage) window.scrollTo(0, 0);
      return undefined;
    }

    // Pages load lazily and their images reserve space as they render: keep trying for up to
    // 1.5 s until the page is tall enough to scroll back to the saved spot. Plain timers, not
    // animation frames, so it also works in a background tab.
    settling.current = true;
    let tries = 0;
    let timer = 0;
    const attempt = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max >= target || tries >= 30) {
        window.scrollTo(0, Math.min(target, Math.max(max, 0)));
        positions.set(location.key, window.scrollY);
        settling.current = false;
        return;
      }
      tries += 1;
      timer = window.setTimeout(attempt, 50);
    };
    attempt();
    return () => {
      window.clearTimeout(timer);
      settling.current = false;
    };
  }, [location.key, location.pathname, navigationType]);

  return null;
}
