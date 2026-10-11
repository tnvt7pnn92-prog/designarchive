// Distance helpers for the Markets & Fairs search. Every market and place in the data
// already carries lat/lng, so searching by city needs no geocoding service.
import { MARKETS } from "../data/markets.js";
import { PLACES } from "../data/places.js";

const EARTH_RADIUS_KM = 6371;
const toRad = (deg) => (deg * Math.PI) / 180;

// Great-circle distance in km between two { lat, lng } points.
export function haversine(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

const cityKey = (label) => label.split(",")[0].trim().toLowerCase();
const normalize = (value) => value.trim().toLowerCase();

// Cities offered by the search box: the design capitals (city centre coordinates) plus
// every city hosting a market, so each listed market is reachable by its own city name.
export const CITIES = (() => {
  const byKey = new Map();
  for (const place of PLACES) {
    byKey.set(cityKey(place.city), {
      key: cityKey(place.city),
      label: `${place.city}, ${place.country}`,
      lat: place.lat,
      lng: place.lng,
    });
  }
  for (const market of MARKETS) {
    const key = cityKey(market.city);
    if (!byKey.has(key)) byKey.set(key, { key, label: market.city, lat: market.lat, lng: market.lng });
  }
  return [...byKey.values()].sort((a, b) => a.label.localeCompare(b.label));
})();

// Resolves free text to a known city: full label, then city name, then prefix, then
// substring. Returns null when nothing matches (the page falls back to a text search).
export function findCity(query) {
  const q = normalize(query);
  if (!q) return null;
  return (
    CITIES.find((c) => normalize(c.label) === q) ??
    CITIES.find((c) => c.key === q) ??
    CITIES.find((c) => c.key.startsWith(q)) ??
    CITIES.find((c) => normalize(c.label).includes(q)) ??
    null
  );
}
