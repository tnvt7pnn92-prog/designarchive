import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../i18n/LanguageContext.jsx";
import { clamp, lerp } from "../../lib/frameLoop.js";
import { useScene } from "./useScene.js";

// Two ribbons of classics running in opposite directions: gold names above, outlined years and
// names below. Scrolling speeds them up and leans them with the speed; a pointer or keyboard
// focus on a ribbon slows it down so a name can be picked. Each list is there twice, so the loop
// has no seam (the copy is hidden from screen readers and the keyboard).
export default function RibbonPair({ pieces, still }) {
  const { t } = useLanguage();
  const section = useRef(null);
  const motion = useRef({ lastY: null, vel: 0, rows: [] });
  const half = Math.ceil(pieces.length / 2);
  const rows = [pieces.slice(0, half), pieces.slice(half)];

  useEffect(() => {
    const remeasure = () => motion.current.rows.forEach((row) => (row.half = 0));
    window.addEventListener("resize", remeasure);
    // The names change width when the serif font arrives.
    document.fonts?.ready.then(remeasure);
    return () => window.removeEventListener("resize", remeasure);
  }, []);

  useScene(
    section,
    (el) => {
      const m = motion.current;
      const y = window.scrollY;
      m.vel = lerp(m.vel, m.lastY === null ? 0 : y - m.lastY, 0.12);
      m.lastY = y;
      el.querySelectorAll(".home-ribbon__row").forEach((row, i) => {
        const state = (m.rows[i] ??= { x: 0, speed: 1, half: 0 });
        const held = row.matches(":hover, :focus-within");
        state.speed = lerp(state.speed, held ? 0.08 : 1, 0.08);
        // Measured once (and again after a resize), not on every frame.
        state.half ||= row.scrollWidth / 2;
        const half = state.half;
        state.x += (i % 2 ? 1 : -1) * state.speed * (0.6 + Math.min(Math.abs(m.vel) * 0.35, 18));
        if (state.x <= -half) state.x += half;
        if (state.x > 0) state.x -= half;
        row.style.transform = `translate3d(${state.x}px, 0, 0) skewX(${clamp(m.vel * -0.4, -12, 12) * state.speed}deg)`;
      });
    },
    still
  );

  return (
    <section ref={section} className="home-ribbons" aria-label={t("home.ribbonLabel")}>
      {rows.map((row, r) => (
        <div key={r} className={`home-ribbon__row${r ? " home-ribbon__row--outline" : ""}`}>
          {[0, 1].map((copy) => (
            <p key={copy} aria-hidden={copy === 1 || undefined}>
              {row.map((piece) => (
                <Link key={piece.id} to={`/piece/${piece.id}`} tabIndex={copy === 1 ? -1 : undefined}>
                  {r ? `${piece.year} · ${piece.name}` : piece.name}
                </Link>
              ))}
            </p>
          ))}
        </div>
      ))}
    </section>
  );
}
