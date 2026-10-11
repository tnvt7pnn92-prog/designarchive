// The figures of the stories page that count up: "145 cm", "€21.9M", "$3.50", "#4" hold one number
// with words around it and can be counted. "11-4201" (two numbers) or "Milano" (none) cannot.
// "1,000+" is a grouped whole number, not a decimal.
export function countable(text) {
  const match = /^(\D*?)(\d{1,3}(?:,\d{3})+|\d+(?:[.,]\d+)?)(\D*)$/.exec(String(text ?? ""));
  if (!match) return null;
  const [, before, figure, after] = match;
  if (/^\d{1,3}(?:,\d{3})+$/.test(figure)) {
    return { before, after, value: Number(figure.replaceAll(",", "")), start: 0, decimals: 0, separator: ".", grouped: true };
  }
  const separator = figure.includes(",") ? "," : ".";
  const decimals = figure.split(/[.,]/)[1]?.length ?? 0;
  const value = Number(figure.replace(",", "."));
  // A year counts up from a little before it, not from zero.
  const start = value >= 1000 && decimals === 0 ? value - 80 : 0;
  return { before, after, value, start, decimals, separator };
}

// The figure at some point of its count, written the way the original is (decimals, separator, grouping).
export const formatCount = ({ before, after, decimals, separator, grouped }, n) =>
  `${before}${grouped ? Math.round(n).toLocaleString("en-US") : n.toFixed(decimals).replace(".", separator)}${after}`;
