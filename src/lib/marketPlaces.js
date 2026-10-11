// The addresses of the markets section: a page per city (/markets/milan) and per place
// (/markets/milan/fiera-di-sinigaglia). Plain functions and data, no React: the prerender script
// uses them to write one static page for each.
import { MARKETS } from "../data/markets.js";
import { cityNameOf, citySlugOf, countryOf } from "./marketPaths.js";

export { cityNameOf, cityPath, citySlugOf, countryOf, marketPath } from "./marketPaths.js";

// Every city with at least one place, most places first: [{ slug, name, country, count, lat, lng }].
// The centre is the average of its places — close enough to start a plan from.
export const MARKET_CITIES = (() => {
  const bySlug = new Map();
  for (const market of MARKETS) {
    const slug = citySlugOf(market);
    const entry = bySlug.get(slug) ?? { slug, name: cityNameOf(market), country: countryOf(market), places: [] };
    entry.places.push(market);
    bySlug.set(slug, entry);
  }
  return [...bySlug.values()]
    .map(({ places, ...city }) => ({
      ...city,
      count: places.length,
      lat: places.reduce((sum, m) => sum + m.lat, 0) / places.length,
      lng: places.reduce((sum, m) => sum + m.lng, 0) / places.length,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
})();

export const marketCity = (slug) => MARKET_CITIES.find((city) => city.slug === slug) ?? null;
export const placesIn = (slug) => MARKETS.filter((market) => citySlugOf(market) === slug);
export const marketById = (id) => MARKETS.find((market) => market.id === id) ?? null;

// The archive writes two countries in full where the markets abbreviate them.
const ARCHIVE_COUNTRY = { UK: "United Kingdom", USA: "United States" };
export const archiveCountryOf = (market) => ARCHIVE_COUNTRY[countryOf(market)] ?? countryOf(market);
