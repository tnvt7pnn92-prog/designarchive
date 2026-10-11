import { NavLink } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { LANGUAGE_NAMES } from "../i18n/dictionaries.js";
import { useAuth } from "../lib/auth.js";
import { updateProfile } from "../lib/profile.js";
import "./Footer.css";

const CHIPS = { en: "EN", it: "IT", es: "ES", fr: "FR", zh: "中文" };

// The sections, in three columns: what the site holds, the visitor's own space, the project.
const COLUMNS = [
  {
    title: "footer.explore",
    items: [
      { to: "/archive", key: "nav.archive" },
      { to: "/designers", key: "designers.title" },
      { to: "/markets", key: "nav.markets" },
      { to: "/stories", key: "nav.stories" },
    ],
  },
  {
    title: "account.menu",
    items: [
      { to: "/collection", key: "nav.collection" },
      { to: "/moodboard", key: "nav.moodboard" },
      { to: "/account", key: "nav.account" },
    ],
  },
  {
    title: "footer.project",
    items: [
      { to: "/credits", key: "footer.credits" },
      { to: "/privacy", key: "nav.privacy" },
    ],
  },
];

// The big wordmark (its letters lift under the pointer), the columns, and the languages.
export default function Footer() {
  const { t, lang, setLang, languages } = useLanguage();
  const { status } = useAuth();

  function pick(code) {
    setLang(code);
    if (status === "signedIn") updateProfile({ lang: code });
  }

  return (
    <footer className="site-footer">
      <div className="container">
        <p className="site-footer__wordmark" aria-label="Design Archive">
          {[..."Design Archive"].map((ch, i) => (
            <span key={i} aria-hidden="true">
              {ch === " " ? " " : ch}
            </span>
          ))}
        </p>
        <div className="site-footer__grid">
          <div className="site-footer__about">
            <p>{t("footer.tagline")}</p>
            <p>{t("footer.sourcesNote")}</p>
            <div className="site-footer__langs" role="group" aria-label={t("header.language")}>
              {languages.map((code) => (
                <button key={code} type="button" lang={code} aria-pressed={code === lang} aria-label={LANGUAGE_NAMES[code]} onClick={() => pick(code)}>
                  {CHIPS[code]}
                </button>
              ))}
            </div>
          </div>
          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={t(column.title)}>
              <h2 className="site-footer__title">{t(column.title)}</h2>
              <ul>
                {column.items.map((item) => (
                  <li key={item.to}>
                    <NavLink to={item.to}>{t(item.key)}</NavLink>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="site-footer__bottom">
          <span>
            © {new Date().getFullYear()} Design Archive. {t("footer.rights")}
          </span>
        </div>
      </div>
    </footer>
  );
}
