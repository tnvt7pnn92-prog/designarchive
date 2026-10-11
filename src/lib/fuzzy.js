// Forgiving text matching for the global search: accents and case are ignored, a whole word or
// the start of a word counts most, and a query with letters missing ("eams lng") still finds
// what it is short for, as long as the letters come in order and not too scattered.

export function normalize(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

const SCATTER_LIMIT = 40;

// Higher is better; -1 means no match. Both arguments must already be normalized.
export function fuzzyScore(query, text) {
  if (!query) return 0;
  if (!text) return -1;

  const at = text.indexOf(query);
  if (at !== -1) {
    const wordStart = at === 0 || /[\s\-–—·,(/]/.test(text[at - 1]);
    return 100 + (text.length === query.length ? 60 : 0) + (wordStart ? 30 : 0) - Math.min(at, 30);
  }

  const words = query.split(/\s+/).filter(Boolean);
  if (words.length > 1 && words.every((word) => text.includes(word))) return 70;

  // Abbreviations: every word typed must be the start of a word in the text with some letters
  // left out ("lng" → "lounge"), with a penalty for each letter skipped.
  const textWords = text.split(/[^a-z0-9À-￿]+/).filter(Boolean);
  let gaps = 0;
  for (const word of words.length ? words : [query]) {
    let best = -1;
    for (const candidate of textWords) {
      const skipped = abbreviationGaps(word, candidate);
      if (skipped !== -1 && (best === -1 || skipped < best)) best = skipped;
    }
    if (best === -1) return -1;
    gaps += best;
  }
  const score = SCATTER_LIMIT - gaps * 3;
  return score > 0 ? score : -1;
}

// Letters skipped in `word` to read `short` out of it, starting at its first letter; -1 if not.
function abbreviationGaps(short, word) {
  if (short[0] !== word[0]) return -1;
  let at = 0;
  let gaps = 0;
  for (let i = 1; i < short.length; i += 1) {
    const found = word.indexOf(short[i], at + 1);
    if (found === -1) return -1;
    gaps += found - at - 1;
    at = found;
  }
  return gaps;
}

// The best score over several fields; later fields (designer, brand…) count for less than the
// first one (the name).
export function bestScore(query, fields) {
  let best = -1;
  fields.forEach((field, i) => {
    const score = fuzzyScore(query, field);
    if (score < 0) return;
    const weighted = i === 0 ? score : score * 0.6;
    if (weighted > best) best = weighted;
  });
  return best;
}
