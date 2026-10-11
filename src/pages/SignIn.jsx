import { Navigate, useNavigate } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { authProvider, useAuth } from "../lib/auth.js";
import { ledeFor } from "../components/AuthDialog.jsx";
import { siteTitle } from "../lib/seo.js";
import { useDocumentMeta } from "../lib/useDocumentMeta.js";
import AuthForm from "../components/AuthForm.jsx";
import "./SignIn.css";

// /registrati and /accedi: the same form as the dialog, on a page of its own (for links in emails,
// posts and bookmarks), next to what an account gives.
export default function SignIn({ mode = "signup" }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { status } = useAuth();
  useDocumentMeta({ title: siteTitle(mode === "signup" ? t("header.signUp") : t("header.signIn")), description: ledeFor("signup", t) });
  if (status === "signedIn") return <Navigate to="/account" replace />;

  const benefits = [t("signin.benefits.sync"), t("signin.benefits.share"), t("signin.benefits.merge")];

  return (
    <div className={`signin-page container${authProvider === "supabase" ? "" : " is-single"}`}>
      <section className="signin-main">
        <span className="eyebrow">{mode === "signup" ? t("auth.signupEyebrow") : t("account.eyebrow")}</span>
        <h1>{mode === "signup" ? t("auth.signupTitle") : t("auth.signinTitle")}</h1>
        <p className="signin-lede">{ledeFor(mode, t)}</p>
        <AuthForm mode={mode} onModeChange={(next) => navigate(next === "signup" ? "/registrati" : "/accedi", { replace: true })} autoFocus={false} />
      </section>

      {/* What an account adds is true of the Supabase service (synced collections, shared
          moodboards); accounts on Railway keep the collections in the browser, so the list is not
          shown. */}
      {authProvider === "supabase" && (
        <aside className="signin-side">
          <div className="signin-card">
            <h2>{t("signin.freeTitle")}</h2>
            <ul className="signin-list">
              {benefits.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        </aside>
      )}
    </div>
  );
}
