import { useEffect, useImperativeHandle, useRef, useState } from "react";
import Globe from "globe.gl";
import * as THREE from "three";
import { feature } from "topojson-client";
import countriesTopo from "world-atlas/countries-110m.json";
import { KIND_COLORS } from "../lib/marketFilters.js";
// NASA "Earth at Night" and topography maps (public domain), as shipped with three-globe's examples.
import earthNight from "../assets/globe/earth-night.jpg";
import earthTopology from "../assets/globe/earth-topology.png";
import "./MarketsGlobe.css";

const LAND = feature(countriesTopo, countriesTopo.objects.countries).features;
const START_VIEW = { lat: 35, lng: 12, altitude: 2.3 };
const INTRO_ALTITUDE = 3.6;
// The night texture is low-resolution up close: between these altitudes it fades into a crisp vector map
// (dark land fill + borders), so zooming in never shows pixels.
const DETAIL_FROM = 1.1;
const DETAIL_TO = 0.4;
const TEXTURE_TINT = new THREE.Color("#ffffff");
const DETAIL_TINT = new THREE.Color("#070c15");
const MIN_ALTITUDE = 0.05;
const MAX_ALTITUDE = 4;
// Markers closer than this many degrees per unit of camera altitude merge into a cluster: about the
// width of the largest bubble on screen (30px), so two bubbles can never sit on top of each other —
// in Europe, where Paris, London and Milan crowd together, they used to.
const CLUSTER_FACTOR = 2.2;
// Altitude is bucketed on this ratio, so rotating or small zooms don't re-cluster every frame.
const ZOOM_STEP = 1.25;

const clampAltitude = (a) => Math.min(MAX_ALTITUDE, Math.max(MIN_ALTITUDE, a));
const zoomLevelOf = (altitude) => Math.round(Math.log(altitude) / Math.log(ZOOM_STEP));
const average = (list, key) => list.reduce((sum, m) => sum + m[key], 0) / list.length;
const rgba = (hex, alpha) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

const landFill = (detail) => `rgba(22, 31, 46, ${(0.97 * detail).toFixed(2)})`;
const landStroke = (detail) => `rgba(190, 210, 240, ${(0.16 + 0.3 * detail).toFixed(2)})`;

// Angular distance in degrees between two lat/lng points.
function arcDeg(a, b) {
  const r = Math.PI / 180;
  const h =
    Math.sin(((b.lat - a.lat) * r) / 2) ** 2 +
    Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lng - a.lng) * r) / 2) ** 2;
  return (2 * Math.asin(Math.min(1, Math.sqrt(h)))) / r;
}

// Greedy clustering: the radius shrinks with the altitude, so zooming in splits clusters into single markers.
// `scale` widens it on small screens, where the same degrees take fewer pixels (a phone's globe).
function clusterMarkets(markets, altitude, scale = 1) {
  const radius = altitude * CLUSTER_FACTOR * scale;
  const sorted = [...markets].sort((a, b) => a.lat - b.lat);
  const used = new Set();
  const groups = [];
  for (const seed of sorted) {
    if (used.has(seed.id)) continue;
    used.add(seed.id);
    const members = [seed];
    for (const other of sorted) {
      if (!used.has(other.id) && arcDeg(seed, other) <= radius) {
        used.add(other.id);
        members.push(other);
      }
    }
    groups.push(members);
  }
  // Two clusters grown from different seeds can still end up side by side: merge any whose
  // centres are closer than the radius, until none are (their bubbles would overlap).
  const centre = (members) => ({ lat: average(members, "lat"), lng: average(members, "lng") });
  for (let merged = true; merged; ) {
    merged = false;
    for (let i = 0; i < groups.length && !merged; i += 1) {
      for (let j = i + 1; j < groups.length; j += 1) {
        if (arcDeg(centre(groups[i]), centre(groups[j])) <= radius) {
          groups[i] = [...groups[i], ...groups[j]];
          groups.splice(j, 1);
          merged = true;
          break;
        }
      }
    }
  }
  return groups;
}

function starField() {
  const count = 2600;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = Math.random() * 2 - 1;
    const theta = Math.random() * Math.PI * 2;
    const r = 2200 + Math.random() * 2600;
    const s = Math.sqrt(1 - u * u);
    positions.set([r * s * Math.cos(theta), r * u, r * s * Math.sin(theta)], i * 3);
    // Mostly faint stars, a few bright ones; a slight warm or cool tint for depth.
    const b = 0.25 + Math.random() ** 5 * 0.75;
    const tint = Math.random();
    colors.set([b * (tint > 0.8 ? 1 : 0.9), b * 0.95, b * (tint < 0.3 ? 1.1 : 0.95)], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({ size: 1.7, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false });
  return new THREE.Points(geometry, material);
}

function buildElement(node, live) {
  const { t } = live.current;
  const el = document.createElement("div");
  el.className = "gm-marker";
  const tip = document.createElement("span");
  tip.className = "gm-tip";
  const title = document.createElement("strong");
  const sub = document.createElement("em");
  tip.append(title, sub);

  if (node.members.length === 1) {
    const [market] = node.members;
    el.style.setProperty("--kind", KIND_COLORS[market.kind]);
    const dot = document.createElement("span");
    dot.className = "gm-dot";
    title.textContent = market.name;
    sub.textContent = t(`markets.kindLabels.${market.kind}`);
    el.append(dot, tip);
  } else {
    const count = node.members.length;
    let from = 0;
    const stops = Object.entries(KIND_COLORS).map(([kind, color]) => {
      const share = (node.members.filter((m) => m.kind === kind).length / count) * 100;
      const stop = `${color} ${from}% ${from + share}%`;
      from += share;
      return stop;
    });
    el.classList.add("gm-marker--cluster");
    el.style.setProperty("--size", `${Math.round(18 + Math.min(12, Math.sqrt(count) * 2.5))}px`);
    el.style.setProperty("--ring", `conic-gradient(${stops.join(", ")})`);
    const ring = document.createElement("span");
    ring.className = "gm-cluster";
    const number = document.createElement("span");
    number.textContent = count;
    ring.append(number);
    title.textContent = t("markets.globe.cluster", { count });
    sub.textContent = t("markets.globe.clusterHint");
    el.append(ring, tip);
  }

  el.addEventListener("click", (event) => {
    event.stopPropagation();
    live.current.click(node);
  });
  return el;
}

function applyState(el, node, { selectedId, hoveredId }) {
  el.classList.toggle("is-selected", node.members.some((m) => m.id === selectedId));
  el.classList.toggle("is-hovered", node.members.some((m) => m.id === hoveredId));
}

function flyTo(globe, container, { lat, lng }, altitude) {
  const alt = clampAltitude(altitude ?? Math.min(globe.pointOfView().altitude, 0.8));
  // The details panel covers the right side on wide stages and the bottom on narrow ones:
  // aim past the point so it stays visible next to the panel.
  const wide = container.clientWidth > 760;
  const lngShift = wide ? (alt * 10) / Math.max(0.3, Math.cos((lat * Math.PI) / 180)) : 0;
  const latShift = wide ? 0 : -alt * 7;
  globe.pointOfView({ lat: Math.max(-85, lat + latShift), lng: lng + lngShift, altitude: alt }, 1300);
}

export default function MarketsGlobe({ ref, markets, selectedId, hoveredId, focus, autoRotate, t, lang, onSelect, onPickCluster, onView, start }) {
  const containerRef = useRef(null);
  const globeRef = useRef(null);
  const nodesRef = useRef(new Map());
  const elementsRef = useRef(new Map());
  const [zoomLevel, setZoomLevel] = useState(() => zoomLevelOf(START_VIEW.altitude));

  // Marker DOM elements outlive renders, so their handlers read the latest props from here.
  const live = useRef({});
  live.current = {
    t,
    markets,
    selectedId,
    hoveredId,
    focus,
    start,
    onView,
    click(node) {
      const globe = globeRef.current;
      if (!globe) return;
      if (node.members.length === 1) {
        onSelect(node.members[0].id);
        return;
      }
      const altitude = globe.pointOfView().altitude;
      const spread = Math.max(...node.members.map((m) => arcDeg(node, m)));
      // Already fully zoomed in, or the markets share practically one spot: list them instead.
      if (altitude <= MIN_ALTITUDE * 1.6 || spread * 2 < CLUSTER_FACTOR * MIN_ALTITUDE) {
        onPickCluster(node.members);
        flyTo(globe, containerRef.current, node, altitude);
      } else {
        globe.pointOfView({ lat: node.lat, lng: node.lng, altitude: clampAltitude(Math.min(altitude / 2.5, spread / 5)) }, 1100);
      }
    },
  };

  useEffect(() => {
    const container = containerRef.current;
    const globe = new Globe(container)
      .width(container.clientWidth)
      .height(container.clientHeight)
      .backgroundColor("rgba(0,0,0,0)")
      .showAtmosphere(true)
      .globeImageUrl(earthNight)
      .bumpImageUrl(earthTopology)
      .atmosphereColor("#8cbcff")
      .atmosphereAltitude(0.22)
      // Country shapes: invisible fill over the texture from afar, a solid dark map up close.
      .polygonsData(LAND)
      .polygonCapColor(() => landFill(0))
      .polygonSideColor(() => "rgba(0,0,0,0)")
      .polygonStrokeColor(() => landStroke(0))
      .polygonAltitude(0.003)
      .polygonsTransitionDuration(0)
      // Ripples around the selected market.
      .ringColor((d) => (progress) => rgba(d.color, Math.max(0, 0.9 * (1 - progress))))
      .ringMaxRadius("radius")
      .ringPropagationSpeed((d) => d.radius * 1.4)
      .ringRepeatPeriod(1000)
      .ringAltitude(0.007)
      .htmlAltitude(0.012)
      .htmlTransitionDuration(0)
      .htmlElement((node) => {
        let el = elementsRef.current.get(node.key);
        if (!el) {
          el = buildElement(node, live);
          elementsRef.current.set(node.key, el);
        }
        applyState(el, node, live.current);
        return el;
      });

    // Intro: the globe drifts in from afar, unless we are opening straight onto a market.
    if (live.current.start) {
      // Opened from a city: straight above it, close enough to see its region's markets.
      globe.pointOfView({ lat: live.current.start.lat, lng: live.current.start.lng, altitude: 1.1 });
    } else if (live.current.focus) {
      globe.pointOfView(START_VIEW);
    } else {
      globe.pointOfView({ ...START_VIEW, lng: START_VIEW.lng - 40, altitude: INTRO_ALTITUDE });
      globe.pointOfView(START_VIEW, 2200);
    }

    // Keep the texture's own colours, lift the shadows a touch and give the relief a soft sheen.
    const material = globe.globeMaterial();
    material.emissive = new THREE.Color("#0a1426");
    material.emissiveIntensity = 0.35;
    material.specular = new THREE.Color("#22334d");
    material.shininess = 10;
    material.bumpScale = 3;

    // Every frame: sample the camera altitude (onZoom misses animated pointOfView() flights; React skips
    // the render when the zoom bucket is unchanged) and blend texture → vector map as the camera closes in.
    let frame = 0;
    let appliedDetail = -1;
    const tick = () => {
      const { altitude } = globe.pointOfView();
      setZoomLevel(zoomLevelOf(altitude));
      const t = Math.min(1, Math.max(0, (DETAIL_FROM - altitude) / (DETAIL_FROM - DETAIL_TO)));
      const detail = t * t * (3 - 2 * t);
      // three-globe nulls material.color when the texture finishes loading, so recreate it if needed.
      if (!material.color) material.color = new THREE.Color();
      material.color.copy(TEXTURE_TINT).lerp(DETAIL_TINT, detail);
      material.bumpScale = 3 * (1 - detail);
      material.emissiveIntensity = 0.35 * (1 - detail);
      // Polygon colours re-render the whole layer, so they only update in 5% steps.
      const step = Math.round(detail * 20) / 20;
      if (step !== appliedDetail) {
        appliedDetail = step;
        globe.polygonCapColor(() => landFill(step)).polygonStrokeColor(() => landStroke(step));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    const stars = starField();
    globe.scene().add(stars);

    const radius = globe.getGlobeRadius();
    const controls = globe.controls();
    controls.minDistance = radius * (1 + MIN_ALTITUDE);
    controls.maxDistance = radius * (1 + MAX_ALTITUDE);
    controls.autoRotateSpeed = 0.15;
    controls.zoomSpeed = 0.8;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    globeRef.current = globe;
    const observer = new ResizeObserver(() => globe.width(container.clientWidth).height(container.clientHeight));
    observer.observe(container);

    // Where the visitor has turned the globe to, once it settles (the damping runs on after the
    // hand lets go): the page offers to search there.
    let settle = 0;
    const onEnd = () => {
      clearTimeout(settle);
      settle = setTimeout(() => live.current.onView?.({ ...globe.pointOfView(), aspect: container.clientWidth / Math.max(1, container.clientHeight) }), 450);
    };
    controls.addEventListener("end", onEnd);

    const nodes = nodesRef.current;
    const elements = elementsRef.current;
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(settle);
      controls.removeEventListener("end", onEnd);
      observer.disconnect();
      globe.scene().remove(stars);
      stars.geometry.dispose();
      stars.material.dispose();
      globe._destructor();
      globeRef.current = null;
      nodes.clear();
      elements.clear();
      container.replaceChildren();
    };
  }, []);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    // The selected market always stands on its own, even where neighbours share the same street.
    const selected = markets.find((m) => m.id === selectedId);
    // The globe is drawn to the smaller side of its frame: below ~640px the markers need more room.
    const frame = containerRef.current;
    const scale = frame ? Math.max(1, 640 / Math.max(1, Math.min(frame.clientWidth, frame.clientHeight))) : 1;
    const groups = clusterMarkets(selected ? markets.filter((m) => m !== selected) : markets, ZOOM_STEP ** zoomLevel, scale);
    if (selected) groups.push([selected]);
    const next = new Map();
    for (const members of groups) {
      // The language is part of the key so tooltips are rebuilt with new labels.
      const key = `${lang}|${members.map((m) => m.id).sort().join("+")}`;
      next.set(key, nodesRef.current.get(key) ?? { key, members, lat: average(members, "lat"), lng: average(members, "lng") });
    }
    nodesRef.current = next;
    for (const key of elementsRef.current.keys()) if (!next.has(key)) elementsRef.current.delete(key);
    globe.htmlElementsData([...next.values()]);

    // Ring size follows the zoom so the ripple reads the same at every distance.
    const ringRadius = Math.min(3, Math.max(0.2, ZOOM_STEP ** zoomLevel * 1.4));
    globe.ringsData(selected ? [{ lat: selected.lat, lng: selected.lng, color: KIND_COLORS[selected.kind], radius: ringRadius }] : []);
  }, [markets, zoomLevel, lang, selectedId]);

  useEffect(() => {
    for (const [key, el] of elementsRef.current) {
      const node = nodesRef.current.get(key);
      if (node) applyState(el, node, { selectedId, hoveredId });
    }
  }, [selectedId, hoveredId, markets, zoomLevel]);

  useEffect(() => {
    if (globeRef.current) globeRef.current.controls().autoRotate = autoRotate;
  }, [autoRotate]);

  // Fly to a market whenever one is picked (from the globe, the list, or "show on map").
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || !focus) return;
    const point = live.current.markets.find((m) => m.id === focus.id);
    if (!point) return;
    // Close in far enough to tell the neighbours apart, but keep some context around the point.
    const others = live.current.markets.filter((m) => m.id !== point.id).map((m) => arcDeg(point, m));
    const nearest = others.length ? Math.min(...others) : 10;
    const altitude = Math.min(globe.pointOfView().altitude, 0.8, Math.max(0.15, (nearest / CLUSTER_FACTOR) * 0.85));
    flyTo(globe, containerRef.current, point, altitude);
  }, [focus]);

  useImperativeHandle(
    ref,
    () => ({
      zoom(factor) {
        const globe = globeRef.current;
        if (!globe) return;
        const pov = globe.pointOfView();
        globe.pointOfView({ ...pov, altitude: clampAltitude(pov.altitude * factor) }, 500);
      },
      reset() {
        globeRef.current?.pointOfView(START_VIEW, 1200);
      },
    }),
    []
  );

  return <div ref={containerRef} className="mk-globe" />;
}
