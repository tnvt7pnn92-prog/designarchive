// The site's own photographs, not tied to a piece: the default sharing image (Open Graph) for pages
// without a piece of their own, and the six rooms of the home page. Each is credited on the Credits
// page, with a link to the page it comes from.
const unsplash = (id, w = 2000) => `https://images.unsplash.com/${id}?w=${w}&q=80&auto=format&fit=crop`;
// A Commons thumbnail 960 px wide (a standard step, so the 500 px one exists too for phones).
const commons = (path) => {
  const file = path.split("/").pop();
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${path}/960px-${file}`;
};
const commonsPage = (file) => `https://commons.wikimedia.org/wiki/File:${file}`;

export const PROMO_IMAGES = {
  hero: {
    label: "Default sharing image",
    image: unsplash("photo-1762544968153-b9b47435fefd"),
    credit: "Clay Banks, Unsplash License, via Unsplash",
  },
  roomArchive: {
    label: "Home page, the archive: inside the Vitra Schaudepot, Weil am Rhein",
    image: commons("1/1e/Im_Vitra_Schaudepot_von_Herzog_%26_de_Meuron_in_Weil_am_Rhein_2.jpg"),
    credit: "Andreas Schwarzkopf, CC BY-SA 3.0, via Wikimedia Commons",
    page: commonsPage("Im_Vitra_Schaudepot_von_Herzog_%26_de_Meuron_in_Weil_am_Rhein_2.jpg"),
  },
  roomDesigners: {
    label: "Home page, the designers: Le Corbusier in 1964",
    image: commons("a/a2/Le_Corbusier_%281964%29_Stedelijk_Museum_Sikkensprijzen_916-9288_%28cropped%29.jpg"),
    credit: "Joop van Bilsen for Anefo (Nationaal Archief), CC0, via Wikimedia Commons",
    page: commonsPage("Le_Corbusier_%281964%29_Stedelijk_Museum_Sikkensprijzen_916-9288_%28cropped%29.jpg"),
  },
  roomMarkets: {
    label: "Home page, the markets: the Fiera Antiquaria in Piazza Grande, Arezzo",
    image: commons("4/4e/Arezzo_-_Chiesa_di_Santa_Maria_della_Pieve_-_2025-09-29_15-22-20_001.jpg"),
    credit: "Repuli, CC BY-SA 4.0, via Wikimedia Commons",
    page: commonsPage("Arezzo_-_Chiesa_di_Santa_Maria_della_Pieve_-_2025-09-29_15-22-20_001.jpg"),
  },
  roomStories: {
    label: "Home page, the stories: Domus, 15 February 1928",
    image: commons("c/ce/Domus%2C_15_febbraio_1928.jpg"),
    credit: "Francesco Bini, CC BY-SA 4.0, via Wikimedia Commons",
    page: commonsPage("Domus%2C_15_febbraio_1928.jpg"),
  },
  roomCollection: {
    label: "Home page, the collection: a shelf of the Vitra Schaudepot",
    image: commons("1/1c/Im_Vitra_Schaudepot_von_Herzog_%26_de_Meuron_in_Weil_am_Rhein_4.jpg"),
    credit: "Andreas Schwarzkopf, CC BY-SA 3.0, via Wikimedia Commons",
    page: commonsPage("Im_Vitra_Schaudepot_von_Herzog_%26_de_Meuron_in_Weil_am_Rhein_4.jpg"),
  },
  roomMoodboard: {
    label: "Home page, the room: Charles Eames's office, rebuilt in the Vitra Schaudepot",
    image: commons("9/9f/Vitra_Schaudepot_Untergeschoss_mit_Fenster_zum_B%C3%BCro_von_Charles_Eames.jpg"),
    credit: "Andreas Schwarzkopf, CC BY-SA 3.0, via Wikimedia Commons",
    page: commonsPage("Vitra_Schaudepot_Untergeschoss_mit_Fenster_zum_B%C3%BCro_von_Charles_Eames.jpg"),
  },
};
