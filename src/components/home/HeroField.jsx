import { useEffect, useRef } from "react";
import { onFrame, pointer, clamp, lerp } from "../../lib/frameLoop.js";

// Four soft lights, gold, bronze and teal, drifting behind the hero and leaning towards the
// pointer. A small 2D canvas stretched to the hero: it only paints while the hero is on screen, and
// once, standing still, with reduced motion.
const LIGHTS = [
  { x: 0.72, y: 0.38, r: 0.55, c: "201,164,77", a: 0.32, s: 0.00011 },
  { x: 0.2, y: 0.82, r: 0.5, c: "140,92,50", a: 0.26, s: 0.00008 },
  { x: 0.92, y: 0.92, r: 0.42, c: "111,156,149", a: 0.14, s: 0.00013 },
  { x: 0.45, y: 0.08, r: 0.34, c: "201,164,77", a: 0.14, s: 0.00017 },
];

export default function HeroField({ still }) {
  const canvas = useRef(null);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!ctx) return undefined;
    let w = 0;
    let h = 0;
    const lean = { x: 0.6, y: 0.45 };
    // Where the canvas sits, measured on resize and scroll rather than on every frame.
    let r = el.getBoundingClientRect();
    const measure = () => (r = el.getBoundingClientRect());
    const size = () => {
      measure();
      // The lights are soft gradients: a third of the resolution looks the same once the browser
      // scales it up, and costs a tenth of the painting.
      const k = 0.33;
      w = el.width = Math.round(r.width * k);
      h = el.height = Math.round(r.height * k);
    };
    const draw = (time) => {
      if (!still) {
        lean.x = lerp(lean.x, clamp((pointer.x - r.left) / r.width), 0.04);
        lean.y = lerp(lean.y, clamp((pointer.y - r.top) / r.height), 0.04);
      }
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      LIGHTS.forEach((light, i) => {
        const x = (light.x + Math.sin(time * light.s + i) * 0.07 + (lean.x - 0.5) * (0.14 + i * 0.03)) * w;
        const y = (light.y + Math.cos(time * light.s * 1.3 + i) * 0.06 + (lean.y - 0.5) * (0.12 + i * 0.02)) * h;
        const g = ctx.createRadialGradient(x, y, 0, x, y, light.r * Math.max(w, h));
        g.addColorStop(0, `rgba(${light.c},${light.a})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      });
    };
    size();
    draw(0);
    const resize = () => {
      size();
      draw(performance.now());
    };
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", measure, { passive: true });
    if (still)
      return () => {
        window.removeEventListener("resize", resize);
        window.removeEventListener("scroll", measure);
      };

    let stop = null;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !stop) stop = onFrame(draw);
      else if (!entry.isIntersecting && stop) {
        stop();
        stop = null;
      }
    });
    io.observe(el);
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", measure);
      io.disconnect();
      stop?.();
    };
  }, [still]);

  return <canvas ref={canvas} className="home-hero__field" aria-hidden="true" />;
}
