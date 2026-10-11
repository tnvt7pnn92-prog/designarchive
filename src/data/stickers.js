// Stickers for the board, authored as inline SVG so they stay crisp at any size,
// ship with no extra requests and keep the exported canvas CORS-clean (data: URLs).
// Palette: the site's cream / gold / teal plus soft blush, sage, butter, lavender and
// terracotta tones.

const C = {
  cream: "#f4efe6",
  creamLine: "#e3dccf",
  gold: "#c9a44d",
  butter: "#f1d99b",
  blush: "#e8b4b8",
  rose: "#d98c97",
  sage: "#a8b5a2",
  moss: "#7f9479",
  lavender: "#c3b1e1",
  lilac: "#9f8cc4",
  terracotta: "#c8775a",
  clay: "#a95f45",
  teal: "#6f9c95",
  ink: "#2a2620",
  metal: "#b8b0a2",
};

// The drawer offers working marks for a design board: numbered and yes/no markers, things to pin
// a print with, and plan symbols. The older decorative stickers (flowers, hearts, washi…) stay
// defined so boards that use them still draw them, but are no longer offered.
export const STICKER_CATEGORIES = ["markers", "pinning", "plan"];

const range = (n) => Array.from({ length: n }, (_, i) => i);

// Intrinsic size is 4× the viewBox so the bitmap stays sharp when the board is zoomed.
const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * 4}" height="${h * 4}">${body}</svg>`;

const sticker = (id, category, [vbW, vbH], size, body) => ({
  id,
  category,
  width: size,
  height: Math.round((size * vbH) / vbW),
  svg: svg(vbW, vbH, body),
});

const HEART = "M50 88C20 66 6 48 6 32 6 18 17 8 30 8c9 0 16 5 20 13 4-8 11-13 20-13 13 0 24 10 24 24 0 16-14 34-44 56Z";
const SPARKLE = "M50 4C54 36 64 46 96 50 64 54 54 64 50 96 46 64 36 54 4 50 36 46 46 36 50 4Z";
const STAR = "M50 7 61.8 35.8 92.8 38.1 69 58.2 76.5 88.4 50 72 23.5 88.4 31 58.2 7.2 38.1 38.2 35.8Z";
const TAPE_EDGE =
  "M6 4H214L210 10 216 16 210 22 216 28 210 34 216 40 210 46 214 52H6L10 46 4 40 10 34 4 28 10 22 4 16 10 10Z";

const washi = (id, fill, pattern) =>
  sticker(
    id,
    "tape",
    [220, 56],
    210,
    `<defs><pattern id="p" width="12" height="12" patternUnits="userSpaceOnUse">${pattern}</pattern></defs>` +
      `<path d="${TAPE_EDGE}" fill="${fill}" opacity=".88"/><path d="${TAPE_EDGE}" fill="url(#p)"/>` +
      `<path d="M10 9H210" stroke="#fff" stroke-opacity=".25" stroke-width="2"/>`
  );

const RAW = [
  /* ---------- flowers ---------- */
  sticker(
    "daisy",
    "flowers",
    [100, 100],
    110,
    `<g fill="${C.cream}" stroke="${C.creamLine}" stroke-width="1.2">${range(12)
      .map((i) => `<ellipse cx="50" cy="25" rx="8.5" ry="20" transform="rotate(${i * 30} 50 50)"/>`)
      .join("")}</g><circle cx="50" cy="50" r="12" fill="${C.butter}" stroke="${C.gold}" stroke-width="1.5"/>` +
      `<g fill="${C.gold}">${range(6)
        .map((i) => `<circle cx="${50 + 5 * Math.cos(i)}" cy="${50 + 5 * Math.sin(i * 1.3)}" r="1.4"/>`)
        .join("")}</g>`
  ),
  sticker(
    "blossom",
    "flowers",
    [100, 100],
    100,
    `<g fill="${C.blush}" stroke="${C.rose}" stroke-width="1.5">${range(5)
      .map((i) => `<circle cx="50" cy="28" r="19" transform="rotate(${i * 72} 50 50)"/>`)
      .join("")}</g><g stroke="${C.rose}" stroke-width="1.4" stroke-linecap="round">${range(5)
      .map((i) => `<path d="M50 50V36" transform="rotate(${i * 72 + 36} 50 50)"/>`)
      .join("")}</g><circle cx="50" cy="50" r="9" fill="${C.butter}" stroke="${C.gold}" stroke-width="1.5"/>`
  ),
  sticker(
    "tulip",
    "flowers",
    [60, 90],
    80,
    `<path d="M30 88C30 70 30 56 30 40" stroke="${C.moss}" stroke-width="3" stroke-linecap="round" fill="none"/>` +
      `<path d="M30 76C18 71 11 59 13 47c9 5 15 14 17 29Z" fill="${C.sage}" stroke="${C.moss}" stroke-width="1.2"/>` +
      `<path d="M30 68c12-6 18-16 16-27-8 5-14 13-16 27Z" fill="${C.sage}" stroke="${C.moss}" stroke-width="1.2"/>` +
      `<path d="M17 20c0 15 6 22 13 22s13-7 13-22l-7 7-6-13-6 13Z" fill="${C.rose}" stroke="#c07580" stroke-width="1.3" stroke-linejoin="round"/>` +
      `<path d="M22 24c1 8 4 13 8 15" stroke="#fff" stroke-opacity=".45" stroke-width="2" fill="none" stroke-linecap="round"/>`
  ),
  sticker(
    "sprig",
    "flowers",
    [60, 110],
    70,
    `<path d="M30 108C27 80 33 50 30 8" stroke="${C.moss}" stroke-width="2.5" fill="none" stroke-linecap="round"/>` +
      `<g fill="${C.sage}" stroke="${C.moss}" stroke-width="1">${[92, 74, 56, 38, 22]
        .map(
          (y) =>
            `<ellipse cx="19" cy="${y}" rx="11" ry="5" transform="rotate(-32 19 ${y})"/>` +
            `<ellipse cx="41" cy="${y - 7}" rx="11" ry="5" transform="rotate(32 41 ${y - 7})"/>`
        )
        .join("")}<ellipse cx="30" cy="8" rx="5" ry="9"/></g>`
  ),
  sticker(
    "lavender",
    "flowers",
    [50, 120],
    56,
    `<path d="M25 118C25 90 24 60 26 20" stroke="${C.moss}" stroke-width="2.2" fill="none" stroke-linecap="round"/>` +
      `<path d="M25 100c-8-6-12-16-10-26 6 6 9 14 10 26Z" fill="${C.sage}"/>` +
      `<g fill="${C.lavender}" stroke="${C.lilac}" stroke-width=".8">${range(9)
        .map((i) => {
          const y = 14 + i * 7;
          const w = 5 - i * 0.25;
          return `<ellipse cx="${21 - (i % 2)}" cy="${y}" rx="${w}" ry="4"/><ellipse cx="${31 - (i % 2)}" cy="${y + 3}" rx="${w}" ry="4"/>`;
        })
        .join("")}<ellipse cx="26" cy="9" rx="3.5" ry="4.5"/></g>`
  ),
  sticker(
    "line-flower",
    "flowers",
    [100, 100],
    100,
    `<g fill="none" stroke="${C.gold}" stroke-width="2.4" stroke-linecap="round">${range(8)
      .map((i) => `<path d="M50 50C40 36 42 14 50 8c8 6 10 28 0 42Z" transform="rotate(${i * 45} 50 50)"/>`)
      .join("")}<circle cx="50" cy="50" r="7"/></g>`
  ),
  sticker(
    "wildflowers",
    "flowers",
    [100, 110],
    100,
    `<g stroke="${C.moss}" stroke-width="2" fill="none" stroke-linecap="round"><path d="M50 108C48 80 38 56 26 36"/><path d="M50 108c0-30 2-54 6-74"/><path d="M50 108c4-24 14-42 28-54"/></g>` +
      `<g fill="${C.blush}" stroke="${C.rose}">${range(5)
        .map((i) => `<circle cx="26" cy="27" r="7" transform="rotate(${i * 72} 26 36)"/>`)
        .join("")}</g><circle cx="26" cy="36" r="4" fill="${C.butter}"/>` +
      `<g fill="${C.cream}" stroke="${C.creamLine}">${range(6)
        .map((i) => `<ellipse cx="56" cy="16" rx="4" ry="9" transform="rotate(${i * 60} 56 24)"/>`)
        .join("")}</g><circle cx="56" cy="24" r="4" fill="${C.gold}"/>` +
      `<g fill="${C.lavender}" stroke="${C.lilac}">${range(5)
        .map((i) => `<circle cx="78" cy="45" r="6" transform="rotate(${i * 72} 78 52)"/>`)
        .join("")}</g><circle cx="78" cy="52" r="3.5" fill="${C.butter}"/>`
  ),

  /* ---------- hearts & stars ---------- */
  sticker(
    "heart",
    "hearts",
    [100, 96],
    90,
    `<path d="${HEART}" fill="${C.blush}" stroke="${C.rose}" stroke-width="2.5"/>` +
      `<ellipse cx="27" cy="27" rx="9" ry="5" fill="#fff" opacity=".5" transform="rotate(-35 27 27)"/>`
  ),
  sticker(
    "heart-doodle",
    "hearts",
    [100, 96],
    90,
    `<g fill="none" stroke="${C.rose}" stroke-linecap="round" stroke-linejoin="round"><path d="${HEART}" stroke-width="4"/>` +
      `<path d="${HEART}" stroke-width="2" opacity=".55" transform="rotate(-5 50 50) translate(2 -2)"/></g>`
  ),
  sticker(
    "heart-lavender",
    "hearts",
    [100, 96],
    80,
    `<path d="${HEART}" fill="${C.lavender}" stroke="${C.lilac}" stroke-width="2.5"/>` +
      `<path d="${HEART}" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2" stroke-dasharray="4 5" transform="translate(12 12) scale(.76)"/>`
  ),
  sticker(
    "hearts-trio",
    "hearts",
    [120, 100],
    100,
    `<path d="${HEART}" fill="${C.blush}" stroke="${C.rose}" stroke-width="3" transform="translate(4 30) scale(.62) rotate(-12 50 50)"/>` +
      `<path d="${HEART}" fill="${C.terracotta}" stroke="${C.clay}" stroke-width="3" transform="translate(56 4) scale(.5) rotate(14 50 50)"/>` +
      `<path d="${HEART}" fill="${C.lavender}" stroke="${C.lilac}" stroke-width="4" transform="translate(74 60) scale(.36)"/>`
  ),
  sticker("sparkle", "hearts", [100, 100], 80, `<path d="${SPARKLE}" fill="${C.butter}" stroke="${C.gold}" stroke-width="2"/>`),
  sticker(
    "sparkles",
    "hearts",
    [120, 110],
    100,
    `<g fill="${C.butter}" stroke="${C.gold}" stroke-width="2.4"><path d="${SPARKLE}" transform="translate(2 18) scale(.8)"/>` +
      `<path d="${SPARKLE}" transform="translate(76 2) scale(.4)"/><path d="${SPARKLE}" transform="translate(84 70) scale(.32)"/></g>`
  ),
  sticker(
    "star",
    "hearts",
    [100, 96],
    84,
    `<path d="${STAR}" fill="${C.butter}" stroke="${C.butter}" stroke-width="9" stroke-linejoin="round"/>` +
      `<path d="${STAR}" fill="none" stroke="${C.gold}" stroke-width="2" stroke-linejoin="round" transform="translate(9 9) scale(.82)"/>`
  ),
  sticker(
    "moon",
    "hearts",
    [100, 100],
    90,
    `<path d="M58 8a42 42 0 1 0 34 60A34 34 0 1 1 58 8Z" fill="${C.butter}" stroke="${C.gold}" stroke-width="2"/>` +
      `<g fill="${C.gold}"><path d="${SPARKLE}" transform="translate(66 24) scale(.2)"/><path d="${SPARKLE}" transform="translate(80 46) scale(.13)"/></g>` +
      `<circle cx="36" cy="40" r="4" fill="${C.gold}" opacity=".35"/><circle cx="30" cy="62" r="6" fill="${C.gold}" opacity=".3"/>`
  ),
  sticker(
    "confetti",
    "hearts",
    [120, 90],
    110,
    `<g stroke-linecap="round" stroke-width="4" fill="none"><path d="M12 20l8 8M20 20l-8 8" stroke="${C.rose}"/><path d="M92 12v12M86 18h12" stroke="${C.teal}"/>` +
      `<path d="M50 70q6-8 12 0" stroke="${C.gold}"/><path d="M100 64l8 8M108 64l-8 8" stroke="${C.lilac}"/></g>` +
      `<circle cx="60" cy="24" r="4" fill="${C.terracotta}"/><circle cx="24" cy="66" r="3" fill="${C.sage}"/><circle cx="80" cy="44" r="2.5" fill="${C.gold}"/>` +
      `<path d="${SPARKLE}" fill="${C.butter}" transform="translate(32 30) scale(.16)"/>`
  ),

  /* ---------- washi tape & ribbons ---------- */
  washi("washi-stripes", C.blush, `<rect width="12" height="12" fill="none"/><path d="M-3 3 3-3M0 12 12 0M9 15l6-6" stroke="${C.cream}" stroke-opacity=".6" stroke-width="3"/>`),
  washi("washi-dots", C.sage, `<circle cx="6" cy="6" r="2.2" fill="${C.cream}" opacity=".75"/>`),
  washi(
    "washi-gingham",
    C.lavender,
    `<rect width="6" height="12" fill="#fff" opacity=".22"/><rect width="12" height="6" fill="#fff" opacity=".22"/>`
  ),
  washi("washi-grid", C.teal, `<path d="M12 0V12M0 12H12" stroke="${C.cream}" stroke-opacity=".45" stroke-width="1"/>`),
  washi("washi-butter", C.butter, `<path d="M6 3c-1.5-2-5 0-2.5 2.5L6 8l2.5-2.5C11 3 7.5 1 6 3Z" fill="${C.terracotta}" opacity=".45"/>`),
  sticker(
    "tape-clear",
    "tape",
    [140, 44],
    130,
    `<path d="M4 6 136 2l-3 6 4 5-4 6 4 6-4 6 4 5-2 6L6 42l3-6-5-5 4-6-4-6 4-6-4-5Z" fill="${C.cream}" opacity=".42"/>` +
      `<path d="M10 10 130 7" stroke="#fff" stroke-opacity=".5" stroke-width="2"/>`
  ),
  sticker(
    "bow",
    "tape",
    [130, 100],
    120,
    `<g fill="${C.blush}" stroke="${C.rose}" stroke-width="1.8" stroke-linejoin="round">` +
      `<path d="M59 46 41 94l10-6 7 10 7-50Z"/><path d="M71 46l18 48-10-6-7 10-7-50Z"/>` +
      `<path d="M60 40C40 8 6 12 9 36c3 22 36 18 51 8Z"/><path d="M70 40c20-32 54-28 51-4-3 22-36 18-51 8Z"/>` +
      `<rect x="56" y="33" width="18" height="17" rx="6"/></g>` +
      `<g fill="none" stroke="${C.rose}" stroke-width="1.4" stroke-linecap="round"><path d="M54 40C42 26 26 24 20 32"/><path d="M76 40c12-14 28-16 34-8"/></g>`
  ),
  sticker(
    "banner",
    "tape",
    [200, 64],
    190,
    `<path d="M4 22h36v38H4l12-19Z" fill="${C.clay}"/><path d="M196 22h-36v38h36l-12-19Z" fill="${C.clay}"/>` +
      `<path d="M28 50 40 60V50ZM172 50l-12 10V50Z" fill="#7d4432"/>` +
      `<rect x="28" y="6" width="144" height="44" rx="2" fill="${C.terracotta}"/>` +
      `<rect x="34" y="12" width="132" height="32" fill="none" stroke="${C.cream}" stroke-opacity=".7" stroke-width="1.5" stroke-dasharray="5 4"/>`
  ),

  /* ---------- organic shapes ---------- */
  sticker(
    "blob-terracotta",
    "shapes",
    [100, 100],
    110,
    `<path d="M54 6c24-2 44 16 40 40-3 20-14 26-24 38-12 14-38 12-50 0C6 70 4 52 10 36 16 18 34 7 54 6Z" fill="${C.terracotta}"/>`
  ),
  sticker(
    "blob-sage",
    "shapes",
    [120, 90],
    120,
    `<path d="M20 20C38 2 66 14 84 8s32 10 30 30c-2 18-20 22-26 36-8 16-40 16-56 6C12 70 2 58 4 44 5 34 12 28 20 20Z" fill="${C.sage}"/>`
  ),
  sticker(
    "blob-butter",
    "shapes",
    [100, 110],
    96,
    `<path d="M50 4c20 0 34 14 40 32 6 20-4 30 0 46 3 14-14 26-34 24-22-2-34-12-44-28C2 62 8 44 14 30 20 14 32 4 50 4Z" fill="${C.butter}"/>`
  ),
  sticker(
    "rainbow",
    "shapes",
    [140, 84],
    130,
    `<g fill="none" stroke-width="14"><path d="M17 84a53 53 0 0 1 106 0" stroke="${C.terracotta}"/>` +
      `<path d="M33 84a37 37 0 0 1 74 0" stroke="${C.butter}"/><path d="M49 84a21 21 0 0 1 42 0" stroke="${C.sage}"/></g>`
  ),
  sticker(
    "sun",
    "shapes",
    [100, 100],
    96,
    `<g stroke="${C.gold}" stroke-width="5" stroke-linecap="round">${range(12)
      .map((i) => `<path d="M50 8v12" transform="rotate(${i * 30} 50 50)"/>`)
      .join("")}</g><circle cx="50" cy="50" r="22" fill="${C.butter}" stroke="${C.gold}" stroke-width="2"/>`
  ),
  sticker(
    "scallop",
    "shapes",
    [100, 100],
    96,
    `<g fill="${C.lavender}">${range(14)
      .map((i) => `<circle cx="50" cy="15" r="11" transform="rotate(${(i * 360) / 14} 50 50)"/>`)
      .join("")}<circle cx="50" cy="50" r="36"/></g>` +
      `<circle cx="50" cy="50" r="27" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.6" stroke-dasharray="3 4"/>`
  ),
  sticker(
    "arch",
    "shapes",
    [100, 130],
    84,
    `<path d="M10 128V52a40 40 0 0 1 80 0v76Z" fill="${C.blush}"/><path d="M22 128V54a28 28 0 0 1 56 0v74" fill="none" stroke="${C.cream}" stroke-opacity=".55" stroke-width="2"/>`
  ),
  sticker(
    "squiggle",
    "shapes",
    [140, 60],
    140,
    `<path d="M6 30C20 6 34 6 48 30s28 24 42 0 28-24 44 0" fill="none" stroke="${C.teal}" stroke-width="7" stroke-linecap="round"/>`
  ),

  /* ---------- doodles & desk bits ---------- */
  sticker(
    "scribble-circle",
    "doodles",
    [200, 130],
    200,
    `<path d="M30 72c-6-38 60-58 110-50 46 8 56 48 30 74-30 28-110 28-136 4-16-14-12-40 12-56 24-16 74-18 104-10" fill="none" stroke="${C.gold}" stroke-width="3.5" stroke-linecap="round"/>`
  ),
  sticker(
    "underline",
    "doodles",
    [150, 34],
    160,
    `<path d="M4 20c26-14 46 12 72-4s44-8 70 4" fill="none" stroke="${C.gold}" stroke-width="5" stroke-linecap="round"/>`
  ),
  sticker(
    "check",
    "markers",
    [80, 70],
    70,
    `<path d="M8 38c8 6 14 14 20 24C38 38 54 18 74 6" fill="none" stroke="${C.teal}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`
  ),
  sticker(
    "paperclip",
    "pinning",
    [50, 120],
    44,
    `<path d="M18 32v64a14 14 0 0 0 28 0V22A20 20 0 0 0 6 22v70" fill="none" stroke="${C.metal}" stroke-width="4.5" stroke-linecap="round"/>` +
      `<path d="M18 32v64a14 14 0 0 0 28 0V22A20 20 0 0 0 6 22v70" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.5" stroke-linecap="round" transform="translate(-1 -1)"/>`
  ),
  sticker(
    "pin",
    "pinning",
    [70, 96],
    52,
    `<path d="M35 46v46" stroke="${C.metal}" stroke-width="3" stroke-linecap="round"/>` +
      `<path d="M24 40h22l-4 10H28Z" fill="${C.clay}"/><circle cx="35" cy="26" r="20" fill="${C.terracotta}" stroke="${C.clay}" stroke-width="2"/>` +
      `<ellipse cx="28" cy="18" rx="6" ry="4" fill="#fff" opacity=".45" transform="rotate(-30 28 18)"/>`
  ),
  sticker(
    "butterfly",
    "doodles",
    [110, 90],
    100,
    `<g fill="${C.lavender}" stroke="${C.lilac}" stroke-width="1.6" stroke-linejoin="round">` +
      `<path d="M55 44C42 10 8 6 8 28c0 18 26 24 47 18Z"/><path d="M55 44c13-34 47-38 47-16 0 18-26 24-47 18Z"/>` +
      `<path d="M55 48C38 50 18 68 28 82c8 10 24-8 27-30Z"/><path d="M55 48c17 2 37 20 27 34-8 10-24-8-27-30Z"/></g>` +
      `<g fill="${C.blush}"><circle cx="30" cy="28" r="6"/><circle cx="80" cy="28" r="6"/><circle cx="38" cy="66" r="4"/><circle cx="72" cy="66" r="4"/></g>` +
      `<rect x="52" y="30" width="6" height="40" rx="3" fill="${C.ink}"/>` +
      `<path d="M54 32C50 20 44 14 38 12M56 32c4-12 10-18 16-20" fill="none" stroke="${C.ink}" stroke-width="1.6" stroke-linecap="round"/>`
  ),
  sticker(
    "cloud",
    "doodles",
    [140, 80],
    130,
    `<path d="M30 72c-18 0-24-18-12-26-2-18 20-26 32-16 6-16 34-20 44-2 16-6 34 6 28 22 14 4 12 22-6 22Z" fill="${C.cream}" stroke="${C.creamLine}" stroke-width="2"/>`
  ),
  sticker(
    "photo-corners",
    "pinning",
    [120, 120],
    110,
    `<g fill="${C.ink}" opacity=".9"><path d="M4 4h34L4 38Z"/><path d="M116 116H82l34-34Z"/></g>` +
      `<g fill="none" stroke="${C.gold}" stroke-width="1.2" opacity=".6"><path d="M10 10h18L10 28Z"/><path d="M110 110H92l18-18Z"/></g>`
  ),

  /* ---------- markers: numbers and quick verdicts, to annotate pieces ---------- */
  ...range(6).map((i) =>
    sticker(
      `num-${i + 1}`,
      "markers",
      [60, 60],
      44,
      `<circle cx="30" cy="30" r="27" fill="${C.gold}"/><circle cx="30" cy="30" r="22.5" fill="none" stroke="${C.ink}" stroke-opacity=".25" stroke-width="1"/>` +
        `<text x="30" y="31" text-anchor="middle" dominant-baseline="middle" font-family="Georgia, serif" font-size="30" fill="${C.ink}">${i + 1}</text>`
    )
  ),
  sticker(
    "mark-yes",
    "markers",
    [60, 60],
    48,
    `<circle cx="30" cy="30" r="27" fill="#3f6b52"/><path d="M17 31l9 9 17-19" fill="none" stroke="${C.cream}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`
  ),
  sticker(
    "mark-no",
    "markers",
    [60, 60],
    48,
    `<circle cx="30" cy="30" r="27" fill="#9a4b2c"/><path d="M20 20l20 20M40 20 20 40" stroke="${C.cream}" stroke-width="5" stroke-linecap="round"/>`
  ),
  sticker(
    "mark-maybe",
    "markers",
    [60, 60],
    48,
    `<circle cx="30" cy="30" r="27" fill="${C.butter}"/><path d="M22 23a8 8 0 1 1 11 7.5c-2.2.9-3 2.4-3 4.5v2" fill="none" stroke="${C.ink}" stroke-width="4.5" stroke-linecap="round"/><circle cx="30" cy="45" r="2.8" fill="${C.ink}"/>`
  ),
  sticker(
    "mark-attention",
    "markers",
    [64, 58],
    50,
    `<path d="M32 4 61 54H3Z" fill="${C.terracotta}" stroke="${C.clay}" stroke-width="2" stroke-linejoin="round"/><path d="M32 21v16" stroke="${C.cream}" stroke-width="5" stroke-linecap="round"/><circle cx="32" cy="45" r="3" fill="${C.cream}"/>`
  ),
  sticker(
    "mark-favourite",
    "markers",
    [60, 60],
    48,
    `<circle cx="30" cy="30" r="27" fill="${C.ink}"/><path d="${STAR}" transform="translate(9 9) scale(.42)" fill="${C.gold}"/>`
  ),
  sticker(
    "price-tag",
    "markers",
    [110, 60],
    84,
    `<path d="M4 30 26 6h76a4 4 0 0 1 4 4v40a4 4 0 0 1-4 4H26Z" fill="${C.cream}" stroke="${C.creamLine}" stroke-width="2" stroke-linejoin="round"/>` +
      `<circle cx="24" cy="30" r="5" fill="none" stroke="${C.metal}" stroke-width="2.5"/>` +
      `<text x="66" y="32" text-anchor="middle" dominant-baseline="middle" font-family="Georgia, serif" font-size="30" fill="${C.ink}">€</text>`
  ),

  /* ---------- pinning: what holds a print on the board ---------- */
  sticker(
    "tape-kraft",
    "pinning",
    [140, 40],
    120,
    `<path d="M6 6h128l-4 7 4 7-4 7 4 7H6l4-7-4-7 4-7Z" fill="#c9a77c" opacity=".92"/><path d="M10 11h120" stroke="#fff" stroke-opacity=".2" stroke-width="2"/>`
  ),
  sticker(
    "tape-clear",
    "pinning",
    [140, 40],
    120,
    `<path d="M6 6h128l-4 7 4 7-4 7 4 7H6l4-7-4-7 4-7Z" fill="#f4efe6" fill-opacity=".5" stroke="#ffffff" stroke-opacity=".35"/>`
  ),
  sticker(
    "binder-clip",
    "pinning",
    [70, 80],
    50,
    `<path d="M20 30 12 6M50 30l8-24" fill="none" stroke="${C.metal}" stroke-width="3.5" stroke-linecap="round"/><path d="M12 6h46" stroke="${C.metal}" stroke-width="3.5" stroke-linecap="round"/>` +
      `<path d="M8 30h54l-6 44H14Z" fill="${C.ink}"/><path d="M14 36h42" stroke="#fff" stroke-opacity=".18" stroke-width="2"/>`
  ),

  /* ---------- plan: symbols of an architect's sheet ---------- */
  sticker(
    "north-arrow",
    "plan",
    [70, 96],
    52,
    `<circle cx="35" cy="56" r="28" fill="none" stroke="${C.ink}" stroke-width="2"/><path d="M35 22 47 70 35 62 23 70Z" fill="${C.ink}"/><path d="M35 22 35 62 23 70Z" fill="${C.cream}" stroke="${C.ink}" stroke-width="1.5" stroke-linejoin="round"/>` +
      `<text x="35" y="12" text-anchor="middle" dominant-baseline="middle" font-family="Georgia, serif" font-size="16" fill="${C.ink}">N</text>`
  ),
  sticker(
    "scale-figure",
    "plan",
    [70, 200],
    46,
    `<circle cx="30" cy="20" r="11" fill="${C.ink}"/><path d="M30 34c-11 0-17 6-17 16v46h8l2 92h7V112h0v76h7l2-92h8V50c0-10-6-16-17-16Z" fill="${C.ink}"/>` +
      `<path d="M60 8v186M55 8h10M55 194h10" stroke="${C.gold}" stroke-width="2"/>`
  ),
  sticker(
    "door",
    "plan",
    [100, 100],
    80,
    `<path d="M10 90h80" stroke="${C.ink}" stroke-width="4"/><path d="M14 90V14" stroke="${C.ink}" stroke-width="3"/><path d="M14 14a76 76 0 0 1 76 76" fill="none" stroke="${C.ink}" stroke-width="1.5" stroke-dasharray="4 4"/>`
  ),
  sticker(
    "window",
    "plan",
    [140, 40],
    110,
    `<path d="M4 8h22M114 8h22M4 32h22M114 32h22" stroke="${C.ink}" stroke-width="4"/><rect x="26" y="8" width="88" height="24" fill="${C.cream}" stroke="${C.ink}" stroke-width="2"/><path d="M26 20h88" stroke="${C.ink}" stroke-width="1.5"/>`
  ),
  sticker(
    "dimension",
    "plan",
    [200, 30],
    170,
    `<path d="M6 15h188" stroke="${C.ink}" stroke-width="2"/><path d="M6 4v22M194 4v22" stroke="${C.ink}" stroke-width="2"/><path d="m16 9-10 6 10 6M184 9l10 6-10 6" fill="none" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/>`
  ),
  sticker(
    "light-point",
    "plan",
    [60, 60],
    44,
    `<circle cx="30" cy="30" r="16" fill="none" stroke="${C.ink}" stroke-width="2.5"/><path d="M19 19l22 22M41 19 19 41" stroke="${C.ink}" stroke-width="2.5"/><path d="M30 4v6M30 50v6M4 30h6M50 30h6" stroke="${C.gold}" stroke-width="2.5" stroke-linecap="round"/>`
  ),
  sticker(
    "socket",
    "plan",
    [60, 60],
    40,
    `<path d="M10 40a20 20 0 0 1 40 0Z" fill="${C.cream}" stroke="${C.ink}" stroke-width="2.5"/><path d="M30 40v14M22 26v6M38 26v6" stroke="${C.ink}" stroke-width="2.5" stroke-linecap="round"/>`
  ),
  sticker(
    "sunlight",
    "plan",
    [80, 80],
    60,
    `<circle cx="40" cy="40" r="13" fill="${C.butter}" stroke="${C.gold}" stroke-width="2"/>` +
      `<g stroke="${C.gold}" stroke-width="3" stroke-linecap="round">${range(8)
        .map((i) => {
          const a = (i * Math.PI) / 4;
          return `<path d="M${(40 + Math.cos(a) * 21).toFixed(1)} ${(40 + Math.sin(a) * 21).toFixed(1)}L${(40 + Math.cos(a) * 33).toFixed(1)} ${(40 + Math.sin(a) * 33).toFixed(1)}"/>`;
        })
        .join("")}</g>`
  ),
];

export const STICKERS = RAW.map((s) => ({ ...s, src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s.svg)}` }));
export const STICKERS_BY_ID = Object.fromEntries(STICKERS.map((s) => [s.id, s]));
