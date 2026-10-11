// The archive's search box, forgiving the way people type at a flea market: half words, plurals,
// accents, word order and one slip of the finger.
//
//   "sofa" / "sofas" / "divano"    the sofas (category, in English and in the reader's language)
//   "barcel" / "barcellona"        the Barcelona chair (a prefix; one letter wrong is still a match)
//   "lounge eames"                 every word must be found, in any order
//
// Each piece is reduced once to a list of plain words (no accents, no punctuation): its name,
// designer, maker, country, year, and the names of its category, styles and materials. A typed
// word matches a piece when one of those words
//   1. starts with it ("barc" → "barcelona"), or holds it ("chair" → "armchair");
//   2. starts with it minus a plural or gender ending ("sofas" → "sofa", "divano" → "divani");
//   3. only if 1–2 find nothing in the whole archive: differs from it by one letter, for words of
//      five letters or more ("barcellona"). So "table" never brings in "stable".
// Results keep their own order: the search decides what is shown, the sort decides the order.

const MIN_FUZZY = 5;

// Lower case, no accents, anything that is not a letter or a digit becomes a space (Chinese
// characters are letters too, so they stay).
export function fold(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

const words = (text) => fold(text).split(" ").filter(Boolean);

// The shorter forms a typed word may stand for: "sofas" → "sofa", "glasses" → "glass",
// "divano" → "divan" (which also starts "divani"). Short words are taken as they are.
function stems(word) {
  const out = [word];
  if (word.length >= 4) out.push(word.slice(0, -1));
  if (word.length >= 5 && word.endsWith("es")) out.push(word.slice(0, -2));
  return out;
}

// Whether two words are at most one edit apart (one letter changed, added or removed).
function oneEditApart(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

const strictMatch = (typed, forms, pieceWord) => forms.some((form) => pieceWord.startsWith(form)) || (typed.length >= 3 && pieceWord.includes(typed));

// A slip anywhere in the word, or in the part typed so far ("barcellon" → "barcelona").
const fuzzyMatch = (typed, pieceWord) =>
  oneEditApart(typed, pieceWord) || oneEditApart(typed, pieceWord.slice(0, typed.length)) || oneEditApart(typed, pieceWord.slice(0, typed.length - 1));

// Each piece's words, per language of the labels: worked out once, not on every keystroke.
const WORDS = new Map();

function wordsOf(piece, lang, labelsOf) {
  let byPiece = WORDS.get(lang);
  if (!byPiece) WORDS.set(lang, (byPiece = new WeakMap()));
  let own = byPiece.get(piece);
  if (!own) {
    const fields = [piece.name, piece.designer, piece.brand, piece.country, piece.year, piece.category, ...(piece.styles ?? []), ...(piece.materialTags ?? [])];
    own = [...new Set(words([...fields, ...labelsOf(piece)].join(" ")))];
    byPiece.set(piece, own);
  }
  return own;
}

// Turns what was typed into the test each piece of `pieces` has to pass.
//   lang      the language of the labels, for the cache
//   labelsOf  (piece) => the translated names of its category, styles and materials
export function makeSearch(query, pieces, { lang = "en", labelsOf = () => [] } = {}) {
  const typed = [...new Set(words(query))];
  if (!typed.length) return () => true;
  const own = (piece) => wordsOf(piece, lang, labelsOf);
  const wanted = typed.map((word) => {
    const forms = stems(word);
    const strict = (pieceWord) => strictMatch(word, forms, pieceWord);
    // Typo tolerance only for a word the archive does not know at all.
    const known = word.length < MIN_FUZZY || pieces.some((piece) => own(piece).some(strict));
    return known ? strict : (pieceWord) => fuzzyMatch(word, pieceWord);
  });
  return (piece) => {
    const list = own(piece);
    return wanted.every((test) => list.some(test));
  };
}
