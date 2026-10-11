// The addresses of the markets section, from a market alone (no data imported: the pages that
// link to a market, like "Markets near you", do not have to load the whole list for it).
import { slugify } from "./slug.js";

export const cityNameOf = (market) => market.city.split(",")[0].trim();
export const countryOf = (market) => {
  const comma = market.city.lastIndexOf(",");
  return comma < 0 ? "" : market.city.slice(comma + 1).trim();
};
export const citySlugOf = (market) => slugify(cityNameOf(market));
export const marketPath = (market) => `/markets/${citySlugOf(market)}/${market.id}`;
export const cityPath = (slug) => `/markets/${slug}`;
