// How a new board starts: from a template (real archive pieces, a palette, two materials and a
// title, laid out for the chosen format), from the collection (the pieces you own and look for),
// or blank. Returns the content for createBoard (lib/moodboards.js).
import { OBJECTS } from "../data/objects.js";
import { MATERIALS_BY_ID } from "../data/materials.js";
import { boardSize, createColor, createMaterial, createPhoto, createText, uid } from "./moodboard.js";
import { PALETTES, TEMPLATES, templatePieces } from "./moodboardPresets.js";

const COLLECTION_LIMIT = 12;

// Pieces spread in rows across the sheet below the title, a little askew like prints on a table.
function layPieces(objects, size, top, bottom) {
  const perRow = size.w > size.h ? Math.min(objects.length, 5) : Math.min(objects.length, 3);
  const rows = Math.ceil(objects.length / perRow);
  const gap = 34;
  const rowH = (bottom - top) / rows;
  // A piece's card is about 1.75 times as tall as it is wide (photo 4:5 and its label).
  const width = Math.floor(Math.min((size.w - 120 - gap * (perRow - 1)) / perRow, (rowH - gap) / 1.75, 230));
  const tilts = [-2, 1.5, -1, 2, -1.5, 1];
  return objects.map((object, i) => {
    const row = Math.floor(i / perRow);
    const inRow = Math.min(perRow, objects.length - row * perRow);
    const left = (size.w - (inRow * width + (inRow - 1) * gap)) / 2;
    return {
      id: uid(),
      type: "photo",
      objectId: object.id,
      x: left + (i % perRow) * (width + gap),
      // centred in its row: a card is about 1.6 times as tall as it is wide
      y: top + row * rowH + Math.max(0, (rowH - width * 1.6) / 2),
      width,
      rotation: tilts[i % tilts.length],
      showLabel: true,
    };
  });
}

// `title` is the board's headline, already in the visitor's language; `paletteName` names the chips.
export function templateContent(templateId, format, { title, paletteName, ink }) {
  const template = TEMPLATES.find((tpl) => tpl.id === templateId);
  const size = boardSize(format);
  const pieces = templatePieces(template, OBJECTS);
  const elements = [
    createText({ cx: 60 + Math.min(620, size.w * 0.6) / 2, cy: 80, text: title, font: "serif", fontSize: 52, width: Math.min(620, size.w * 0.6), align: "left", fill: ink }),
  ];
  const footer = size.h - 200;
  elements.push(...layPieces(pieces, size, 150, footer - 20));
  const palette = PALETTES.find((p) => p.id === template.palette);
  palette.colors.forEach((hex, i) => {
    const chip = createColor({ hex, name: paletteName }, { cx: 0, cy: 0 });
    elements.push({ ...chip, width: 96, height: 84, x: 60 + i * 108, y: footer + 30 });
  });
  template.materials.forEach((id, i) => {
    const material = MATERIALS_BY_ID[id];
    if (!material) return;
    const sample = createMaterial(material, { cx: 0, cy: 0 }, material.meta);
    // Beside the palette when the sheet is wide enough, otherwise above the title block's row.
    const x = size.w > 1100 ? 640 + i * 150 : size.w - 300 - i * 140;
    const y = size.w > 1100 ? footer + 20 : footer - 120;
    elements.push({ ...sample, width: 120, height: 120, x, y });
  });
  return { format, background: "paper", elements };
}

// The pieces of the collection marked "I own it" and "Looking for", newest first.
export function collectionContent(items, format) {
  const size = boardSize(format);
  const byId = new Map(OBJECTS.map((o) => [o.id, o]));
  const pieces = items
    .filter((item) => item.status === "own" || item.status === "want")
    .map((item) => byId.get(item.id))
    .filter(Boolean)
    .slice(0, COLLECTION_LIMIT);
  const elements = pieces.map((object, n) =>
    createPhoto(object.id, n, { x: 0, y: 0, rotation: [-2, 1.5, -1, 2][n % 4] }, size)
  );
  return { format, background: "paper", elements };
}

export const collectionStartCount = (items) => items.filter((item) => item.status === "own" || item.status === "want").length;
