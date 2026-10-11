// The verified facts of a piece that are not public, and the search links every piece has.
//
// Public, from the static site: every sign of authenticity and the production (src/data/
// pieceFacts.js), and the search links on the big marketplaces (below).
// The real measurements, from the `buying_guide` table, readable by everyone — the room's real
// proportions and the moodboard's PDF sheet use them.
import { getClient } from "./backend.js";

// Local preview while developing (`npm run dev`, then ?guide=full): it reads the private file
// straight from the dev server. `import.meta.env.DEV` is false in a build, so none of this — nor
// the private data — ever reaches the published site.
export const guidePreview = () =>
  import.meta.env.DEV && typeof window !== "undefined" && new URLSearchParams(window.location.search).get("guide") === "full";

// Several places may ask for the same piece: one request serves them all. Only an answer is kept —
// a miss (signed out, no row yet) is asked again next time.
const loaded = new Map();

export function loadFullGuide(pieceId) {
  if (!loaded.has(pieceId)) {
    const request = fetchFullGuide(pieceId).then((data) => {
      if (!data) loaded.delete(pieceId);
      return data;
    });
    loaded.set(pieceId, request);
  }
  return loaded.get(pieceId);
}

async function fetchFullGuide(pieceId) {
  if (import.meta.env.DEV && guidePreview()) {
    const response = await fetch("/data-private/buying-guide.json");
    const entry = response.ok ? (await response.json())[pieceId] : null;
    return entry ? { authenticity: entry.authenticity ?? [], prices: entry.prices ?? [], dimensions: entry.dimensions ?? null } : null;
  }
  const client = await getClient();
  if (!client) return null;
  const { data, error } = await client
    .from("buying_guide")
    .select("authenticity, prices, dimensions, updated_at")
    .eq("piece_id", pieceId)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

// Search pages of the big marketplaces, filled in with the piece's name and designer. Only
// links: nothing is read from those sites.
const EBAY = { it: "https://www.ebay.it", fr: "https://www.ebay.fr", es: "https://www.ebay.es", en: "https://www.ebay.com", zh: "https://www.ebay.com" };

export function searchLinks(object, lang = "en") {
  const designer = /^unknown|anonymous/i.test(object.designer) ? "" : object.designer;
  const query = [object.name, designer].filter(Boolean).join(" ");
  const q = encodeURIComponent(query);
  return [
    { id: "1stdibs", label: "1stDibs", url: `https://www.1stdibs.com/search/?q=${q}` },
    { id: "pamono", label: "Pamono", url: `https://www.pamono.eu/catalogsearch/result/?q=${q}` },
    { id: "catawiki", label: "Catawiki", url: `https://www.catawiki.com/en/s?q=${q}` },
    { id: "ebay", label: "eBay", url: `${EBAY[lang] ?? EBAY.en}/sch/i.html?_nkw=${q}` },
  ];
}
