// The markets guide (/markets): its categories, the themes read from each place's description,
// the editorial selection, and the search. Plain functions, no React and no data import: the page
// and the prerender script pass the list in.
import { normalize, bestScore } from "./fuzzy.js";
import { REGIONS, marketPlace } from "./marketFilters.js";
import { cityNameOf, countryOf } from "./marketPaths.js";

// The guide's categories, each a slice of the four kinds the data stores; every place is in exactly
// one. Two are read from the place itself: a market whose name or description speaks of antiques
// is an antiques market (the others are flea and vintage markets), a shop calling itself a gallery
// is a gallery (the others are vintage shops and dealers).
const words = (m) => `${m.name} ${m.description ?? ""}`;
const GALLERY = /\bgaller(y|ies)\b|\bgalerie\b|\bgalleria\b|\bgalería\b|\bgaleria\b/i;
const ANTIQUES = /antiqu|antiek|antik|brocante|antiquari|anticuari/i;

export function mainCategory(market) {
  if (market.kind === "market") return ANTIQUES.test(words(market)) ? "antiques" : "flea";
  if (market.kind === "shop") return GALLERY.test(words(market)) ? "galleries" : "shops";
  return market.kind === "fair" ? "fairs" : "sales";
}

export const CATEGORIES = ["shops", "flea", "galleries", "antiques", "fairs", "sales"].map((key) => ({
  key,
  test: (m) => mainCategory(m) === key,
}));

export const categoryOf = (key) => CATEGORIES.find((c) => c.key === key) ?? null;

// Themes a place is known for, as its own description says them (or as set by hand in
// `specialties`): words found, never guessed.
export const SPECIALTIES = {
  midCentury: /mid-?century|modernis|1950s|1960s|1970s|fifties|sixties|post-?war|20th-century design|twentieth-century design|modernariato/i,
  lighting: /\blighting\b|\blamps?\b|\bchandeliers?\b/i,
  italian: /italian design|design italiano/i,
  scandinavian: /scandinavian|danish|nordic|swedish|finnish design/i,
  industrial: /industrial/i,
  collectible: /collectible design|contemporary design|limited[- ]edition|design editions?/i,
  ceramics: /ceramic|porcelain|glassware|\bglass\b/i,
  antiques: /antiques?\b|antiquit/i,
};

export function specialtiesOf(market) {
  if (Array.isArray(market.specialties)) return market.specialties.filter((key) => key in SPECIALTIES);
  const text = market.description ?? "";
  return Object.keys(SPECIALTIES).filter((key) => SPECIALTIES[key].test(text));
}

// "Places worth the journey": an editorial choice, all with a real photo (data/marketPhotos.js).
// Never a paid placement: those carry `listing: "sponsored"` and are shown as such.
export const FEATURED = [
  "saint-ouen",
  "portobello-road-market",
  "fiera-antiquaria-arezzo",
  "place-du-jeu-de-balle",
  "el-rastro",
  "paul-bert-serpette",
  "waterlooplein",
  "salone-del-mobile",
];

// Country and region of each place, with the country's name in the visitor's language.
export function countryName(market, lang) {
  const { code, countryName: name } = marketPlace(market);
  if (!code) return name;
  try {
    return new Intl.DisplayNames([lang === "zh" ? "zh-CN" : lang], { type: "region" }).of(code) ?? name;
  } catch {
    return name;
  }
}

// Regions → countries → cities, with real counts, for the "explore by place" section.
export function geography(markets) {
  const countries = new Map();
  for (const m of markets) {
    const place = marketPlace(m);
    const key = place.countryName || "—";
    const entry = countries.get(key) ?? { key, code: place.code, region: place.region, sample: m, count: 0, cities: new Map() };
    entry.count += 1;
    const city = cityNameOf(m);
    entry.cities.set(city, (entry.cities.get(city) ?? 0) + 1);
    countries.set(key, entry);
  }
  const list = [...countries.values()].map((c) => ({
    ...c,
    cities: [...c.cities].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
  }));
  return REGIONS.map((region) => ({
    region,
    countries: list.filter((c) => c.region === region).sort((a, b) => b.count - a.count),
  })).filter((r) => r.countries.length);
}

// Cities are stored in English: their names in the site's other languages find them too.
const CITY_ALIASES = {
  milano: "milan", roma: "rome", firenze: "florence", torino: "turin", venezia: "venice", napoli: "naples",
  genova: "genoa", mantova: "mantua", padova: "padua", parigi: "paris", londra: "london", lisbona: "lisbon",
  lisboa: "lisbon", bruxelles: "brussels", bruselas: "brussels", bruxelas: "brussels", anversa: "antwerp",
  anvers: "antwerp", amberes: "antwerp", copenaghen: "copenhagen", copenhague: "copenhagen", monaco: "munich",
  "monaco di baviera": "munich", munchen: "munich", colonia: "cologne", koln: "cologne", vienne: "vienna",
  viena: "vienna", wien: "vienna", praga: "prague", varsavia: "warsaw", berlino: "berlin", stoccolma: "stockholm",
  ginevra: "geneva", geneve: "geneva", zurigo: "zurich", londres: "london", "nueva york": "new york",
  "nuova york": "new york", siviglia: "seville", sevilla: "seville", marsiglia: "marseille", lione: "lyon",
  atene: "athens", tokio: "tokyo", pechino: "beijing", "citta del messico": "mexico city",
};

// The search: name first, then city, country (as written and in the visitor's language) and the
// description; accents and case ignored, typos within reason (lib/fuzzy.js).
export function searchMarkets(markets, query, lang) {
  const q = normalize(query.trim());
  if (!q) return markets;
  const alias = CITY_ALIASES[q];
  const score = (m) => {
    const fields = [normalize(m.name), normalize(cityNameOf(m)), normalize(`${countryOf(m)} ${countryName(m, lang)}`), normalize(m.description)];
    return Math.max(bestScore(q, fields), alias ? bestScore(alias, fields) : -1);
  };
  return markets
    .map((m) => ({ m, score: score(m) }))
    .filter((e) => e.score >= 0)
    .sort((a, b) => b.score - a.score)
    .map((e) => e.m);
}

// Filters and order, all optional and combined. `order`: "editorial" keeps the guide's own order
// (the list is curated, the best-known places first), "az" sorts by name.
export function filterMarkets(markets, { query = "", category = "", country = "", city = "", order = "editorial", lang = "en" } = {}) {
  const cat = categoryOf(category);
  let list = markets.filter((m) => (!cat || cat.test(m)) && (!country || countryOf(m) === country) && (!city || cityNameOf(m) === city));
  if (query.trim()) list = searchMarkets(list, query, lang);
  else if (order === "az") list = [...list].sort((a, b) => a.name.localeCompare(b.name, lang));
  return list;
}
