import { useSyncExternalStore } from "react";

// The visitor's motion settings, read live: "reduce motion" can be switched on while the page is
// open, and a mouse can be plugged into a tablet.
function mediaStore(query) {
  const list = () => (typeof window === "undefined" ? null : window.matchMedia(query));
  return {
    subscribe(callback) {
      const media = list();
      media?.addEventListener("change", callback);
      return () => media?.removeEventListener("change", callback);
    },
    get: () => list()?.matches ?? false,
  };
}

const reduced = mediaStore("(prefers-reduced-motion: reduce)");
const fine = mediaStore("(pointer: fine)");

// True when the visitor asked for less motion (and during the prerender, where nothing moves).
export function useReducedMotion() {
  return useSyncExternalStore(reduced.subscribe, reduced.get, () => true);
}

// True with a mouse or a trackpad: the home page's cursor only makes sense there.
export function useFinePointer() {
  return useSyncExternalStore(fine.subscribe, fine.get, () => false);
}
