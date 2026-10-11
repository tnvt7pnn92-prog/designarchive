// The five interface dictionaries. English is always there (it is the fallback for every key);
// the other four are separate files fetched on demand, so a visitor downloads only the language
// they read instead of all five (about 30 kB gzipped less on the first load).
import en from "./dictionaries/en.js";

export const LANGUAGES = ["en", "it", "es", "fr", "zh"];
export const DEFAULT_LANG = "en";
// Each language's own name, for the switcher: known before its dictionary is loaded.
export const LANGUAGE_NAMES = { en: "English", it: "Italiano", es: "Español", fr: "Français", zh: "中文" };

const STORAGE_KEY = "design-archive:lang";

const LOADERS = {
  it: () => import("./dictionaries/it.js"),
  es: () => import("./dictionaries/es.js"),
  fr: () => import("./dictionaries/fr.js"),
  zh: () => import("./dictionaries/zh.js"),
};

const loaded = { en };

export function dictionary(lang) {
  return loaded[lang];
}

export function loadDictionary(lang) {
  if (loaded[lang]) return Promise.resolve(loaded[lang]);
  return LOADERS[lang]().then((mod) => {
    loaded[lang] = mod.default;
    return mod.default;
  });
}

export function storeLanguage(lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* private mode: the choice lasts for this visit */
  }
}

let initial = null;

// The language to open with, decided once: ?lang=it in the address (how the hreflang links of
// the static pages address each language, removed from the address once read), then the
// visitor's earlier choice, then English.
export function initialLanguage() {
  if (initial) return initial;
  initial = DEFAULT_LANG;
  try {
    const url = new URL(window.location.href);
    const asked = url.searchParams.get("lang");
    if (asked) {
      url.searchParams.delete("lang");
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
      if (LANGUAGES.includes(asked)) {
        initial = asked;
        return initial;
      }
    }
  } catch {
    /* no usable address: fall back to the stored choice */
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && LANGUAGES.includes(stored)) initial = stored;
  } catch {
    /* storage blocked */
  }
  return initial;
}
