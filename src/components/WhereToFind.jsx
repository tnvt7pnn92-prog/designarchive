import { useLanguage } from "../i18n/LanguageContext.jsx";
import { searchLinks } from "../lib/guide.js";
import { PIECE_FACTS } from "../data/pieceFacts.js";
import NearbyMarkets from "./NearbyMarkets.jsx";
import "./WhereToFind.css";

const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

// "Where to look": for every piece, the search pages of the big marketplaces side by side with the
// markets nearby; where the archive knows it, the maker that still produces it.
export default function WhereToFind({ object }) {
  const { t, lang } = useLanguage();
  const facts = PIECE_FACTS[object.id];
  const links = searchLinks(object, lang);

  return (
    <section className="container piece-section where-to-find" data-reveal>
      <div className="where-to-find__grid">
        <div className="where-to-find__online">
          <h2>{t("guide.where")}</h2>
          {facts?.manufacturerUrl && (
            <p className="where-to-find__maker">
              {facts.inProduction ? t("guide.inProduction") : t("guide.reissued")}{" "}
              <a href={facts.manufacturerUrl} target="_blank" rel="noreferrer">
                {hostOf(facts.manufacturerUrl) || object.brand} →
              </a>
            </p>
          )}
          <p className="where-to-find__label">{t("guide.searchOn")}</p>
          <ul className="where-to-find__links">
            {links.map((link) => (
              <li key={link.id}>
                <a href={link.url} target="_blank" rel="noreferrer">
                  {link.label} <span aria-hidden="true">↗</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="where-to-find__near">
          <NearbyMarkets title={t("nearby.titleShort")} />
        </div>
      </div>
    </section>
  );
}
