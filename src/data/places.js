// Design-capital cities used by the homepage "Explore by Place" strip, the photo collage
// and the city index behind the markets search (lat/lng are city centres).
// `country` matches the `country` field in objects.js so a click can filter the Archive.
// `image`/`credit` are set only for the cities featured in the "Explore by Place" strip on
// the homepage — real photos from Wikimedia Commons, used under their stated free licenses.
import { commonsThumb } from "./objectPhotos.js";

const filePath = (name) => commonsThumb(name);

export const PLACES = [
  {
    id: "milan",
    city: "Milan",
    country: "Italy",
    lat: 45.4642,
    lng: 9.19,
    image: filePath("Full_Milan_skyline_from_Duomo_roof.jpg"),
    credit: "Daniel Case, CC BY-SA 3.0, via Wikimedia Commons",
  },
  {
    id: "new-york",
    city: "New York",
    country: "United States",
    lat: 40.7128,
    lng: -74.006,
    image: filePath("Chrysler_Building_and_New_York_Skyline_Night_Panorama.jpg"),
    credit: "Alan Bastick, CC BY-SA 4.0, via Wikimedia Commons",
  },
  {
    id: "tokyo",
    city: "Tokyo",
    country: "Japan",
    lat: 35.6762,
    lng: 139.6503,
    image: filePath("Tokyo-skyline.jpg"),
    credit: "Zara Seemann, CC BY-SA 2.0 DE, via Wikimedia Commons",
  },
  { id: "sao-paulo", city: "São Paulo", country: "Brazil", lat: -23.5505, lng: -46.6333 },
  { id: "copenhagen", city: "Copenhagen", country: "Denmark", lat: 55.6761, lng: 12.5683 },
  {
    id: "paris",
    city: "Paris",
    country: "France",
    lat: 48.8566,
    lng: 2.3522,
    image: filePath("Eiffel_Tower_Paris_01.JPG"),
    credit: "Waithamai, CC BY-SA 3.0, via Wikimedia Commons",
  },
  { id: "berlin", city: "Berlin", country: "Germany", lat: 52.52, lng: 13.405 },
  { id: "helsinki", city: "Helsinki", country: "Finland", lat: 60.1699, lng: 24.9384 },
  { id: "london", city: "London", country: "United Kingdom", lat: 51.5072, lng: -0.1276 },
  { id: "stockholm", city: "Stockholm", country: "Sweden", lat: 59.3293, lng: 18.0686 },
];

export const FEATURED_PLACES = PLACES.filter((p) => p.image);
