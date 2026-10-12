// Photographs of the places in the markets guide: real pictures of each place, from Wikimedia
// Commons under the licence given, credited on the Credits page with a link to the file page.
// `path` is the Commons file path (as in upload.wikimedia.org/wikipedia/commons/<path>).
// A place without an entry here has no photo: its page and card simply go without.
export const MARKETS_HERO = {
  path: "9/9a/Paris_-_Antiques_in_a_shop_at_the_Marche_Dauphine_-_2650.jpg",
  author: "Jorge Royan",
  license: "CC BY-SA 3.0",
  caption: "Marché Dauphine, Saint-Ouen",
};

export const MARKET_PHOTOS = {
  "saint-ouen": { path: "f/f0/Marche_aux_Puces_08.jpg", author: "Shadowgate", license: "CC BY 2.0" },
  "paul-bert-serpette": { path: "4/4d/Allée_4_Marché_Serpette_-_Saint-Ouen-sur-Seine_(FR93)_-_2022-06-21_-_3.jpg", author: "Chabe01", license: "CC BY-SA 4.0" },
  "portobello-road-market": { path: "a/a6/Portobello_Road_(6426194051).jpg", author: "Shadowgate", license: "CC BY 2.0" },
  "el-rastro": { path: "e/ea/Botellas_de_Sifón.JPG", author: "Tamorlan", license: "CC BY-SA 3.0" },
  "place-du-jeu-de-balle": { path: "a/a2/Flea_market_of_Brussels_03.jpg", author: "Donarreiskoffer", license: "CC BY-SA 4.0" },
  waterlooplein: { path: "8/87/Amsterdam_flea_market.jpg", author: "Incase Designs", license: "CC BY 2.0" },
  "fiera-antiquaria-arezzo": { path: "4/49/Antiquaria-Arezzo-Piazza-Grande.jpg", author: "Daenerys-stark", license: "CC BY-SA 4.0" },
  "salone-del-mobile": { path: "9/94/Lago_stand_in_Salone_del_mobile_2008.jpg", author: "Design Conversation", license: "CC BY 2.0" },
};

const encode = (path) => path.split("/").map(encodeURIComponent).join("/");
const fileName = (path) => path.split("/").pop();

// A Commons thumbnail at one of its standard widths (500, 960 or 1280 px).
export function commonsThumb(photo, width = 960) {
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${encode(photo.path)}/${width}px-${encodeURIComponent(fileName(photo.path))}`;
}

export const commonsSrcSet = (photo) => [500, 960, 1280].map((w) => `${commonsThumb(photo, w)} ${w}w`).join(", ");

export const commonsPage = (photo) => `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fileName(photo.path).replace(/ /g, "_"))}`;

export const marketPhoto = (id) => MARKET_PHOTOS[id] ?? null;
