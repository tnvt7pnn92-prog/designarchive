import { useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { resetPassword } from "../lib/account.js";
import { passwordProblem } from "../lib/signup.js";
import { siteTitle } from "../lib/seo.js";
import { useDocumentMeta } from "../lib/useDocumentMeta.js";
import "../components/AuthDialog.css";
import "./SignIn.css";

const PROBLEM_KEY = { short: "passwordShort", long: "passwordLong", weak: "passwordWeak" };

// /nuova-password#token=… — the page the reset email links to. The token travels after "#", so
// it never reaches a server log; it is read once and removed from the address bar.
export default function NewPassword() {
  const { t } = useLanguage();
  useDocumentMeta({ title: siteTitle(t("auth.newPasswordTitle")) });
  const [token] = useState(() => {
    const value = new URLSearchParams(window.location.hash.slice(1)).get("token");
    if (value) window.history.replaceState(null, "", window.location.pathname);
    return value;
  });
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState(null);
  const [phase, setPhase] = useState("form"); // form | sending | done

  async function submit(e) {
    e.preventDefault();
    const problem = passwordProblem(password);
    if (problem) return setError(PROBLEM_KEY[problem]);
    if (password !== again) return setError("passwordsDiffer");
    setError(null);
    setPhase("sending");
    const result = await resetPassword(token, password);
    if (result.error) {
      setPhase("form");
      setError(result.error.code === "reset_expired" ? "resetExpired" : result.error.errors?.password ?? "generic");
      return;
    }
    setPhase("done");
  }

  return (
    <div className="signin-page container is-single">
      <section className="signin-main">
        <span className="eyebrow">{t("account.eyebrow")}</span>
        <h1>{t("auth.newPasswordTitle")}</h1>
        {!token ? (
          <p className="auth-dialog__notice">
            {t("auth.errors.resetExpired")} <Link to="/accedi">{t("header.signIn")} →</Link>
          </p>
        ) : phase === "done" ? (
          <div className="auth-dialog__sent" role="status">
            <strong>{t("auth.newPasswordDone")}</strong>
            <p>
              <Link to="/accedi">{t("header.signIn")} →</Link>
            </p>
          </div>
        ) : (
          <form className="auth-form auth-dialog__form" onSubmit={submit} noValidate>
            <div className="auth-field">
              <label htmlFor="new-password">{t("auth.password")}</label>
              <input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <small className="auth-field__hint">{t("auth.passwordHint")}</small>
            </div>
            <div className="auth-field">
              <label htmlFor="new-password-again">{t("auth.passwordAgain")}</label>
              <input id="new-password-again" type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} />
            </div>
            <button type="submit" className="auth-dialog__google" disabled={phase === "sending"}>
              {phase === "sending" ? t("auth.sending") : t("auth.newPasswordSave")}
            </button>
            {error && (
              <p className="auth-dialog__error" role="alert">
                {t(`auth.errors.${error}`)}
              </p>
            )}
          </form>
        )}
      </section>
    </div>
  );
}
