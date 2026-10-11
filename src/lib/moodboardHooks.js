import { useEffect, useReducer, useState } from "react";
import { FONT_FACES } from "./moodboard.js";

/* ---------- images ---------- */

// Shared cache so duplicated tiles/stickers reuse one HTMLImageElement.
const imageCache = new Map();

function loadImage(src) {
  let entry = imageCache.get(src);
  if (entry) return entry;
  entry = { status: "loading", image: null, tainted: false };
  entry.promise = new Promise((resolve) => {
    const attempt = (cors) => {
      const img = new window.Image();
      // Anonymous CORS keeps the canvas exportable; if a host refuses it we still show
      // the picture (export will then report the tainted canvas).
      if (cors) img.crossOrigin = "anonymous";
      img.onload = () => {
        Object.assign(entry, { status: "loaded", image: img, tainted: !cors });
        resolve(entry);
      };
      img.onerror = () => {
        if (cors && !src.startsWith("data:")) return attempt(false);
        entry.status = "failed";
        resolve(entry);
      };
      img.src = src;
    };
    attempt(true);
  });
  imageCache.set(src, entry);
  return entry;
}

export function useKonvaImage(src) {
  const [, rerender] = useReducer((n) => n + 1, 0);
  const entry = src ? loadImage(src) : null;

  useEffect(() => {
    if (!entry || entry.status !== "loading") return undefined;
    let alive = true;
    entry.promise.then(() => alive && rerender());
    return () => {
      alive = false;
    };
  }, [entry]);

  return entry?.status === "loaded" ? entry.image : null;
}

/* ---------- fonts ---------- */

let fontsPromise = null;

function loadBoardFonts() {
  if (!fontsPromise) {
    const faces = Promise.all(FONT_FACES.map((face) => document.fonts?.load(face).catch(() => null)));
    // Never block the board for long if the font CDN is slow or offline.
    fontsPromise = Promise.race([faces, new Promise((resolve) => setTimeout(resolve, 2500))]);
  }
  return fontsPromise;
}

// Konva measures text once when a node is created, so text elements are rendered only
// after the web fonts are available.
export function useBoardFontsReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    loadBoardFonts().then(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);
  return ready;
}

/* ---------- input ---------- */

export function useCoarsePointer() {
  const [coarse, setCoarse] = useState(() => window.matchMedia?.("(pointer: coarse)").matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.("(pointer: coarse)");
    if (!mq) return undefined;
    const onChange = () => setCoarse(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return coarse;
}
