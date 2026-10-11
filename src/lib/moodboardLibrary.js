// The user's personal moodboard library — materials made from their own photos and saved
// colours — shared by every board. Kept in this browser (lib/userData.js) and, with an account,
// in the `moodboard_library` table.
import { uid } from "./moodboard.js";
import { createStore, useStore } from "./userData.js";

const EMPTY = { materials: [], colors: [] };

const normalize = (value) => ({
  materials: Array.isArray(value?.materials) ? value.materials.filter((m) => m && typeof m.id === "string") : [],
  colors: Array.isArray(value?.colors) ? value.colors.filter((c) => c && typeof c.id === "string") : [],
});

// Union by id: nothing made on one device is lost on the other.
export function mergeLibrary(local, remote) {
  const union = (a, b) => [...a, ...b.filter((item) => !a.some((other) => other.id === item.id))];
  return { materials: union(local.materials, remote.materials), colors: union(local.colors, remote.colors) };
}

export const libraryStore = createStore("library", {
  key: "design-archive:moodboard-library",
  empty: EMPTY,
  normalize,
  remote: {
    async pull(client, userId) {
      const { data, error } = await client.from("moodboard_library").select("content").eq("user_id", userId).maybeSingle();
      if (error) throw error;
      return normalize(data?.content);
    },
    merge: mergeLibrary,
    added: (local, remote) =>
      local.materials.filter((m) => !remote.materials.some((o) => o.id === m.id)).length +
      local.colors.filter((c) => !remote.colors.some((o) => o.id === c.id)).length,
    async push(client, userId, next) {
      const { error } = await client.from("moodboard_library").upsert({ user_id: userId, content: next, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    toImport: (value) => value,
  },
});

// Returns false when the browser refuses to store it (quota full, private mode): the change is
// then undone, so what is on screen is always what is saved.
function write(next) {
  const previous = libraryStore.get();
  libraryStore.set(next);
  if (!libraryStore.saveFailed()) return true;
  libraryStore.replace(previous);
  return false;
}

export function useLibrary() {
  return useStore(libraryStore);
}

export function addCustomMaterial({ name, family, tags, src }) {
  const material = { id: `custom-${uid()}`, name, family, tags, src, custom: true };
  const state = libraryStore.get();
  return write({ ...state, materials: [material, ...state.materials] }) ? material : null;
}

export function removeCustomMaterial(id) {
  const state = libraryStore.get();
  write({ ...state, materials: state.materials.filter((m) => m.id !== id) });
}

export function addCustomColor({ name, hex }) {
  const color = { id: `custom-${uid()}`, name, hex, custom: true };
  const state = libraryStore.get();
  return write({ ...state, colors: [color, ...state.colors] }) ? color : null;
}

export function removeCustomColor(id) {
  const state = libraryStore.get();
  write({ ...state, colors: state.colors.filter((c) => c.id !== id) });
}

// Reads a user photo and returns a compact JPEG data URL: centre-cropped to a square for
// material textures, or scaled to fit `maxSize` for free images.
export function readImageFile(file, { maxSize = 1000, square = false } = {}) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      reject(new Error("not an image"));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const side = Math.min(w, h);
      const src = square ? { x: (w - side) / 2, y: (h - side) / 2, w: side, h: side } : { x: 0, y: 0, w, h };
      const scale = Math.min(1, maxSize / Math.max(src.w, src.h));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(src.w * scale);
      canvas.height = Math.round(src.h * scale);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, src.x, src.y, src.w, src.h, 0, 0, canvas.width, canvas.height);
      resolve({ src: canvas.toDataURL("image/jpeg", 0.84), width: canvas.width, height: canvas.height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable image"));
    };
    img.src = url;
  });
}
