// Headline numbers the home page shows. They live here as plain constants so that showing
// "799 markets" does not drag the 248 kB market list into the first page load;
// scripts/check-data.mjs fails the build if they ever stop matching the data.
export const MARKET_COUNT = 1112;
