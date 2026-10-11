// The archive's filters live in the URL, so a filtered view can be linked, bookmarked and
// shared. This module is the only place that knows how a filter set maps to query parameters.
//
// Every value read back from a URL is checked against the real vocabularies: these links get
// posted in public and mangled on the way.
import { BRANDS, CATEGORIES, COUNTRIES, DECADES, MATERIALS, STYLES } from "../data/objects.js";

export const SORTS = ["featured", "newest", "oldest", "az", "designer"];
export const DENSITIES = ["large", "medium", "small", "mini"];

export const EMPTY_FILTERS = {
  category: [],
  style: [],
  decade: [],
  designer: "",
  brand: "",
  country: "",
  material: [],
  search: "",
};

// `decadeOf` returns a number from 1900 on and "before-1900" below it; decades are handled as
// strings everywhere so a URL value never has to be guessed back into a number.
const DECADE_VALUES = DECADES.map(String);

const LIST_KEYS = [
  ["category", CATEGORIES],
  ["style", STYLES],
  ["decade", DECADE_VALUES],
  ["material", MATERIALS],
];

function readList(params, key, allowed) {
  const raw = params.getAll(key).flatMap((value) => value.split(","));
  return [...new Set(raw.map((v) => v.trim()).filter((v) => allowed.includes(v)))];
}

function readOne(params, key, allowed) {
  const value = (params.get(key) ?? "").trim();
  if (!value) return "";
  return !allowed || allowed.includes(value) ? value : "";
}

export function filtersFromParams(params) {
  const filters = { ...EMPTY_FILTERS };
  for (const [key, allowed] of LIST_KEYS) filters[key] = readList(params, key, allowed);
  filters.brand = readOne(params, "brand", BRANDS);
  filters.country = readOne(params, "country", COUNTRIES);
  // The designer box matches on substrings, so it stays free text — only its length is capped.
  filters.designer = readOne(params, "designer").slice(0, 80);
  filters.search = (params.get("q") ?? "").trim().slice(0, 80);

  const sort = params.get("sort");
  const view = params.get("view");
  // How many blocks of results are shown. Capped so a hand-edited URL cannot ask for thousands.
  const page = Math.min(Math.max(Number.parseInt(params.get("page") ?? "1", 10) || 1, 1), 50);
  return {
    filters,
    sort: SORTS.includes(sort) ? sort : "featured",
    density: DENSITIES.includes(view) ? view : "large",
    page,
  };
}

// Defaults are left out of the URL, the way the Markets page already omits `view=map`.
// Leaving `page` out on purpose resets it: any change of filter starts from the first block.
export function paramsFromFilters(filters, sort = "featured", density = "large", page = 1) {
  const params = new URLSearchParams();
  if (filters.search?.trim()) params.set("q", filters.search.trim());
  for (const [key] of LIST_KEYS) if (filters[key]?.length) params.set(key, filters[key].join(","));
  for (const key of ["designer", "brand", "country"]) if (filters[key]) params.set(key, filters[key]);
  if (sort && sort !== "featured") params.set("sort", sort);
  if (density && density !== "large") params.set("view", density);
  if (page > 1) params.set("page", String(page));
  return params;
}

// Builds "/archive?…" for a single facet — used by the piece and designer pages, the home page
// and the header search.
export function archiveHref(patch = {}) {
  const { sort, density, ...rest } = patch;
  const filters = { ...EMPTY_FILTERS, ...rest };
  for (const [key] of LIST_KEYS) {
    if (filters[key] && !Array.isArray(filters[key])) filters[key] = [String(filters[key])];
    else if (Array.isArray(filters[key])) filters[key] = filters[key].map(String);
  }
  const query = paramsFromFilters(filters, sort, density).toString();
  return query ? `/archive?${query}` : "/archive";
}
