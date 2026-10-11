import { Component } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { revealApp } from "../lib/handoff.js";
import "./ErrorBoundary.css";

function ErrorMessage({ chunk }) {
  const { t } = useLanguage();
  return (
    <div className="error-state container" role="alert">
      <span className="eyebrow">{t("error.eyebrow")}</span>
      <h1>{t("error.title")}</h1>
      {/* A page that failed to download (usually a new version went live, or the connection
          dropped) is fixed by reloading; anything else, by starting again from home. */}
      <p>{chunk ? t("error.chunk") : t("error.text")}</p>
      <div className="error-state__actions">
        <button type="button" className="btn" onClick={() => window.location.reload()}>
          {t("error.reload")}
        </button>
        <Link to="/" className="error-state__home" reloadDocument>
          {t("notFound.home")}
        </Link>
      </div>
    </div>
  );
}

// Catches a page that throws while rendering or fails to load, so the header and footer stay
// and the visitor gets a way out instead of a blank screen. App gives it a key per path, so
// moving to another page tries again.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error(error);
    // On a first visit the prerendered page is still on screen: show the message instead.
    revealApp();
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const chunk = /dynamically imported module|Importing a module script failed|Loading chunk/i.test(String(error?.message));
    return <ErrorMessage chunk={chunk} />;
  }
}
