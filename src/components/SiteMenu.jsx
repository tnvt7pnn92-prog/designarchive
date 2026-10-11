import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { LANGUAGE_NAMES } from "../i18n/dictionaries.js";
import { useAuth, signOut } from "../lib/auth.js";
import { openAuth } from "../lib/authDialog.js";
import { useCollection } from "../lib/collection.js";
import { updateProfile } from "../lib/profile.js";
import { ACCOUNT_ITEMS, ACCOUNT_PAGE, NAV_ITEMS, SECONDARY_ITEMS } from "../lib/nav.js";
import "./SiteMenu.css";

// Below this width the sections leave the bar and the menu becomes a full-screen sheet.
const SHEET = "(max-width: 1100px)";

// Small line icons for the rows of the menu.
const ICONS = {
  collection: "M7 4h10v16l-5-3.5L7 20Z",
  account: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8c1.2-3.6 3.8-5.5 7-5.5s5.8 1.9 7 5.5",
  designers: "M4 20c.8-3.4 3-5.2 6-5.2s5.2 1.8 6 5.2M10 12a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2ZM16 5.2a3.3 3.3 0 0 1 0 6.4M20 19c-.4-2.2-1.5-3.6-3-4.3",
  language: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-9-9h18M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.6 12 3Z",
  signOut: "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10",
};

function Icon({ name }) {
  return (
    <svg className="site-menu__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

function Chevron({ back = false }) {
  return (
    <svg className="site-menu__chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={back ? "m15 5-7 7 7 7" : "m9 5 7 7-7 7"} />
    </svg>
  );
}

// The one menu of the header (the pattern of Airbnb and most large sites): a single button with
// the avatar opens it; inside are the sections (on phones and tablets), "Your space", the rest of
// the site and the language — one row that opens its own short list, in place. The bar itself
// keeps only search, sign in / sign up and this button.
export default function SiteMenu({ open, onOpenChange }) {
  const { t, lang, setLang, languages } = useLanguage();
  const { status, user } = useAuth();
  const collection = useCollection();
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const langRowRef = useRef(null);
  const langListRef = useRef(null);
  // "main", or "lang": the list of languages, which replaces the menu in the same panel.
  const [view, setView] = useState("main");
  if (!open && view !== "main") setView("main");

  const signedIn = status === "signedIn";
  const initial = (user?.user_metadata?.full_name || user?.email || "").trim().charAt(0).toUpperCase();
  const counts = { "/collection": collection.length };
  const close = () => onOpenChange(false);

  useEffect(() => {
    if (!open) return undefined;
    panelRef.current?.focus({ preventScroll: true });
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      onOpenChange(false);
      buttonRef.current?.focus();
    };
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    // As a full-screen sheet, the page behind stays still (and its floating buttons step aside).
    const root = document.documentElement;
    const overflow = root.style.overflow;
    if (window.matchMedia(SHEET).matches) root.style.overflow = "hidden";
    root.classList.add("has-site-menu");
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
      root.style.overflow = overflow;
      root.classList.remove("has-site-menu");
    };
  }, [open, onOpenChange]);

  // Moving between the two views keeps the keyboard where the eye goes.
  useEffect(() => {
    if (!open) return;
    if (view === "lang") langListRef.current?.querySelector("[aria-checked='true']")?.focus();
  }, [open, view]);

  function backToMenu() {
    setView("main");
    requestAnimationFrame(() => langRowRef.current?.focus());
  }

  function pickLanguage(code) {
    setLang(code);
    if (signedIn) updateProfile({ lang: code });
    backToMenu();
  }

  const auth = (mode) => {
    close();
    openAuth("menu", mode);
  };

  return (
    <div className="site-menu" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`site-menu__button${open ? " is-open" : ""}`}
        aria-expanded={open}
        aria-controls="site-menu"
        aria-label={open ? t("a11y.closeMenu") : signedIn ? t("account.menuSignedIn", { email: user.email ?? "" }) : t("a11y.openMenu")}
        onClick={() => onOpenChange(!open)}
      >
        <span className="site-menu__lines" aria-hidden="true">
          <span />
          <span />
        </span>
        <span className={`site-menu__avatar${signedIn && initial ? " has-initial" : ""}`} aria-hidden="true">
          {signedIn && initial ? (
            initial
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
            </svg>
          )}
        </span>
        {!signedIn && collection.length > 0 && (
          <span className="site-menu__badge" aria-hidden="true">
            {collection.length}
          </span>
        )}
      </button>

      <div id="site-menu" ref={panelRef} tabIndex={-1} className={`site-menu__panel${open ? " is-open" : ""}${view === "lang" ? " is-lang" : ""}`}>
        {view === "lang" ? (
          <div className="site-menu__view" key="lang">
            <button type="button" className="site-menu__back" onClick={backToMenu}>
              <Chevron back />
              <span>{t("header.language")}</span>
            </button>
            <div className="site-menu__langs" role="radiogroup" aria-label={t("header.language")} ref={langListRef}>
              {languages.map((code) => (
                <button
                  key={code}
                  type="button"
                  role="radio"
                  lang={code}
                  className="site-menu__lang"
                  aria-checked={code === lang}
                  onClick={() => pickLanguage(code)}
                >
                  <span className="site-menu__lang-name">{LANGUAGE_NAMES[code]}</span>
                  <span className="site-menu__lang-code">{code.toUpperCase()}</span>
                  <svg className="site-menu__check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m5 12.5 4.5 4.5L19 7.5" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="site-menu__view" key="main">
            {/* Who is here */}
            <div className="site-menu__head">
              {signedIn ? (
                <div className="site-menu__who">
                  <span className="site-menu__who-avatar" aria-hidden="true">
                    {initial || "·"}
                  </span>
                  <p>
                    <strong>{user.user_metadata?.full_name || user.email}</strong>
                    {user.user_metadata?.full_name && <span>{user.email}</span>}
                  </p>
                </div>
              ) : (
                <>
                  <p className="site-menu__note">{t("account.guestNote")}</p>
                  {/* On phones "Sign in" is not in the bar: it is here, with sign up. */}
                  <div className="site-menu__auth">
                    <button type="button" className="site-menu__signup" onClick={() => auth("signup")}>
                      {t("header.signUpFree")}
                    </button>
                    <button type="button" className="site-menu__signin" onClick={() => auth("signin")}>
                      {t("header.signIn")}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* The sections, when they are not in the bar */}
            <nav className="site-menu__sections" aria-label={t("a11y.mainNav")}>
              {NAV_ITEMS.map((item, i) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `site-menu__section${isActive ? " is-active" : ""}`}
                  style={{ "--i": i }}
                  onClick={close}
                >
                  <span className="site-menu__index" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {t(item.key)}
                </NavLink>
              ))}
            </nav>

            {/* The collection and the designers, together under the sections. */}
            <div className="site-menu__group">
              {ACCOUNT_ITEMS.map((item) => (
                <Link key={item.to} to={item.to} className="site-menu__item" onClick={close}>
                  <Icon name={item.to.slice(1)} />
                  <span className="site-menu__text">{t(item.key)}</span>
                  {counts[item.to] > 0 && <span className="site-menu__count">{counts[item.to]}</span>}
                </Link>
              ))}
              {SECONDARY_ITEMS.map((item) => (
                <Link key={item.to} to={item.to} className="site-menu__item" onClick={close}>
                  <Icon name={item.to.slice(1)} />
                  <span className="site-menu__text">{t(item.key)}</span>
                </Link>
              ))}
            </div>

            {/* At the foot: the account, signing out, and the language last. */}
            <div className="site-menu__group">
              <Link to={ACCOUNT_PAGE.to} className="site-menu__item" onClick={close}>
                <Icon name="account" />
                <span className="site-menu__text">{t(ACCOUNT_PAGE.key)}</span>
              </Link>
              {signedIn && (
                <button
                  type="button"
                  className="site-menu__item"
                  onClick={() => {
                    close();
                    signOut();
                  }}
                >
                  <Icon name="signOut" />
                  <span className="site-menu__text">{t("account.signOut")}</span>
                </button>
              )}
              <button
                ref={langRowRef}
                type="button"
                className="site-menu__item"
                onClick={() => setView("lang")}
              >
                <Icon name="language" />
                <span className="site-menu__text">{t("header.language")}</span>
                <span className="site-menu__value" lang={lang}>
                  {LANGUAGE_NAMES[lang]}
                </span>
                <Chevron />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}