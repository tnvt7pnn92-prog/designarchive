// Ready-made text and arrow styles offered in the moodboard's Elements panel.

export const TEXT_PRESETS = [
  { id: "headline", style: { font: "serif", fontSize: 56, width: 560, align: "left" } },
  { id: "title", style: { font: "sans", fontSize: 18, width: 340, align: "left", bold: true } },
  { id: "body", style: { font: "sans", fontSize: 17, width: 320, align: "left" } },
  { id: "note", style: { font: "hand", fontSize: 36, width: 280, align: "center" } },
  { id: "label", style: { font: "mono", fontSize: 13, width: 240, align: "left" } },
];

export const ARROW_PRESETS = [
  { id: "curved", style: { bend: -50, dash: "solid", headEnd: "triangle" } },
  { id: "straight", style: { bend: 0, dash: "solid", headEnd: "triangle" } },
  { id: "dashed", style: { bend: -40, dash: "dashed", headEnd: "open" } },
  { id: "line", style: { bend: 0, dash: "solid", headEnd: "none" } },
];

// Ready-made palettes for the Colours drawer: five chips each, added in a row.
export const PALETTES = [
  { id: "midcentury", colors: ["#8B5A2B", "#D4A017", "#6B7B3A", "#C8642D", "#F2E8D5"] },
  { id: "memphis", colors: ["#F49AC2", "#FFD23F", "#3BCEAC", "#EE4266", "#111111"] },
  { id: "scandinavian", colors: ["#F7F5F0", "#E8DCC8", "#D9DDD9", "#A3B18A", "#5F6B73"] },
  { id: "bauhaus", colors: ["#D02F2F", "#1F4E9C", "#F2C230", "#1A1A1A", "#EFEBE3"] },
  { id: "seventies", colors: ["#6B3E26", "#B5562B", "#D99A2B", "#8A8F3C", "#E4D3B4"] },
  { id: "spaceage", colors: ["#F4F4F2", "#F26B1D", "#B8BCC0", "#C8102E", "#151515"] },
];

// Starting boards for "From a template": real archive pieces chosen by a rule (a decade, a
// style, a country), one per kind of object in the order given, with a palette and two material
// samples. The rule picks from the archive at the moment the board is made.
export const TEMPLATES = [
  {
    id: "seventies",
    pick: (o) => o.year >= 1965 && o.year <= 1979,
    categories: ["sofas", "lamps", "chairs", "tables", "decor"],
    palette: "seventies",
    materials: ["burl", "velvet"],
  },
  {
    id: "memphis",
    pick: (o) => o.year >= 1980 && o.year <= 1989 && o.styles?.includes("postmodern"),
    categories: ["chairs", "lamps", "decor", "tables", "sofas"],
    palette: "memphis",
    materials: ["terrazzo", "lacquer"],
  },
  {
    id: "nordic",
    pick: (o) => o.styles?.includes("scandinavian"),
    categories: ["chairs", "lamps", "tables", "decor", "sofas"],
    palette: "scandinavian",
    materials: ["oak", "linen"],
  },
  {
    id: "bauhaus",
    pick: (o) => o.styles?.includes("bauhaus"),
    categories: ["chairs", "lamps", "tables", "decor", "sofas"],
    palette: "bauhaus",
    materials: ["chrome", "leather"],
  },
  {
    id: "radical",
    pick: (o) => o.styles?.includes("radical") && o.country === "Italy",
    categories: ["sofas", "lamps", "chairs", "decor", "tables"],
    palette: "spaceage",
    materials: ["terrazzo", "brushed-steel"],
  },
  {
    id: "midcentury",
    pick: (o) => o.styles?.includes("midcentury") && o.country === "United States",
    categories: ["chairs", "lamps", "tables", "sofas", "decor"],
    palette: "midcentury",
    materials: ["walnut", "boucle"],
  },
];

// The pieces a template puts on its board: one per category, photos only, the archive's order.
export function templatePieces(template, objects) {
  const used = new Set();
  return template.categories
    .map((category) => {
      const piece = objects.find((o) => o.image && o.category === category && !used.has(o.id) && template.pick(o));
      if (piece) used.add(piece.id);
      return piece;
    })
    .filter(Boolean);
}

// Default fill for new shapes on each board ground.
export const SHAPE_FILLS = { paper: "#D8C3A5", ink: "#2A2824" };

// "Italian, Marble · Red" → ["Italian", "Marble", "Red"]
export function splitTags(value) {
  const tags = String(value ?? "")
    .split(/[,，·]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s[0].toUpperCase() + s.slice(1));
  return [...new Set(tags)];
}
