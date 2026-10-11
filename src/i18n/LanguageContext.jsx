import { createContext, useContext, useMemo, useState, useCallback, useEffect } from "react";
import { DEFAULT_LANG, LANGUAGES, dictionary, initialLanguage, loadDictionary, storeLanguage } from "./dictionaries.js";

const LanguageContext = createContext(null);

function resolve(dict, key) {
  return key.split(".").reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), dict);
}

// main.jsx loads the opening language's dictionary before the first render, so `lang` always
// has its words at hand; switching language fetches the new one first, then switches.
export function LanguageProvider({ children }) {
  const [lang, setCurrent] = useState(initialLanguage);

  const setLang = useCallback((next) => {
    if (!LANGUAGES.includes(next)) return;
    storeLanguage(next);
    loadDictionary(next).then(
      () => setCurrent(next),
      () => setCurrent(DEFAULT_LANG)
    );
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // t("a.b.c") returns the string; t("a.b.c", { count: 3 }) also fills in its {count} slots.
  const t = useCallback(
    (key, vars) => {
      const value = resolve(dictionary(lang), key) ?? resolve(dictionary(DEFAULT_LANG), key) ?? key;
      if (!vars || typeof value !== "string") return value;
      return value.replace(/\{(\w+)\}/g, (match, name) => (vars[name] !== undefined ? vars[name] : match));
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t, languages: LANGUAGES }), [lang, setLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
