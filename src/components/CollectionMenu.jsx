import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { useCollection } from "../lib/collection.js";
import { useCollectionAction } from "../lib/useRoomToggle.js";
import "./CollectionMenu.css";

const ORDER = ["saved", "own", "want", "seen"];
const MENU_WIDTH = 208;

export function HeartIcon({ filled, size = 15 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M12 20.5s-7.5-4.6-10-9.3C.4 7.8 2 4.5 5.4 4c2-.3 3.8.6 5 2.3l1.6 2.1 1.6-2.1c1.2-1.7 3-2.6 5-2.3C22 4.5 23.6 7.8 22 11.2c-2.5 4.7-10 9.3-10 9.3Z" />
    </svg>
  );
}

// The heart, grown into a small menu: "Save / I own it / Looking for / Seen", and "Remove" once
// the piece is in the collection. The menu is drawn at the top of the page (a portal), so a card
// that clips its content — a scrolling row, a framed tile — never cuts it off. `children` replaces
// the heart with a caption (the collection page's "Change state").
export default function CollectionMenu({ object, className = "", children }) {
  const { t } = useLanguage();
  const items = useCollection();
  const act = useCollectionAction();
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const current = items.find((item) => item.id === object.id)?.status ?? null;
  const label = current ? `${t(`collection.status.${current}`)}: ${object.name}` : `${t("collection.add")}: ${object.name}`;

  // The menu follows its button while the page scrolls or resizes, and closes once the button
  // has left the screen.
  useLayoutEffect(() => {
    if (!open) return undefined;
    const follow = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect || rect.bottom < 0 || rect.top > window.innerHeight) {
        setOpen(false);
        return;
      }
      const left = Math.min(Math.max(8, rect.right - MENU_WIDTH), window.innerWidth - MENU_WIDTH - 8);
      const below = rect.bottom + 6;
      // Opens upwards when there is no room below (the last row of a grid, a phone's keyboard).
      const height = menuRef.current?.offsetHeight ?? 220;
      setPlace({ left, top: below + height > window.innerHeight - 8 ? Math.max(8, rect.top - height - 6) : below });
    };
    follow();
    window.addEventListener("scroll", follow, { passive: true, capture: true });
    window.addEventListener("resize", follow);
    return () => {
      window.removeEventListener("scroll", follow, { capture: true });
      window.removeEventListener("resize", follow);
    };
  }, [open]);

  // Once it is in place, the keyboard lands on the current state (or the first choice).
  const placed = open && Boolean(place);
  useEffect(() => {
    if (placed) menuRef.current?.querySelector('[aria-checked="true"], [role^="menuitem"]')?.focus({ preventScroll: true });
  }, [placed]);

  useEffect(() => {
    if (!open) return undefined;
    const close = () => setOpen(false);
    const onDown = (e) => {
      if (!menuRef.current?.contains(e.target) && !buttonRef.current?.contains(e.target)) close();
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        close();
        buttonRef.current?.focus();
        return;
      }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      const options = [...menuRef.current.querySelectorAll("button")];
      const i = options.indexOf(document.activeElement);
      options[(i + (e.key === "ArrowDown" ? 1 : -1) + options.length) % options.length]?.focus();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(status) {
    setOpen(false);
    buttonRef.current?.focus();
    act(object, status);
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`${className}${current ? " is-added" : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={current ? t(`collection.status.${current}`) : t("collection.add")}
        onClick={() => setOpen((value) => !value)}
      >
        {children ?? <HeartIcon filled={Boolean(current)} />}
      </button>
      {open &&
        createPortal(
          <div ref={menuRef} className="collection-menu" role="menu" aria-label={t("collection.add")} style={{ ...(place ?? { visibility: "hidden" }), width: MENU_WIDTH }}>
            {ORDER.map((status) => (
              <button key={status} type="button" role="menuitemradio" aria-checked={current === status} onClick={() => choose(status)}>
                <span className={`collection-menu__dot is-${status}`} aria-hidden="true" />
                {t(`collection.action.${status}`)}
              </button>
            ))}
            {current && (
              <button type="button" role="menuitem" className="collection-menu__remove" onClick={() => choose(null)}>
                {t("collection.action.remove")}
              </button>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
