import { useEffect, useState } from "react";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { authProvider, useAuth } from "../lib/auth.js";
import { closeAuth, useAuthDialog } from "../lib/authDialog.js";
import AuthForm from "./AuthForm.jsx";
import "./AuthDialog.css";

const REASONS = ["menu", "favourites", "moodboards", "wishlist"];

// The line under the title: with an email link (Supabase) or with a password (Railway, and the
// form shown while no service is connected).
export const ledeFor = (mode, t) =>
  authProvider === "supabase" ? (mode === "signup" ? t("auth.signupLede") : t("auth.lede")) : mode === "signup" ? t("auth.signupLedeAccount") : t("auth.ledeAccount");

// Sign up or sign in, over the page: opened by the header, the nudges and the features that need
// an account (a shared moodboard link).
export default function AuthDialog() {
  const { open, reason, mode } = useAuthDialog();
  const { status } = useAuth();
  // Signed in (e.g. the link opened in another tab): close for good, so a later sign-out does not
  // bring the dialog back.
  useEffect(() => {
    if (open && status === "signedIn") closeAuth();
  }, [open, status]);
  if (!open || status === "signedIn") return null;
  return <Dialog reason={REASONS.includes(reason) ? reason : "menu"} initialMode={mode} />;
}

function Dialog({ reason, initialMode }) {
  const { t } = useLanguage();
  const [mode, setMode] = useState(initialMode === "signin" ? "signin" : "signup");

  useEffect(() => {
    const previous = document.activeElement;
    const onKey = (e) => {
      if (e.key === "Escape") closeAuth();
    };
    window.addEventListener("keydown", onKey);
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      root.style.overflow = overflow;
      previous?.focus?.();
    };
  }, []);

  // A reason-specific headline for nudges; the header buttons get plain "sign up" / "sign in".
  const title = reason !== "menu" ? t(`auth.title.${reason}`) : mode === "signup" ? t("auth.signupTitle") : t("auth.signinTitle");

  return (
    <div className="auth-dialog" onMouseDown={(e) => e.target === e.currentTarget && closeAuth()}>
      <div className="auth-dialog__panel" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button type="button" className="auth-dialog__close" onClick={closeAuth} aria-label={t("lightbox.close")}>
          ×
        </button>
        <span className="eyebrow">{mode === "signup" ? t("auth.signupEyebrow") : t("account.eyebrow")}</span>
        <h2 id="auth-title">{title}</h2>
        <p className="auth-dialog__lede">{ledeFor(mode, t)}</p>
        <AuthForm mode={mode} onModeChange={setMode} onNavigate={closeAuth} />
      </div>
    </div>
  );
}
