import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
// MapLibre's worker, bundled on its own (it imports MapLibre's shared code), with its address
// handed to the library: left to itself, MapLibre looks for it next to a bundled chunk, where the
// build never puts it.
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { KIND_COLORS } from "../lib/marketFilters.js";
import "./CityMap.css";

// The city map of the Markets page: OpenFreeMap's dark vector tiles (free, no key, OpenStreetMap
// data — the attribution stays on the map), recoloured with the site's palette; a dot per place
// in its kind's colour, the starting point, and dashed rings at 5 and 10 km (and at the chosen
// distance when it is wider). Hovering a dot or a ticket lights the other up; moving the map by
// hand reports its new centre and reach (onMoved), for "search this area". MapLibre is only
// downloaded with this component, and the page only mounts it once the map is on screen.
const STYLE = "https://tiles.openfreemap.org/styles/dark";
const PALETTE = { ground: "#1e1b17", land: "#23201b", water: "#141b1b", waterway: "#1b2625", building: "#29251f", road: "#37322b", roadMajor: "#433d33", text: "#8a8274", halo: "#0f0e0c" };

function circle(center, km, steps = 72) {
  const lat = (center.lat * Math.PI) / 180;
  const coordinates = [];
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    coordinates.push([center.lng + ((km / 111.32) * Math.cos(angle)) / Math.cos(lat), center.lat + (km / 110.57) * Math.sin(angle)]);
  }
  return coordinates;
}

const ringsFor = (origin, km) => ({
  type: "FeatureCollection",
  features: [...new Set([5, 10, km])].filter((r) => r <= Math.max(km, 10)).map((r) => ({ type: "Feature", properties: { km: r }, geometry: { type: "LineString", coordinates: circle(origin, r) } })),
});

const placesFor = (places) => ({
  type: "FeatureCollection",
  features: places.map((p, i) => ({ type: "Feature", id: i + 1, properties: { id: p.id, kind: p.kind, name: p.name }, geometry: { type: "Point", coordinates: [p.lng, p.lat] } })),
});

// The dark style, in the site's colours: quiet ground, readable streets, no shop and bus icons.
function recolour(map) {
  for (const layer of map.getStyle().layers) {
    const id = layer.id;
    const paint = (property, value) => {
      try {
        map.setPaintProperty(id, property, value);
      } catch {
        /* a property this layer does not have */
      }
    };
    if (layer.type === "background") paint("background-color", PALETTE.ground);
    else if (layer.type === "fill" && layer.paint?.["fill-pattern"]) map.setLayoutProperty(id, "visibility", "none");
    else if (layer.type === "fill") {
      if (/water/.test(id)) paint("fill-color", PALETTE.water);
      else if (/building/.test(id)) paint("fill-color", PALETTE.building);
      else paint("fill-color", PALETTE.land);
    } else if (layer.type === "line") {
      if (/water/.test(id)) paint("line-color", PALETTE.waterway);
      else if (/motorway|trunk|primary/.test(id)) paint("line-color", PALETTE.roadMajor);
      else if (/road|highway|street|bridge|tunnel|path|rail/.test(id)) paint("line-color", PALETTE.road);
    } else if (layer.type === "symbol") {
      if (/poi|transit|aeroway|housenumber/.test(id)) map.setLayoutProperty(id, "visibility", "none");
      else {
        paint("text-color", PALETTE.text);
        paint("text-halo-color", PALETTE.halo);
      }
    } else if (layer.type === "raster" || layer.type === "hillshade") map.setLayoutProperty(id, "visibility", "none");
  }
}

// How far the map reaches from its centre: to the farther of its top and side edges, so the
// circle searched spans everything across the frame (the page then fits that circle in view).
function visibleArea(instance) {
  const { lat, lng } = instance.getCenter();
  const bounds = instance.getBounds();
  const toRad = (d) => (d * Math.PI) / 180;
  const north = (bounds.getNorth() - lat) * 110.57;
  const east = (bounds.getEast() - lng) * 111.32 * Math.cos(toRad(lat));
  return { lat, lng, radiusKm: Math.max(0.5, Math.abs(north), Math.abs(east)) };
}

export default function CityMap({ origin, km, places, hoveredId, onHover, onSelect, onMoved, label, failedText }) {
  const node = useRef(null);
  const map = useRef(null);
  const ids = useRef(new Map());
  const hovered = useRef(null);
  const handlers = useRef({ onHover, onSelect, onMoved });
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  handlers.current = { onHover, onSelect, onMoved };

  // The map itself, once.
  useEffect(() => {
    let cancelled = false;
    import("maplibre-gl")
      .then((module) => {
        const maplibregl = module.default ?? module;
        maplibregl.setWorkerUrl(workerUrl);
        if (cancelled || !node.current) return;
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const instance = new maplibregl.Map({
          container: node.current,
          style: STYLE,
          center: [origin.lng, origin.lat],
          zoom: 11,
          attributionControl: { compact: true },
          cooperativeGestures: window.matchMedia("(pointer: coarse)").matches,
          fadeDuration: reduce ? 0 : 300,
        });
        map.current = instance;
        instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");
        // The dark style names a few pattern images its sprite does not have (they are hidden in
        // recolour anyway): an empty pixel keeps the console quiet.
        instance.on("styleimagemissing", (event) => {
          if (!instance.hasImage(event.id)) instance.addImage(event.id, { width: 1, height: 1, data: new Uint8Array(4) });
        });
        instance.on("error", (event) => {
          // A tile that fails now and then is harmless; the style itself failing means no map.
          if (!instance.isStyleLoaded() && /style/i.test(event?.error?.message ?? "")) setFailed(true);
        });
        instance.on("load", () => {
          recolour(instance);
          instance.addSource("rings", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
          instance.addSource("origin", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
          instance.addSource("places", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
          instance.addLayer({ id: "rings", type: "line", source: "rings", paint: { "line-color": "#c9a44d", "line-opacity": 0.5, "line-width": 1, "line-dasharray": [2, 3] } });
          instance.addLayer({
            id: "rings-label",
            type: "symbol",
            source: "rings",
            layout: { "symbol-placement": "line", "text-field": ["concat", ["to-string", ["get", "km"]], " km"], "text-size": 10, "text-font": ["Noto Sans Regular"] },
            paint: { "text-color": "#c9a44d", "text-halo-color": PALETTE.halo, "text-halo-width": 1 },
          });
          instance.addLayer({ id: "origin", type: "circle", source: "origin", paint: { "circle-radius": 6, "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": "#f2ecdf", "circle-stroke-width": 2 } });
          instance.addLayer({
            id: "places-halo",
            type: "circle",
            source: "places",
            paint: { "circle-radius": 15, "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": "#c9a44d", "circle-stroke-width": 1.5, "circle-stroke-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 1, 0] },
          });
          instance.addLayer({
            id: "places",
            type: "circle",
            source: "places",
            paint: {
              "circle-radius": ["match", ["get", "kind"], "shop", 5.5, 7.5],
              "circle-color": ["match", ["get", "kind"], "market", KIND_COLORS.market, "fair", KIND_COLORS.fair, "sale", KIND_COLORS.sale, KIND_COLORS.shop],
              "circle-stroke-color": PALETTE.halo,
              "circle-stroke-width": 2,
            },
          });
          instance.on("mousemove", "places", (event) => {
            instance.getCanvas().style.cursor = "pointer";
            handlers.current.onHover?.(event.features[0]?.properties.id ?? null);
          });
          instance.on("mouseleave", "places", () => {
            instance.getCanvas().style.cursor = "";
            handlers.current.onHover?.(null);
          });
          instance.on("click", "places", (event) => handlers.current.onSelect?.(event.features[0]?.properties.id));
          // A click on empty ground lets the picked place go.
          instance.on("click", (event) => {
            if (!instance.queryRenderedFeatures(event.point, { layers: ["places"] }).length) handlers.current.onSelect?.(null);
          });
          // Only the visitor's own dragging and zooming counts: the page's fitBounds has no
          // originalEvent. The page decides whether it is worth a "search this area".
          instance.on("moveend", (event) => {
            if (event.originalEvent) handlers.current.onMoved?.(visibleArea(instance));
          });
          setReady(true);
        });
      })
      .catch((error) => {
        console.warn("City map unavailable:", error);
        setFailed(true);
      });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
    // The map is made once; origin, distance and places are applied by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Places, rings and the view, whenever they change.
  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance) return;
    instance.getSource("places").setData(placesFor(places));
    ids.current = new Map(places.map((p, i) => [p.id, i + 1]));
    hovered.current = null;
    instance.getSource("rings").setData(ringsFor(origin, km));
    instance.getSource("origin").setData({ type: "Feature", geometry: { type: "Point", coordinates: [origin.lng, origin.lat] }, properties: {} });
    const ring = circle(origin, km, 24);
    const lngs = ring.map((c) => c[0]);
    const lats = ring.map((c) => c[1]);
    instance.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 24, animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches, duration: 600 }
    );
  }, [ready, places, origin, km]);

  // The lit-up dot follows the ticket under the pointer (and the other way round).
  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance) return;
    if (hovered.current) instance.setFeatureState({ source: "places", id: hovered.current }, { hover: false });
    hovered.current = hoveredId ? ids.current.get(hoveredId) ?? null : null;
    if (hovered.current) instance.setFeatureState({ source: "places", id: hovered.current }, { hover: true });
  }, [ready, hoveredId, places]);

  return (
    <div className="city-map" role="region" aria-label={label}>
      <div ref={node} className="city-map__canvas" />
      {failed && <p className="city-map__failed">{failedText}</p>}
    </div>
  );
}
