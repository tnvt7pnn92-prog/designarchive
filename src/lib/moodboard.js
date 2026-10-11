// Board model shared by the moodboard context and the Konva canvas.
// Every element lives in one ordered array (array order = z-order) and is stored in
// "board coordinates": a fixed sheet that the canvas scales to fit the screen, so a board looks
// the same on desktop, on mobile and in the exported PNG. The sheet's size is the board's
// `format`: boards made before formats existed keep the 1400×860 sheet they were drawn on.

export const BOARD_W = 1400;
export const BOARD_H = 860;

export const FORMATS = {
  wide: { w: 1400, h: 860 },
  a3: { w: 1400, h: 990 },
  a4: { w: 990, h: 1400 },
  square: { w: 1200, h: 1200 },
};
// What a new board is drawn on; "wide" is only for boards made before formats existed.
export const NEW_FORMATS = ["a3", "a4", "square"];
export const DEFAULT_FORMAT = "a3";
export const boardSize = (format) => FORMATS[format] ?? FORMATS.wide;

export const BOARD_KEY = "design-archive:moodboard-board";
export const LEGACY_ITEMS_KEY = "design-archive:moodboard";
export const LEGACY_ANNOTATIONS_KEY = "design-archive:moodboard-annotations";

export const FONTS = {
  serif: { family: 'Fraunces, "Iowan Old Style", Georgia, serif', letterSpacing: -0.01 },
  sans: { family: 'Inter, -apple-system, "Segoe UI", sans-serif', letterSpacing: 0.02 },
  hand: { family: "Caveat, Fraunces, serif", letterSpacing: 0 },
  mono: { family: '"Space Mono", ui-monospace, monospace', letterSpacing: -0.02 },
};
export const FONT_KEYS = Object.keys(FONTS);

// Faces the canvas needs before it can measure text correctly (Konva draws with ctx.font).
export const FONT_FACES = [
  "400 16px Fraunces",
  "700 16px Fraunces",
  "italic 400 16px Fraunces",
  "400 16px Inter",
  "700 16px Inter",
  "400 16px Caveat",
  "700 16px Caveat",
  '400 16px "Space Mono"',
  '700 16px "Space Mono"',
];

// Site palette first (cream, gold, teal, ink), then soft scrapbook tones.
export const SWATCHES = ["#f4efe6", "#c9a44d", "#6f9c95", "#16150f", "#e8b4b8", "#a8b5a2", "#c3b1e1", "#c8775a"];

export const ARROW_HEADS = ["triangle", "open", "circle", "bar", "none"];
export const ARROW_DASHES = ["solid", "dashed", "dotted"];

export const TEXT_LINE_HEIGHT = 1.15;
export const TEXT_PADDING = 4;
export const PHOTO_BASE_WIDTH = 160;

// Board grounds: the sheet colour plus the tones elements use on it (text ink, captions,
// photo cards, shadows). "paper" is the editorial default for new boards.
export const BACKGROUNDS = {
  paper: {
    fill: "#f3efe7",
    dot: "#dcd5c7",
    ink: "#1c1a17",
    muted: "#6f685c",
    card: "#fbf9f5",
    cardStroke: "#e0d9cc",
    shadow: 0.16,
    accent: "#a8842f",
  },
  ink: {
    fill: "#0e0e0e",
    dot: "#2a2824",
    ink: "#f4efe6",
    muted: "#b8b0a2",
    card: "#161513",
    cardStroke: "#2c2a26",
    shadow: 0.45,
    accent: "#c9a44d",
  },
};
export const BACKGROUND_KEYS = Object.keys(BACKGROUNDS);

export const SHAPE_KINDS = ["rect", "circle", "arch"];

const LEGACY_COLORS ={ cream: "#f4efe6", gold: "#c9a44d", teal: "#6f9c95", ink: "#16150f" };

export function uid() {
  return globalThis.crypto?.randomUUID?.() ?? `el-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/* ---------- geometry ---------- */

export function rotatePoint(x, y, deg) {
  const r = (deg * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return { x: x * cos - y * sin, y: x * sin + y * cos };
}

// Konva rotates around the node origin (top-left). Returns the origin that places a
// w×h box, rotated by `rotation`, with its centre at (cx, cy).
export function originForCenter(cx, cy, w, h, rotation) {
  const off = rotatePoint(-w / 2, -h / 2, rotation);
  return { x: cx + off.x, y: cy + off.y };
}

export function fontStyle(el) {
  if (el.bold && el.italic) return "italic bold";
  if (el.bold) return "bold";
  if (el.italic) return "italic";
  return "normal";
}

// Photo tiles mimic the old polaroid card: 10px padding, 4:5 picture, caption below.
export function photoLayout(width) {
  const k = width / PHOTO_BASE_WIDTH;
  const pad = 10 * k;
  const imageW = width - pad * 2;
  const imageH = imageW * 1.25;
  return { k, pad, imageW, imageH, labelY: pad + imageH + 8 * k, fontSize: 11.5 * k, bottom: 12 * k };
}

// Editorial caption under material and colour samples (NAME / meta line); it scales with
// the sample's width.
export function labelLayout(width) {
  const k = clamp(width / 170, 0.6, 2.4);
  const nameSize = 11 * k;
  const metaSize = 9 * k;
  const gap = 10 * k;
  const metaY = gap + nameSize * 1.25 + 3 * k;
  return { k, gap, nameSize, metaSize, metaY, height: metaY + metaSize * 1.35 };
}

// object-fit: cover for a Konva image drawn into a w×h box.
export function coverCrop(image, w, h) {
  const target = w / h;
  const ratio = image.naturalWidth / image.naturalHeight;
  if (ratio > target) {
    const cw = image.naturalHeight * target;
    return { x: (image.naturalWidth - cw) / 2, y: 0, width: cw, height: image.naturalHeight };
  }
  const ch = image.naturalWidth / target;
  return { x: 0, y: (image.naturalHeight - ch) / 2, width: image.naturalWidth, height: ch };
}

// Arrow points are local to the element origin: [x1, y1, x2, y2]. `bend` is the signed
// perpendicular distance of the curve's midpoint from the chord (0 = straight).
export function arrowGeometry(el) {
  const [x1, y1, x2, y2] = el.points;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const bend = el.bend || 0;
  const headLen = 6 + el.strokeWidth * 3;
  const pad = headLen / 2 + el.strokeWidth;
  const m = { x: midX + nx * bend, y: midY + ny * bend };
  const minX = Math.min(x1, x2, m.x) - pad;
  const minY = Math.min(y1, y2, m.y) - pad;
  return {
    p1: { x: x1, y: y1 },
    p2: { x: x2, y: y2 },
    m,
    c: { x: midX + nx * bend * 2, y: midY + ny * bend * 2 },
    normal: { x: nx, y: ny },
    chordMid: { x: midX, y: midY },
    len,
    headLen,
    bbox: { x: minX, y: minY, width: Math.max(x1, x2, m.x) + pad - minX, height: Math.max(y1, y2, m.y) + pad - minY },
  };
}

/* ---------- factories ---------- */

// `style` overrides the defaults (text presets: font, size, width, weight…).
export function createText({ cx, cy, text, ...style }) {
  const el = {
    id: uid(),
    type: "text",
    rotation: 0,
    text,
    width: 260,
    fontSize: 36,
    font: "hand",
    fill: "#f4efe6",
    align: "center",
    bold: false,
    italic: false,
    ...style,
  };
  return { ...el, x: cx - el.width / 2, y: cy - el.fontSize * 0.67 };
}

export function createArrow({ cx, cy, ...style }) {
  return {
    id: uid(),
    type: "arrow",
    x: cx,
    y: cy,
    rotation: 0,
    points: [-100, 20, 100, 20],
    bend: -50,
    stroke: "#c9a44d",
    strokeWidth: 3,
    dash: "solid",
    headEnd: "triangle",
    headStart: "none",
    ...style,
  };
}

// A material sample: texture square with its NAME / "Stone · Italy" caption. The name, meta
// line and tags are copied onto the element so they can be edited per board.
export function createMaterial(material, { cx, cy }, meta) {
  const size = 170;
  return {
    id: uid(),
    type: "material",
    materialId: material.id,
    name: material.name,
    meta,
    tags: [...(material.tags ?? [])],
    x: cx - size / 2,
    y: cy - size / 2 - 20,
    width: size,
    height: size,
    rotation: 0,
    showLabel: true,
  };
}

// Pantone-style chip: `width` is the white card, `height` the colour block above the caption.
export function createColor(color, { cx, cy }) {
  const width = 140;
  const height = 128;
  return {
    id: uid(),
    type: "color",
    hex: color.hex,
    name: color.name,
    x: cx - width / 2,
    y: cy - height / 2 - 20,
    width,
    height,
    rotation: 0,
    showLabel: true,
  };
}

export function createShape(kind, { cx, cy }, fill) {
  const width = kind === "arch" ? 150 : 180;
  const height = kind === "rect" ? 120 : kind === "arch" ? 210 : 180;
  return { id: uid(), type: "shape", kind, x: cx - width / 2, y: cy - height / 2, width, height, rotation: 0, fill, outline: false };
}

// A photo the user uploaded (already downscaled to a data URL).
export function createImage({ src, width, height }, { cx, cy }) {
  const scale = Math.min(1, 320 / Math.max(width, height));
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  return { id: uid(), type: "image", src, x: cx - w / 2, y: cy - h / 2, width: w, height: h, rotation: 0 };
}

export function createSticker(sticker, { cx, cy }, rotation = 0) {
  return {
    id: uid(),
    type: "sticker",
    stickerId: sticker.id,
    x: cx - sticker.width / 2,
    y: cy - sticker.height / 2,
    width: sticker.width,
    height: sticker.height,
    rotation,
  };
}

// Places the n-th archive piece on a loose 7×3 grid, cascading once the grid is full.
export function createPhoto(objectId, n, jitter = { x: 0, y: 0, rotation: 0 }, size = FORMATS.wide) {
  const across = Math.max(1, Math.floor((size.w - 60) / 190));
  const down = Math.max(1, Math.floor((size.h - 60) / 290));
  const cascade = Math.floor(n / (across * down)) * 28;
  return {
    id: uid(),
    type: "photo",
    objectId,
    x: clamp(50 + (n % across) * 190 + cascade + jitter.x, 0, size.w - PHOTO_BASE_WIDTH),
    y: clamp(50 + (Math.floor(n / across) % down) * 290 + cascade + jitter.y, 0, size.h - 260),
    width: PHOTO_BASE_WIDTH,
    rotation: jitter.rotation,
    showLabel: true,
  };
}

/* ---------- persistence & legacy migration ---------- */

const TYPES = new Set(["photo", "text", "arrow", "sticker", "material", "color", "shape", "image"]);
const REQUIRED_KEY = { material: "materialId", color: "hex", shape: "kind", image: "src" };

function isValid(el) {
  return (
    el &&
    TYPES.has(el.type) &&
    typeof el.id === "string" &&
    Number.isFinite(el.x) &&
    Number.isFinite(el.y) &&
    (!REQUIRED_KEY[el.type] || typeof el[REQUIRED_KEY[el.type]] === "string")
  );
}

function migrateLegacyItem(item) {
  // Old tiles were 160px DOM cards (≈225px tall) rotated around their centre.
  const w = PHOTO_BASE_WIDTH;
  const h = 225;
  const rotation = item.rotation || 0;
  const origin = originForCenter(item.x + w / 2, item.y + h / 2, w, h, rotation);
  return { id: uid(), type: "photo", objectId: item.id, ...origin, width: w, rotation };
}

function migrateLegacyAnnotation(a) {
  const scale = a.scale || 1;
  const fill = LEGACY_COLORS[a.color] ?? "#f4efe6";
  if (a.kind === "text") {
    return {
      id: uid(),
      type: "text",
      x: a.x,
      y: a.y,
      rotation: a.rotation || 0,
      text: a.text || "",
      width: 320 * scale,
      fontSize: (a.size || 28) * scale,
      font: FONTS[a.font] ? a.font : "hand",
      fill,
      align: "left",
      bold: false,
      italic: false,
    };
  }
  // Old arrows were a 96×56 SVG scaled/rotated around its centre (48, 28): make that
  // centre the element origin so rotation and scale carry over exactly.
  const curved = a.variant === "curved";
  const from = curved ? { x: 4, y: 44 } : { x: 4, y: 30 };
  const to = { x: 92, y: 30 };
  const local = (p) => [(p.x - 48) * scale, (p.y - 28) * scale];
  const arrow = {
    id: uid(),
    type: "arrow",
    x: a.x + 48,
    y: a.y + 28,
    rotation: a.rotation || 0,
    points: [...local(from), ...local(to)],
    bend: 0,
    stroke: fill,
    strokeWidth: (a.variant === "bold" ? 5 : 2) * scale,
    dash: a.variant === "dashed" ? "dashed" : "solid",
    headEnd: "open",
    headStart: "none",
  };
  if (curved) {
    // Old cubic path peaked at (48, 13.75): express that as a perpendicular bend.
    const g = arrowGeometry(arrow);
    const [px, py] = local({ x: 48, y: 13.75 });
    arrow.bend = (px - g.chordMid.x) * g.normal.x + (py - g.chordMid.y) * g.normal.y;
  }
  return arrow;
}

function readJson(key) {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}

// Boards saved before grounds existed were drawn on the dark sheet; new boards start on paper.
const groundFor = (saved, elements) => (BACKGROUNDS[saved] ? saved : elements.length ? "ink" : "paper");

export function loadBoard() {
  try {
    const board = readJson(BOARD_KEY);
    if (board && Array.isArray(board.elements)) {
      const elements = board.elements.filter(isValid);
      return { elements, background: groundFor(board.background, elements) };
    }
    const items = readJson(LEGACY_ITEMS_KEY) ?? [];
    const annotations = readJson(LEGACY_ANNOTATIONS_KEY) ?? [];
    const elements = [...items.map(migrateLegacyItem), ...annotations.map(migrateLegacyAnnotation)].filter(isValid);
    return { elements, background: groundFor(null, elements) };
  } catch {
    return { elements: [], background: "paper" };
  }
}

// The version of the board format written by this code. 3: elements + background. 4 adds the
// sheet's format, the title block (cartouche) and the real-scale room width; a board of version 3
// reads as a "wide" sheet with an empty title block, so it opens exactly as it was drawn.
export const BOARD_VERSION = 4;

const text = (value, max) => (typeof value === "string" ? value.slice(0, max) : "");

export function cartoucheOf(value) {
  return {
    project: text(value?.project, 60),
    author: text(value?.author, 60),
    number: text(value?.number, 12),
    hidden: value?.hidden === true,
  };
}

// The room width (cm) the board was scaled to with "real proportions", or null.
const roomWidthOf = (value) => (Number.isFinite(value) && value >= 50 && value <= 5000 ? Math.round(value) : null);

// A board's content made safe to draw: unknown elements dropped, a known ground and format.
export function boardContent(content) {
  const elements = Array.isArray(content?.elements) ? content.elements.filter(isValid) : [];
  return {
    version: BOARD_VERSION,
    elements,
    background: groundFor(content?.background, elements),
    format: FORMATS[content?.format] ? content.format : "wide",
    cartouche: cartoucheOf(content?.cartouche),
    roomWidth: roomWidthOf(content?.roomWidth),
  };
}

// What is stored for a board (in the account, and for a shared link).
export function boardPayload(board) {
  return {
    version: BOARD_VERSION,
    background: board.background,
    elements: board.elements,
    format: board.format,
    cartouche: board.cartouche,
    roomWidth: board.roomWidth,
  };
}

// The single board saved before there could be several (lib/moodboards.js migrates it once).
export function legacyBoardKeys() {
  return [BOARD_KEY, LEGACY_ITEMS_KEY, LEGACY_ANNOTATIONS_KEY];
}
