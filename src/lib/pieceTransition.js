import { useCallback } from "react";
import { flushSync } from "react-dom";
import { useNavigate } from "react-router-dom";

// The same module the router loads lazily: asking for it here just warms the shared cache.
const loadPiecePage = () => import("../pages/Piece.jsx");

const HERO_NAME = "piece-hero";
const HERO_WAIT = 450;

// Resolves once the piece page's photo has arrived, or after a short wait: the new page is
// snapshotted when this settles, and a photo still loading would grow into an empty frame.
function heroReady() {
  return new Promise((resolve) => {
    const started = Date.now();
    const check = () => {
      const img = document.querySelector(".piece-hero__media img");
      if ((img?.complete && img.naturalWidth > 0) || Date.now() - started > HERO_WAIT) resolve();
      else setTimeout(check, 40);
    };
    check();
  });
}

function canTransition() {
  return (
    typeof document !== "undefined" &&
    typeof document.startViewTransition === "function" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// Click handler for a link to /piece/:id whose photo should grow into the piece page's photo.
// Call it from the link's onClick with the link's target and the photo element (by default the
// photo inside the link). Browsers without View Transitions, visitors who ask for less motion and
// modified clicks (new tab, etc.) get the plain link.
export function usePieceTransition() {
  const navigate = useNavigate();

  return useCallback(
    (event, href, photo) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!canTransition()) return;
      const source = photo ?? event.currentTarget.querySelector(".smart-image");
      if (!source) return;
      event.preventDefault();

      loadPiecePage()
        .catch(() => null)
        .then(() => {
          source.style.viewTransitionName = HERO_NAME;
          const transition = document.startViewTransition(async () => {
            source.style.viewTransitionName = "";
            flushSync(() => navigate(href));
            await heroReady();
          });
          transition.finished.finally(() => {
            source.style.viewTransitionName = "";
          });
        });
    },
    [navigate]
  );
}
