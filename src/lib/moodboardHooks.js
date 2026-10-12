import { useEffect, useReducer, useState } from "react";
import { FONT_FACES } from "./moodboard.js";

/* ---------- images ---------- */

// Shared cache so duplicated tiles/stickers reuse one HTMLImageElement.
const imageCache = new Map();

// A photo drawn without CORS permission makes the whole board impossible to export. Hosts that send
// no CORS headers are asked through an image proxy that adds them (images.weserv.nl: it only sees
// the photo's public address). Only if that fails too is the photo shown as it is — on screen
// only: it is marked, and the export leaves it out (MoodboardCanvas exportImage).
const proxied = (src) => `https://images.weserv.nl/?url=${encodeURIComponent(src)}&w=2400&we`;

function attemptsFor(src) {
  const local = src.startsWith("data:") || src.startsWith("blob:") || src.startsWith("/");
  return local
    ? [{ url: src, cors: true }]
    : [
        { url: src, cors: true },
        { url: proxied(src), cors: true },
        { url: src, cors: false },
      ];
}

function loadImage(src) {
  let entry = imageCache.get(src);
  if (entry) return entry;
  entry = { status: "loading", image: null, tainted: false };
  entry.promise = new Promise((resolve) => {
    const attempts = attemptsFor(src);
    const attempt = (i) => {
      const { url, cors } = attempts[i];
      const img = new window.Image();
      if (cors) img.crossOrigin = "anonymous";
      else img.dataset.tainted = "1";
      img.onload = () => {
        Object.assign(entry, { status: "loaded", image: img, tainted: !cors });
        resolve(entry);
      };
      img.onerror = () => {
        if (i + 1 < attempts.length) return attempt(i + 1);
        entry.status = "failed";
        resolve(entry);
      };
      img.src = url;
    };
    attempt(0);
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
