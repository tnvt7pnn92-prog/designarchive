import { Link } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { useAuth } from "../lib/auth.js";
import { openAuth } from "../lib/authDialog.js";

// Plain left clicks open the dialog over the page; anything else (new tab, keyboard shortcuts)
// follows the link to the full page.
const openInPlace = (mode) => (event) => {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  openAuth("menu", mode);
};

// Guests see "Sign in" and "Sign up" in the bar; signed-in visitors find their account in the menu.
export default function HeaderAccount() {
  const { t } = useLanguage();
  const { status } = useAuth();

  if (status === "loading" || status === "signedIn") return null;

  return (
    <>
      <Link to="/accedi" className="header-signin" onClick={openInPlace("signin")}>
        {t("header.signIn")}
      </Link>
      <Link to="/registrati" className="header-cta" onClick={openInPlace("signup")}>
        {t("header.signUp")}
      </Link>
    </>
  );
}
