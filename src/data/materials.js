// Material library for the moodboard. Each texture is a free-licensed Wikimedia Commons
// photograph, cropped to a square and bundled locally (so exported boards stay
// CORS-clean); credits are listed on the Credits page.
import marble from "../assets/materials/marble.jpg";
import travertine from "../assets/materials/travertine.jpg";
import concrete from "../assets/materials/concrete.jpg";
import oak from "../assets/materials/oak.jpg";
import walnut from "../assets/materials/walnut.jpg";
import darkWood from "../assets/materials/dark-wood.jpg";
import brushedSteel from "../assets/materials/brushed-steel.jpg";
import stainlessSteel from "../assets/materials/stainless-steel.jpg";
import chrome from "../assets/materials/chrome.jpg";
import brass from "../assets/materials/brass.jpg";
import copper from "../assets/materials/copper.jpg";
import glass from "../assets/materials/glass.jpg";
import smokedGlass from "../assets/materials/smoked-glass.jpg";
import leather from "../assets/materials/leather.jpg";
import boucle from "../assets/materials/boucle.jpg";
import velvet from "../assets/materials/velvet.jpg";
import linen from "../assets/materials/linen.jpg";
import stone from "../assets/materials/stone.jpg";
import terrazzo from "../assets/materials/terrazzo.jpg";
import ceramic from "../assets/materials/ceramic.jpg";
import terracotta from "../assets/materials/terracotta.jpg";
import cork from "../assets/materials/cork.jpg";
import rattan from "../assets/materials/rattan.jpg";
import onyx from "../assets/materials/onyx.jpg";
import greenMarble from "../assets/materials/green-marble.jpg";
import granite from "../assets/materials/granite.jpg";
import slate from "../assets/materials/slate.jpg";
import plaster from "../assets/materials/plaster.jpg";
import brick from "../assets/materials/brick.jpg";
import burl from "../assets/materials/burl.jpg";
import teak from "../assets/materials/teak.jpg";
import plywood from "../assets/materials/plywood.jpg";
import bamboo from "../assets/materials/bamboo.jpg";
import lacquer from "../assets/materials/lacquer.jpg";
import parquet from "../assets/materials/parquet.jpg";
import jute from "../assets/materials/jute.jpg";
import tweed from "../assets/materials/tweed.jpg";
import shearling from "../assets/materials/shearling.jpg";
import motherOfPearl from "../assets/materials/mother-of-pearl.jpg";

export const MATERIAL_FAMILIES = ["stone", "wood", "metal", "glass", "textile", "ceramic", "natural"];

const credit = (file, author, license) => ({ file, author, license });

export const MATERIALS = [
  // stone & mineral
  { id: "marble", name: "Marble", family: "stone", meta: "Stone · Carrara, Italy", tags: ["Stone", "Natural", "Luxury", "Italian", "Cool"], src: marble, credit: credit("Statuarietto White Marble (Apuan Marble Formation, Tertiary metamorphism of Jurassic limestones; Carrara region, Italy) 2 (41756462202).jpg", "James St. John", "CC BY 2.0") },
  { id: "green-marble", name: "Green Marble", family: "stone", meta: "Stone · Connemara, Ireland", tags: ["Stone", "Green", "Luxury", "Classic"], src: greenMarble, credit: credit("Irish Green Marble (Connemara Marble Formation, Neoproterozoic; Ordovician metamorphism; Galway, Ireland) 3 (33858247592).jpg", "James St. John", "CC BY 2.0") },
  { id: "onyx", name: "Onyx", family: "stone", meta: "Stone · Banded onyx", tags: ["Stone", "Luxury", "Veined", "Cool"], src: onyx, credit: credit("Onyx008 8K-PNG Color.png", "ambientCG / Lennart Demes", "CC0") },
  { id: "travertine", name: "Travertine", family: "stone", meta: "Stone · Porous limestone", tags: ["Stone", "Natural", "Warm", "Italian"], src: travertine, credit: credit("Travertine microgours (Crystal Onyx Cave, near Cave City, Kentucky, USA) 9 (23851777341).jpg", "James St. John", "CC BY 2.0") },
  { id: "granite", name: "Granite", family: "stone", meta: "Stone · Cut & polished", tags: ["Stone", "Speckled", "Kitchen", "Cool"], src: granite, credit: credit("Granite (cut & polished surface).jpg", "James St. John", "CC BY 2.0") },
  { id: "slate", name: "Slate", family: "stone", meta: "Stone · Grey paving slabs", tags: ["Stone", "Grey", "Matte", "Minimal"], src: slate, credit: credit("Grey slate speckled flecked tiled rectangle floor paving texture.jpg", "Sisters.seamless", "CC0") },
  { id: "stone", name: "Stone", family: "stone", meta: "Stone · Sawn limestone", tags: ["Stone", "Natural", "Warm", "Mediterranean"], src: stone, credit: credit("Sawn limestone texture.jpg", "Titus Tscharntke", "Public domain") },
  { id: "terrazzo", name: "Terrazzo", family: "stone", meta: "Composite · Venetian chips", tags: ["Stone", "Italian", "Graphic", "Terrazzo"], src: terrazzo, credit: credit("Terrazzo-normal.jpg", "Roll-Stone", "Public domain") },
  { id: "concrete", name: "Concrete", family: "stone", meta: "Mineral · Raw cast", tags: ["Industrial", "Raw", "Grey", "Brutalist"], src: concrete, credit: credit("Concrete texture.jpg", "Daniel Schwen", "CC BY-SA 4.0") },
  { id: "plaster", name: "Tadelakt", family: "stone", meta: "Mineral · Polished lime plaster", tags: ["Plaster", "Warm", "Moroccan", "Soft"], src: plaster, credit: credit("Echantillon Tadelakt-Stéphane Baron.jpg", "Stéphane Baron", "Public domain") },
  // wood
  { id: "oak", name: "Oak", family: "wood", meta: "Wood · European hardwood", tags: ["Wood", "Natural", "Light", "Scandinavian"], src: oak, credit: credit("Oak Texture - 5106733699 c1d5b0df29 b.jpg", "William Warby", "CC BY 2.0") },
  { id: "walnut", name: "Walnut", family: "wood", meta: "Wood · Rich brown grain", tags: ["Wood", "Natural", "Warm", "Mid-century"], src: walnut, credit: credit("Texture de noyer.jpg", "Cyril5555", "CC BY-SA 3.0") },
  { id: "teak", name: "Teak", family: "wood", meta: "Wood · Veneer", tags: ["Wood", "Warm", "Mid-century", "Danish"], src: teak, credit: credit("Teak veneer diff 8k (JPG).jpg", "Poly Haven (Rico Cilliers, Charlotte Baglioni, Dimitrios Savva, Jenelle van Heerden)", "CC0") },
  { id: "burl", name: "Burl Wood", family: "wood", meta: "Wood · Maple burl", tags: ["Wood", "Figured", "Seventies", "Luxury"], src: burl, credit: credit("Ahorn-Maser Holz.JPG", "Philipp Zinger", "CC BY-SA 3.0") },
  { id: "plywood", name: "Plywood", family: "wood", meta: "Wood · Softwood ply", tags: ["Wood", "Raw", "Workshop", "Light"], src: plywood, credit: credit("Plywood texture.JPG", "Riverswim16", "CC0") },
  { id: "parquet", name: "Versailles Parquet", family: "wood", meta: "Wood · Panelled oak floor", tags: ["Wood", "Classic", "Parisian", "Floor"], src: parquet, credit: credit("Parquet flooring in Musée des arts décoratifs de Strasbourg.jpg", "Amada44", "CC BY 3.0") },
  { id: "dark-wood", name: "Dark Wood", family: "wood", meta: "Wood · Aged dark boards", tags: ["Wood", "Dark", "Moody", "Rustic"], src: darkWood, credit: credit("Old wooden dark board (54901780396).jpg", "AS Photography", "CC BY 4.0") },
  { id: "lacquer", name: "Red Lacquer", family: "wood", meta: "Lacquer · Engraved, gilded", tags: ["Lacquer", "Red", "Glossy", "Oriental"], src: lacquer, credit: credit("Red lacquer tray with gold engraving, Song Dynasty.jpg", "PericlesofAthens", "CC BY-SA 4.0") },
  // metal
  { id: "brushed-steel", name: "Brushed Steel", family: "metal", meta: "Metal · Satin, worn finish", tags: ["Metal", "Industrial", "Cool"], src: brushedSteel, credit: credit("Dark grey stainless steel heavily scratched worn seamless metal surface texture.jpg", "Sisters.seamless", "CC0") },
  { id: "stainless-steel", name: "Stainless Steel", family: "metal", meta: "Metal · Polished, perforated", tags: ["Metal", "Industrial", "Kitchen"], src: stainlessSteel, credit: credit("Chequerplate cut slots in stainless steel.jpg", "Leon Brooks", "Public domain") },
  { id: "chrome", name: "Chrome", family: "metal", meta: "Metal · Chromed tread plate", tags: ["Metal", "Reflective", "Industrial", "Cool"], src: chrome, credit: credit("Tread chrome metal.jpg", "Georges Grondin", "Public domain") },
  { id: "brass", name: "Brass", family: "metal", meta: "Metal · Brushed finish", tags: ["Metal", "Warm", "Luxury", "Art Deco"], src: brass, credit: credit("Brushed brass paint (Apollo 11) interior.png", "NASA / Smithsonian Institution", "CC0") },
  { id: "copper", name: "Copper", family: "metal", meta: "Metal · Pure copper", tags: ["Metal", "Warm", "Luxury"], src: copper, credit: credit("Cu-Scheibe.JPG", "Alchemist-hp (pse-mendelejew.de)", "CC BY-SA 3.0 de") },
  // glass
  { id: "glass", name: "Glass", family: "glass", meta: "Glass · Obscured, textured", tags: ["Glass", "Light", "Privacy"], src: glass, credit: credit("Opaque glass.jpg", "Titus Tscharntke", "Public domain") },
  { id: "smoked-glass", name: "Smoked Glass", family: "glass", meta: "Glass · Fumé tint", tags: ["Glass", "Dark", "Seventies", "Luxury"], src: smokedGlass, credit: credit("Bolvaas Fumi (W J Rozendaal, 1931), Kristalunie Maastricht.jpg", "Het Nationaal Glasmuseum", "CC BY-SA 3.0") },
  // textile
  { id: "leather", name: "Leather", family: "textile", meta: "Leather · Aged hide", tags: ["Leather", "Warm", "Classic", "Luxury"], src: leather, credit: credit("Free antique leather book cover texture for layers (2978544161).jpg", "Pink Sherbet Photography", "CC BY 2.0") },
  { id: "boucle", name: "Bouclé", family: "textile", meta: "Textile · Looped yarn", tags: ["Textile", "Soft", "Cosy", "Contemporary"], src: boucle, credit: credit("Boucle fabric.jpg", "PKM", "Public domain") },
  { id: "velvet", name: "Velvet", family: "textile", meta: "Textile · Cut pile", tags: ["Textile", "Soft", "Luxury", "Rich"], src: velvet, credit: credit("Blue velvet.jpg", "Isokivi", "CC BY-SA 3.0") },
  { id: "linen", name: "Linen", family: "textile", meta: "Textile · Flax weave", tags: ["Textile", "Natural", "Light", "Relaxed"], src: linen, credit: credit("Linen, Texture (2242358989).jpg", "Gordana Adamovic-Mladenovic", "CC BY 2.0") },
  { id: "tweed", name: "Tweed", family: "textile", meta: "Textile · Woven wool", tags: ["Textile", "Wool", "Heritage", "British"], src: tweed, credit: credit("Tweed fabric.jpg", "tanakawho", "CC BY 2.0") },
  { id: "jute", name: "Jute Hessian", family: "textile", meta: "Textile · Coarse plant fibre", tags: ["Textile", "Natural", "Rustic", "Earthy"], src: jute, credit: credit("Hessian 380 diff 8k (Rico Cilliers and colormass via Poly Haven).png", "Poly Haven (Rico Cilliers, colormass)", "CC0") },
  { id: "shearling", name: "Sheepskin", family: "textile", meta: "Textile · Long wool pile", tags: ["Textile", "Soft", "Cosy", "Scandinavian"], src: shearling, credit: credit("Sheepskin bacground.jpg", "Titus Tscharntke", "Public domain") },
  // ceramic & brick
  { id: "ceramic", name: "Ceramic", family: "ceramic", meta: "Ceramic · Glazed zellige", tags: ["Ceramic", "Glazed", "Pattern", "Moroccan"], src: ceramic, credit: credit("Zellij fountain at Dar Khalifa.jpg", "Secretum Mundi", "CC BY-SA 4.0") },
  { id: "terracotta", name: "Terracotta", family: "ceramic", meta: "Ceramic · Fired clay tile", tags: ["Ceramic", "Warm", "Mediterranean", "Earthy"], src: terracotta, credit: credit("Orange terracotta ceramic scuffed tile pattern floor texture.jpg", "Sisters.seamless", "CC0") },
  { id: "brick", name: "Red Brick", family: "ceramic", meta: "Ceramic · Fired brick wall", tags: ["Brick", "Industrial", "Loft", "Warm"], src: brick, credit: credit("Red brick wall texture.JPG", "M0tty", "CC BY-SA 3.0") },
  // natural
  { id: "cork", name: "Cork", family: "natural", meta: "Natural · Agglomerated cork", tags: ["Natural", "Warm", "Soft", "Sustainable"], src: cork, credit: credit("Bulletin Board Texture.jpg", "JOGOS Public Assets", "CC BY-SA 4.0") },
  { id: "rattan", name: "Rattan", family: "natural", meta: "Natural · Woven cane", tags: ["Natural", "Woven", "Tropical", "Light"], src: rattan, credit: credit("Texture P7150078.JPG", "Clara.Hoke", "CC0") },
  { id: "bamboo", name: "Bamboo", family: "natural", meta: "Natural · Laminated strips", tags: ["Natural", "Light", "Japanese", "Sustainable"], src: bamboo, credit: credit("Bamboo cutting board surface texture 2014 01.jpg", "Julian Herzog", "CC BY 4.0") },
  { id: "mother-of-pearl", name: "Mother of Pearl", family: "natural", meta: "Natural · Abalone shell", tags: ["Natural", "Iridescent", "Luxury", "Inlay"], src: motherOfPearl, credit: credit("Coloured shell (11918066174).jpg", "James Petts", "CC BY-SA 2.0") },
];

export const MATERIALS_BY_ID = Object.fromEntries(MATERIALS.map((m) => [m.id, m]));
