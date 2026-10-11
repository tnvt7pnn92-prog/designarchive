import { Link } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { siteTitle } from "../lib/seo.js";
import { useDocumentMeta } from "../lib/useDocumentMeta.js";
import "./Privacy.css";

const SECTIONS = ["summary", "local", "account", "why", "who", "retention", "rights", "cookies", "contact"];

// What is kept, why, where and for how long — in plain words, section by section.
export default function Privacy() {
  const { t } = useLanguage();
  useDocumentMeta({ title: siteTitle(t("nav.privacy")), description: t("privacy.summaryText") });

  return (
    <article className="privacy-page container">
      <header className="privacy-hero">
        <span className="eyebrow">{t("privacy.eyebrow")}</span>
        <h1>{t("privacy.title")}</h1>
        <p>{t("privacy.updated")}</p>
      </header>
      <div className="privacy-body">
        {SECTIONS.map((section) => (
          <section key={section} id={section}>
            <h2>{t(`privacy.${section}Title`)}</h2>
            <p>{t(`privacy.${section}Text`)}</p>
          </section>
        ))}
        <p className="privacy-links">
          <Link to="/account">{t("privacy.manageData")} →</Link>
        </p>
      </div>
    </article>
  );
}
