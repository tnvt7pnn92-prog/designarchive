// Colour library for the moodboard, grouped like a paint fan deck: interior-design tones,
// each with a name and HEX (RGB is derived).

export const COLOR_GROUPS = ["neutrals", "earth", "greens", "blues", "reds", "pastels", "brights", "darks"];

const group = (name, list) => list.map(([label, hex]) => ({ id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"), name: label, hex, group: name }));

export const COLORS = [
  ...group("neutrals", [
    ["Chalk", "#F7F5F0"],
    ["Ivory", "#F2EBDD"],
    ["Linen White", "#EFE8DC"],
    ["Oat", "#E6DCC8"],
    ["Bone", "#E3DCCB"],
    ["Sand", "#D8C3A5"],
    ["Mushroom", "#C7B9A6"],
    ["Greige", "#B9AE9E"],
    ["Putty", "#A99F8D"],
    ["Stone Grey", "#A7A39B"],
    ["Pebble", "#8F8A82"],
    ["Warm Grey", "#7D766C"],
  ]),
  ...group("earth", [
    ["Butterscotch", "#D9A45B"],
    ["Ochre", "#C89B3C"],
    ["Caramel", "#B9783F"],
    ["Cognac", "#9A5B34"],
    ["Terracotta", "#B85C42"],
    ["Clay", "#A8674F"],
    ["Sienna", "#A0522D"],
    ["Rust", "#9C4A2F"],
    ["Umber", "#7A5230"],
    ["Taupe", "#8B7D6B"],
    ["Mocha", "#6B4F3F"],
    ["Walnut", "#5C4033"],
  ]),
  ...group("greens", [
    ["Pistachio", "#BCCB9B"],
    ["Celadon", "#B5C7AE"],
    ["Sage", "#A8B5A2"],
    ["Eucalyptus", "#7F9C8F"],
    ["Olive", "#737A45"],
    ["Moss", "#5E6B3A"],
    ["Fern", "#4F7942"],
    ["Jade", "#3E7C6A"],
    ["Teal", "#2E6E6C"],
    ["Bottle Green", "#2C5545"],
    ["Forest", "#2F4A3A"],
    ["Racing Green", "#1F3D2B"],
  ]),
  ...group("blues", [
    ["Ice Blue", "#D6E4EA"],
    ["Powder Blue", "#B7C9D6"],
    ["Duck Egg", "#A8C3BC"],
    ["Cornflower", "#6F8FC7"],
    ["Denim", "#4F6D8F"],
    ["Slate", "#6D7479"],
    ["Steel Blue", "#4A6A82"],
    ["Petrol", "#1F4E5A"],
    ["Cobalt", "#2F4FA2"],
    ["Klein Blue", "#002FA7"],
    ["Prussian Blue", "#1C3A55"],
    ["Navy", "#1F2A44"],
  ]),
  ...group("reds", [
    ["Blush", "#E8C4BC"],
    ["Rose Quartz", "#D9A5A0"],
    ["Dusty Rose", "#C99A94"],
    ["Coral", "#E07A5F"],
    ["Tomato", "#D2452F"],
    ["Cherry", "#9E1B32"],
    ["Burgundy", "#6E2636"],
    ["Oxblood", "#4A1C1F"],
    ["Mauve", "#A2808A"],
    ["Plum", "#6B3F58"],
    ["Aubergine", "#4B2E3F"],
    ["Wine", "#5E1A2B"],
  ]),
  ...group("pastels", [
    ["Butter", "#F3E3A1"],
    ["Vanilla", "#F4EBC8"],
    ["Peach", "#F6C9A8"],
    ["Apricot", "#F2B48A"],
    ["Candy Pink", "#F4C2C9"],
    ["Lilac", "#D3C4E3"],
    ["Lavender", "#B9ADC9"],
    ["Mint", "#BFE3D0"],
    ["Seafoam", "#A9D8C8"],
    ["Sky", "#BFD9EE"],
  ]),
  ...group("brights", [
    ["Sunflower", "#F2B705"],
    ["Mustard", "#D4A017"],
    ["Tangerine", "#F28C28"],
    ["Signal Orange", "#E8590C"],
    ["Poppy Red", "#D7263D"],
    ["Fuchsia", "#C2185B"],
    ["Hot Pink", "#E75480"],
    ["Ultraviolet", "#5F4B8B"],
    ["Electric Blue", "#1E6FD9"],
    ["Kelly Green", "#2E9E4F"],
    ["Acid Lime", "#C6D93B"],
  ]),
  ...group("darks", [
    ["Espresso", "#3B2A22"],
    ["Chocolate", "#4A3329"],
    ["Deep Olive", "#3A3D2A"],
    ["Graphite", "#3A3B3C"],
    ["Anthracite", "#2F3236"],
    ["Charcoal", "#292929"],
    ["Midnight", "#1B2230"],
    ["Oxford Blue", "#14213D"],
    ["Ink", "#111111"],
    ["Black", "#0A0A0A"],
  ]),
];

// "#abc", "abc", "#AABBCC" → "#AABBCC"; null when it isn't a colour.
export function normalizeHex(value) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(value ?? "").trim());
  if (!m) return null;
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join("") : m[1];
  return `#${h.toUpperCase()}`;
}

export function hexToRgb(hex) {
  const h = normalizeHex(hex) ?? "#000000";
  return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
}

// Relative luminance above ~0.6 reads as a pale swatch that needs an outline on paper.
export function isPale(hex) {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.6;
}
