// Derived fields of a market. The data only stores "City, Country": the country (with its ISO code
// and region) is worked out here.

// The same colours as the --kind-* tokens (the globe draws with raw values).
export const KIND_COLORS = { market: "#d9a441", fair: "#6fa69c", shop: "#d27a5f", sale: "#a98bdb" };

export const REGIONS = ["europe", "northAmerica", "latinAmerica", "asia", "oceania", "africaMiddleEast"];

// Country names as written in markets.js → ISO code (used for localised names) and region.
const COUNTRIES = {
  France: ["FR", "europe"],
  Italy: ["IT", "europe"],
  UK: ["GB", "europe"],
  Portugal: ["PT", "europe"],
  Spain: ["ES", "europe"],
  Belgium: ["BE", "europe"],
  Netherlands: ["NL", "europe"],
  Germany: ["DE", "europe"],
  Austria: ["AT", "europe"],
  Switzerland: ["CH", "europe"],
  Sweden: ["SE", "europe"],
  Norway: ["NO", "europe"],
  Denmark: ["DK", "europe"],
  Hungary: ["HU", "europe"],
  Poland: ["PL", "europe"],
  "Czech Republic": ["CZ", "europe"],
  Croatia: ["HR", "europe"],
  Greece: ["GR", "europe"],
  Turkey: ["TR", "europe"],
  Ireland: ["IE", "europe"],
  Romania: ["RO", "europe"],
  Russia: ["RU", "europe"],
  Serbia: ["RS", "europe"],
  Slovenia: ["SI", "europe"],
  Bulgaria: ["BG", "europe"],
  Estonia: ["EE", "europe"],
  Latvia: ["LV", "europe"],
  Lithuania: ["LT", "europe"],
  Finland: ["FI", "europe"],
  "United Arab Emirates": ["AE", "africaMiddleEast"],
  Vietnam: ["VN", "asia"],
  Singapore: ["SG", "asia"],
  "New Zealand": ["NZ", "oceania"],
  Morocco: ["MA", "africaMiddleEast"],
  Egypt: ["EG", "africaMiddleEast"],
  Tunisia: ["TN", "africaMiddleEast"],
  Nigeria: ["NG", "africaMiddleEast"],
  Kenya: ["KE", "africaMiddleEast"],
  Ethiopia: ["ET", "africaMiddleEast"],
  Ghana: ["GH", "africaMiddleEast"],
  Senegal: ["SN", "africaMiddleEast"],
  USA: ["US", "northAmerica"],
  Canada: ["CA", "northAmerica"],
  Mexico: ["MX", "latinAmerica"],
  Argentina: ["AR", "latinAmerica"],
  Brazil: ["BR", "latinAmerica"],
  Colombia: ["CO", "latinAmerica"],
  Chile: ["CL", "latinAmerica"],
  Uruguay: ["UY", "latinAmerica"],
  Japan: ["JP", "asia"],
  China: ["CN", "asia"],
  "South Korea": ["KR", "asia"],
  Thailand: ["TH", "asia"],
  Indonesia: ["ID", "asia"],
  India: ["IN", "asia"],
  Australia: ["AU", "oceania"],
  Israel: ["IL", "africaMiddleEast"],
  "South Africa": ["ZA", "africaMiddleEast"],
};

export function marketPlace(market) {
  const comma = market.city.lastIndexOf(",");
  const city = comma < 0 ? market.city : market.city.slice(0, comma).trim();
  const countryName = comma < 0 ? "" : market.city.slice(comma + 1).trim();
  const [code = null, region = null] = COUNTRIES[countryName] ?? [];
  return { city, countryName, code, region };
}
