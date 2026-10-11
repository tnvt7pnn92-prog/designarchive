// Line icons for the moodboard editor (24px grid, currentColor).
// Entries are path strings, or objects for filled / dashed paths and circles.
const ICONS = {
  undo: ["M9 14 4 9l5-5", "M4 9h11a5 5 0 0 1 0 10h-3"],
  redo: ["m15 14 5-5-5-5", "M20 9H9a5 5 0 0 0 0 10h3"],
  arrow: ["M5 19C8 10 13 6.5 19 5", "M13.5 4 19 5l-1.5 5.5"],
  sticker: [
    "M12 8.6a3.2 3.2 0 1 1 3.4 3.4 3.2 3.2 0 1 1-3.4 3.4 3.2 3.2 0 1 1-3.4-3.4A3.2 3.2 0 1 1 12 8.6Z",
    { circle: [12, 12, 1.4], fill: true },
  ],
  forward: [{ d: "M12 3 3 8l9 5 9-5-9-5Z", fill: true }, "m3 13 9 5 9-5"],
  backward: ["M3 8l9 5 9-5-9-5-9 5Z", { d: "m3 13 9 5 9-5-4.5-2.5L12 13l-4.5-2.5Z", fill: true }],
  duplicate: ["M8 8h11v11H8z", "M5 16V5h11"],
  trash: ["M4 7h16", "M9 7V4h6v3", "M6 7l1 13h10l1-13", "M10 11v5M14 11v5"],
  alignLeft: ["M4 6h16M4 10h10M4 14h16M4 18h10"],
  alignCenter: ["M4 6h16M7 10h10M4 14h16M7 18h10"],
  alignRight: ["M4 6h16M10 10h10M4 14h16M10 18h10"],
  straight: ["M4 18 20 6"],
  curved: ["M4 18C6 8 14 6 20 6"],
  solid: ["M3 12h18"],
  dashed: ["M3 12h4M10 12h4M17 12h4"],
  dotted: [{ d: "M4 12h17", dash: "0.1 4.2" }],
  headTriangle: ["M3 12h12", { d: "M21 12l-7-4.5v9Z", fill: true }],
  headOpen: ["M3 12h17", "m14 7 6 5-6 5"],
  headCircle: ["M3 12h13", { circle: [18, 12, 3], fill: true }],
  headBar: ["M3 12h17", "M20 6v12"],
  headNone: ["M3 12h18"],
  double: ["M3 12h18", "m7 8-4 4 4 4", "m17 8 4 4-4 4"],
  edit: ["M4 20h4L19 9l-4-4L4 16v4Z", "m13.5 6.5 4 4"],
  plus: ["M12 5v14M5 12h14"],
  minus: ["M5 12h14"],
  fit: ["M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"],
  close: ["M6 6l12 12M18 6 6 18"],
  download: ["M12 4v11", "m7 10 5 5 5-5", "M5 20h14"],
  panel: ["M4 5h16v14H4z", "M9.5 5v14"],
  chevron: ["m6 9 6 6 6-6"],
  upload: ["M12 16V4", "m7 9 5-5 5 5", "M5 20h14"],
  caption: ["M5 4h14v10H5z", "M5 18h9", "M5 21h5"],
  outline: [{ d: "M5 5h14v14H5z", dash: "2.5 2.5" }],
  "shape-rect": ["M4 7h16v10H4z"],
  "shape-circle": [{ circle: [12, 12, 8] }],
  "shape-arch": ["M6 20v-8a6 6 0 0 1 12 0v8Z"],
  search: [{ circle: [11, 11, 6] }, "m20 20-4.5-4.5"],
  ruler: ["M3 15 15 3l6 6L9 21Z", "m7 11 2 2M10 8l2 2M13 5l2 2"],
  pieces: ["M6 4h12v12H6z", "M8 19h8", "M9 8h6M9 11h4"],
  materials: ["M4 4h7v7H4zM13 13h7v7h-7z", { d: "M13 4h7v7h-7zM4 13h7v7H4z", dash: "1.5 2" }],
  colors: [{ circle: [8, 9, 4] }, { circle: [16, 9, 4] }, { circle: [12, 16, 4] }],
  text: ["M5 6V4h14v2", "M12 4v16", "M9 20h6"],
  help: [{ circle: [12, 12, 9] }, "M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .8-1 1.5v.4", { circle: [12, 17, 0.6], fill: true }],
  ground: [{ circle: [12, 12, 8] }, { d: "M12 4a8 8 0 0 1 0 16Z", fill: true }],
  boards: ["M4 5h7v6H4zM13 5h7v6h-7zM4 13h7v6H4zM13 13h7v6h-7z"],
  share: [{ circle: [6, 12, 2.4] }, { circle: [18, 6, 2.4] }, { circle: [18, 18, 2.4] }, "m8 11 8-4M8 13l8 4"],
  more: [{ circle: [5, 12, 1], fill: true }, { circle: [12, 12, 1], fill: true }, { circle: [19, 12, 1], fill: true }],
  eyedropper: ["m14 4 6 6", "m17 7-9.5 9.5L5 19l-1-1 2.5-2.5L16 6"],
};

export default function MoodboardIcon({ name, size = 16 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {(ICONS[name] ?? []).map((p, i) => {
        if (typeof p === "string") return <path key={i} d={p} />;
        if (p.circle) {
          const [cx, cy, r] = p.circle;
          return <circle key={i} cx={cx} cy={cy} r={r} fill={p.fill ? "currentColor" : "none"} />;
        }
        return <path key={i} d={p.d} fill={p.fill ? "currentColor" : "none"} strokeDasharray={p.dash} />;
      })}
    </svg>
  );
}
