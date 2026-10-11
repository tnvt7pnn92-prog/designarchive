// URL slugs for names taken from the data (designers, brands). Most accents decompose under
// NFD, but a handful of letters do not — without the pre-map "Poul Kjærholm" would slug to
// "kj-rholm" and "Børge Mogensen" to "b-rge".
const PRE_MAP = {
  æ: "ae",
  Æ: "ae",
  œ: "oe",
  Œ: "oe",
  ø: "o",
  Ø: "o",
  ß: "ss",
  đ: "d",
  Đ: "d",
  ł: "l",
  Ł: "l",
  "&": " and ",
};

const PRE_RE = new RegExp(`[${Object.keys(PRE_MAP).join("")}]`, "g");

export function slugify(value) {
  return String(value ?? "")
    .replace(PRE_RE, (ch) => PRE_MAP[ch])
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
