import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../i18n/LanguageContext.jsx";
import { onFrame, lerp } from "../../lib/frameLoop.js";
import SmartImage from "../SmartImage.jsx";
import Label from "../Label.jsx";

const CRUISE = 0.0045;

// The hero's pieces on a turntable: the makers' cut-out photos, each on its own ground, turning in
// 3D. The pointer's side sets the speed and direction, a drag spins it by hand, and the piece in
// front shows its label. Every piece is a link to its page (a drag never opens one). Standing still,
// with reduced motion, the six pieces are laid out on the same ring.
export default function HeroOrbit({ pieces, still }) {
  const { t } = useLanguage();
  const ring = useRef(null);

  useEffect(() => {
    const el = ring.current;
    if (!el) return undefined;
    const items = [...el.querySelectorAll(".home-orbit__item")];
    const n = items.length;
    const state = { angle: 0, speed: CRUISE, target: CRUISE, drag: null, moved: 0, front: null };

    const place = () => {
      const R = el.clientWidth * (window.innerWidth < 560 ? 0.34 : 0.36);
      let front = null;
      let best = -Infinity;
      items.forEach((item, i) => {
        const a = state.angle + (i / n) * Math.PI * 2;
        const z = Math.cos(a);
        const depth = (z + 1) / 2;
        item.style.transform = `translate(-50%, -50%) translate3d(${Math.sin(a) * R}px, ${(1 - depth) * -46}px, 0) scale(${0.58 + depth * 0.46}) rotateY(${Math.sin(a) * -18}deg)`;
        item.style.opacity = (0.35 + depth * 0.65).toFixed(3);
        item.style.zIndex = String(Math.round(depth * 100));
        if (z > best) {
          best = z;
          front = item;
        }
      });
      if (front !== state.front) {
        state.front = front;
        items.forEach((item) => item.classList.toggle("is-front", item === front));
      }
    };
    place();
    const resize = () => place();
    window.addEventListener("resize", resize);
    if (still) return () => window.removeEventListener("resize", resize);

    const stop = onFrame(() => {
      if (!state.drag) {
        state.speed = lerp(state.speed, state.target, 0.04);
        state.angle += state.speed;
      }
      place();
    });

    const move = (event) => {
      if (state.drag) {
        const dx = event.clientX - state.drag;
        state.drag = event.clientX;
        state.moved += Math.abs(dx);
        state.angle += dx * 0.006;
        state.speed = dx * 0.006;
        return;
      }
      if (event.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      state.target = ((event.clientX - r.left) / r.width - 0.5) * 0.02 || CRUISE;
    };
    const down = (event) => {
      if (event.button !== 0) return;
      state.drag = event.clientX;
      state.moved = 0;
    };
    const up = () => {
      if (state.drag === null) return;
      state.drag = null;
      state.target = Math.sign(state.speed || 1) * CRUISE;
    };
    const leave = () => {
      state.target = CRUISE;
      state.drag = null;
    };
    // A piece that was dragged is not opened.
    const click = (event) => {
      if (state.moved > 6) {
        event.preventDefault();
        state.moved = 0;
      }
    };
    // Keyboard focus brings the piece to the front.
    const focus = (event) => {
      const i = items.indexOf(event.target.closest(".home-orbit__item"));
      if (i < 0) return;
      state.angle = -(i / n) * Math.PI * 2;
      state.target = 0;
      state.speed = 0;
    };
    const blur = () => (state.target = CRUISE);

    el.addEventListener("pointermove", move);
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("click", click, true);
    el.addEventListener("focusin", focus);
    el.addEventListener("focusout", blur);
    return () => {
      stop();
      window.removeEventListener("resize", resize);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      el.removeEventListener("pointerleave", leave);
      el.removeEventListener("click", click, true);
      el.removeEventListener("focusin", focus);
      el.removeEventListener("focusout", blur);
    };
  }, [still]);

  return (
    <div
      ref={ring}
      className="home-orbit"
      role="group"
      aria-label={t("home.orbitLabel")}
    >
      <span className="home-orbit__floor" aria-hidden="true" />
      {pieces.map((piece) => (
        <Link key={piece.id} to={`/piece/${piece.id}`} className="home-orbit__item" draggable={false}>
          <SmartImage src={piece.image} card cutout={piece.cutout} category={piece.category} className="home-orbit__photo" draggable={false} />
          <Label className="home-orbit__label" status={piece.country} nameAs="p" name={piece.name} />
        </Link>
      ))}
    </div>
  );
}
