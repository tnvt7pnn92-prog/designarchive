import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { NAV_ITEMS } from "../lib/nav.js";
import SiteMenu from "./SiteMenu.jsx";
import HeaderAccount from "./HeaderAccount.jsx";
import "./Header.css";

// The global search carries the whole catalogue; it loads the first time someone opens it.
const CommandPalette = lazy(() => import("./CommandPalette.jsx"));

// Logo and sections on the left; search, sign in / sign up and the one menu on the right.
export default function Header() {
  const { t } = useLanguage();

  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchButtonRef = useRef(null);
  const onMenuChange = useCallback((next) => setMenuOpen(next), []);

  // Any navigation closes the menu, including Back/Forward.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMenuOpen(false);
  }

  // Ctrl+K / Cmd+K opens the global search from anywhere.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setMenuOpen(false);
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function closeSearch() {
    setSearchOpen(false);
    searchButtonRef.current?.focus();
  }

  return (
    <header className={`site-header${menuOpen ? " has-menu" : ""}`}>
      <div className="container site-header__inner">
        <NavLink to="/" className="site-header__logo" onClick={() => setMenuOpen(false)}>
          Design Archive
        </NavLink>

        <nav className="site-header__nav" aria-label={t("a11y.mainNav")}>
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `site-header__link${isActive ? " is-active" : ""}`}>
              {t(item.key)}
            </NavLink>
          ))}
        </nav>

        <div className="site-header__actions">
          <button
            ref={searchButtonRef}
            type="button"
            className="site-header__icon-btn"
            aria-label={t("nav.search")}
            aria-haspopup="dialog"
            aria-keyshortcuts="Control+K Meta+K"
            title={`${t("nav.search")} (Ctrl K)`}
            onClick={() => {
              setMenuOpen(false);
              setSearchOpen(true);
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </button>
          <HeaderAccount />
          <SiteMenu open={menuOpen} onOpenChange={onMenuChange} />
        </div>
      </div>

      {searchOpen && (
        <Suspense fallback={null}>
          <CommandPalette onClose={closeSearch} />
        </Suspense>
      )}
    </header>
  );
}
