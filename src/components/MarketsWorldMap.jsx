import { useEffect, useMemo, useRef, useState } from "react";
import { feature } from "topojson-client";
import landTopo from "world-atlas/land-110m.json";
import { KIND_COLORS } from "../lib/marketFilters.js";
import { cityNameOf } from "../lib/marketPaths.js";
import "./MarketsWorldMap.css";

// The world in one flat picture: the land (Natural Earth, 1:110m) and a dot for every place of the
// guide where it really is, in the colour of its kind. A light SVG, not a map to pan: hovering a dot
// names it, clicking opens its page. The dots sweep in from west to east the first time it is seen.
const W = 1000;
const TOP = 78;
const BOTTOM = -58;
const H = Math.round((W * (TOP - BOTTOM)) / 360);
const project = (lng, lat) => [((lng + 180) / 360) * W, ((TOP - lat) / (TOP - BOTTOM)) * H];

// The land as one path; a ring crossing the date line starts a new stroke instead of a line across.
function landPath() {
  const land = feature(landTopo, landTopo.objects.land);
  const rings = [];
  const collect = (geometry) => {
    if (geometry.type === "Polygon") rings.push(...geometry.coordinates);
    else if (geometry.type === "MultiPolygon") geometry.coordinates.forEach((polygon) => rings.push(...polygon));
  };
  (land.features ?? [land]).forEach((f) => collect(f.geometry));
  let d = "";
  for (const ring of rings) {
    let previous = null;
    for (const [lng, lat] of ring) {
      const [x, y] = project(lng, lat);
      d += `${!previous || Math.abs(x - previous) > W / 2 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
      previous = x;
    }
    d += "Z";
  }
  return d;
}

export default function MarketsWorldMap({ markets, onOpen, label, still }) {
  const box = useRef(null);
  const [width, setWidth] = useState(W);
  const [seen, setSeen] = useState(still);
  const [hover, setHover] = useState(null);
  const land = useMemo(() => landPath(), []);
  const dots = useMemo(() => markets.map((m) => ({ m, xy: project(m.lng, m.lat) })), [markets]);

  // Dots keep the same size on screen whatever the width of the picture.
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width || W));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (seen) return undefined;
    const el = box.current;
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && (setSeen(true), observer.disconnect()), { threshold: 0.25 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [seen]);

  const scale = W / Math.max(width, 1);
  const r = Math.min(3.2, (width < 600 ? 1.9 : 2.3) * scale);

  function pick(event) {
    const i = Number(event.target.dataset?.i);
    return Number.isInteger(i) ? dots[i] : null;
  }

  return (
    <div ref={box} className={`mwm${seen ? " is-in" : ""}`}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} onPointerOver={(e) => setHover(pick(e))} onPointerLeave={() => setHover(null)} onClick={(e) => pick(e) && onOpen(pick(e).m)}>
        <path className="mwm__land" d={land} />
        <g>
          {dots.map(({ m, xy: [x, y] }, i) => (
            <circle key={m.id} data-i={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r={r} fill={KIND_COLORS[m.kind]} strokeWidth={r * 2.4} style={{ "--d": (x / W).toFixed(3) }} />
          ))}
        </g>
      </svg>
      {hover && (
        <p className="mwm__tip" style={{ left: `${(hover.xy[0] / W) * 100}%`, top: `${(hover.xy[1] / H) * 100}%` }} aria-hidden="true">
          <b>{hover.m.name}</b>
          <span>{cityNameOf(hover.m)}</span>
        </p>
      )}
    </div>
  );
}
