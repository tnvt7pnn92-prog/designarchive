import { useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "../../i18n/LanguageContext.jsx";

// Names typed in the empty field, one after the other, as examples of what can be searched.
const HINTS = ["Arco Lamp", "Eames", "Gio Ponti", "Wassily", "Castiglioni", "Panton", "Superleggera"];

// The hero's search: Enter opens the archive with the query; while typing, the first five pieces
// that match appear below (the catalogue loads on the first keystroke, not with the page).
export default function HeroSearch({ still }) {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const id = useId();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState([]);
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const typed = useRef(null);
  const box = useRef(null);
  const catalogue = useRef(null);
  // Below two letters there is nothing to suggest.
  const shownHits = query.trim().length < 2 ? [] : hits;

  // The typed examples, letter by letter, while the field is empty and not in use.
  useEffect(() => {
    const el = typed.current;
    if (!el) return undefined;
    const prefix = t("home.typedPrefix");
    if (still) {
      el.textContent = t("home.searchPlaceholder");
      return undefined;
    }
    let hint = 0;
    let chars = 0;
    let dir = 1;
    let timer = 0;
    const tick = () => {
      const word = HINTS[hint];
      chars += dir;
      el.textContent = `${prefix} ${word.slice(0, chars)}`;
      if (chars === word.length) {
        dir = -1;
        timer = setTimeout(tick, 1400);
        return;
      }
      if (chars === 0) {
        dir = 1;
        hint = (hint + 1) % HINTS.length;
      }
      timer = setTimeout(tick, dir > 0 ? 85 : 35);
    };
    timer = setTimeout(tick, 1200);
    return () => clearTimeout(timer);
  }, [still, t]);

  // The suggestions follow the query.
  useEffect(() => {
    const text = query.trim();
    if (text.length < 2) return undefined;
    let alive = true;
    catalogue.current ??= Promise.all([import("../../data/objects.js"), import("../../lib/archiveSearch.js")]);
    catalogue.current.then(([{ OBJECTS }, { makeSearch }]) => {
      if (!alive) return;
      const matches = makeSearch(text, OBJECTS, { lang });
      setHits(OBJECTS.filter(matches).slice(0, 5));
      setActive(-1);
    });
    return () => {
      alive = false;
    };
  }, [query, lang]);

  // A click anywhere else closes the list.
  useEffect(() => {
    if (!open) return undefined;
    const away = (event) => {
      if (!box.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  function submit(event) {
    event.preventDefault();
    if (active >= 0 && shownHits[active]) {
      navigate(`/piece/${shownHits[active].id}`);
      return;
    }
    const q = query.trim();
    navigate(q ? `/archive?q=${encodeURIComponent(q)}` : "/archive");
  }

  function keys(event) {
    if (event.key === "Escape") {
      setOpen(false);
      setActive(-1);
    } else if (event.key === "ArrowDown" && shownHits.length) {
      event.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % shownHits.length);
    } else if (event.key === "ArrowUp" && shownHits.length) {
      event.preventDefault();
      setActive((i) => (i <= 0 ? shownHits.length - 1 : i - 1));
    }
  }

  const showList = open && shownHits.length > 0;
  return (
    <div className="home-search" ref={box}>
      <form role="search" onSubmit={submit}>
        <input
          type="search"
          role="combobox"
          aria-label={t("home.searchButton")}
          aria-expanded={showList}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${id}-${active}` : undefined}
          autoComplete="off"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setFocused(true);
            setOpen(true);
          }}
          onBlur={() => setFocused(false)}
          onKeyDown={keys}
        />
        <span ref={typed} className="home-search__typed" aria-hidden="true" hidden={Boolean(query) || focused} />
        <button type="submit" className="home-btn home-btn--gold">
          {t("home.searchButton")}
        </button>
      </form>
      <ul id={`${id}-list`} className="home-search__list" role="listbox" hidden={!showList}>
        {shownHits.map((piece, i) => (
          <li key={piece.id} id={`${id}-${i}`} role="option" aria-selected={i === active}>
            <Link to={`/piece/${piece.id}`} tabIndex={-1}>
              {piece.name}
              <span>
                {piece.designer}, {piece.year}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
