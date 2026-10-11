// Markets with their parsed place, plus the bridge from an archive piece to the
// markets of its country. Kept apart from indexes.js so that importing an archive lookup does
// not drag the 242 KB market list in with it.
import { MARKETS } from "./markets.js";
import { marketPlace } from "../lib/marketFilters.js";

export const MARKET_ITEMS = MARKETS.map((m) => ({ ...m, place: marketPlace(m) }));

// objects.js and markets.js spell two countries differently; "International" (7 pieces) matches
// no country at all and simply shows no markets.
const OBJECT_COUNTRY_ALIASES = { "United Kingdom": "UK", "United States": "USA" };

export const MARKETS_BY_OBJECT_COUNTRY = new Map();
for (const market of MARKET_ITEMS) {
  const name = market.place.countryName;
  if (!name) continue;
  const list = MARKETS_BY_OBJECT_COUNTRY.get(name);
  if (list) list.push(market);
  else MARKETS_BY_OBJECT_COUNTRY.set(name, [market]);
}

export function marketsForCountry(country) {
  const key = OBJECT_COUNTRY_ALIASES[country] ?? country;
  return MARKETS_BY_OBJECT_COUNTRY.get(key) ?? [];
}
