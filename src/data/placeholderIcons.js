// Line icons (48×48 grid) drawn for objects that have no verified photo. Shared by the
// HTML placeholder and the moodboard canvas tile.
export const PLACEHOLDER_ICONS = {
  chairs: ["M16 9h16v15H16z", "M12 24h24v4H12z", "M14 28v12M34 28v12"],
  sofas: ["M8 22v-4a3 3 0 0 1 3-3h26a3 3 0 0 1 3 3v4", "M8 22h32v10H8z", "M24 15v7", "M12 32v5M36 32v5"],
  lamps: ["M17 10h14l5 12H12z", "M24 22v14", "M16 38h16"],
  tables: ["M7 19h34v4H7z", "M12 23v14M36 23v14"],
  decor: ["M12 10h24v28H12z", "M12 20h24M12 29h24"],
  books: ["M9 30h30v8H9z", "M12 22h26v8H12z", "M15 14h20v8H15z"],
  audio: ["M14 8h20v32H14z", "M24 29m-6 0a6 6 0 1 0 12 0a6 6 0 1 0 -12 0", "M24 16m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"],
  rugs: ["M10 14h28v20H10z", "M15 19h18v10H15z", "M10 14v-3M16 14v-3M22 14v-3M28 14v-3M34 14v-3M10 34v3M16 34v3M22 34v3M28 34v3M34 34v3"],
  art: ["M10 10h28v28H10z", "M14 14h20v20H14z", "M14 30l7-7 5 5 3-3 5 5"],
};

export function placeholderIcon(category) {
  return PLACEHOLDER_ICONS[category] ?? PLACEHOLDER_ICONS.decor;
}
