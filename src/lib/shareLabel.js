// Pictures to share: a piece's museum label over its photo, and the "wall" of a collection.
// 1080 × 1350 (the portrait format of the social feeds), drawn on a canvas in this browser —
// nothing is uploaded. The label is drawn with the site's own fonts and colours, so the picture
// reads as the same object the pages show.
const W = 1080;
const H = 1350;
const WALL = "#0f0e0c";
const PAPER = "#efe8da";
const INK = "#1b1916";
const INK_SOFT = "#5d574c";
const RULE = "#cfc6b4";
const GOLD = "#c9a44d";
const TEXT = "#f2ecdf";
const FAINT = "#8a8274";
const STAMP = { own: "#3f6b52", want: "#9a4b2c", seen: "#4d5f86", saved: INK_SOFT };
// The fields of lib/MaterialField, as two-stop gradients: what stands behind the label when the
// photo cannot be read into a canvas (its server does not allow it) or does not load.
const MATERIAL = {
  wood: ["#5a3a22", "#2a1a0f"],
  metal: ["#7b8085", "#2a2d30"],
  leather: ["#5b3321", "#34190f"],
  fabric: ["#4a4a3e", "#2c2c24"],
  glass: ["#27413f", "#152322"],
  plastic: ["#b0402c", "#6e2317"],
  cane: ["#a9864f", "#6f5530"],
  marble: ["#d9d4cb", "#a9a39a"],
  paper: ["#2a2721", "#1a1814"],
};

const SERIF = '"Fraunces", Georgia, serif';
const SANS = '"Inter", system-ui, sans-serif';
const MONO = '"IBM Plex Mono", ui-monospace, monospace';

async function fonts() {
  if (!document.fonts?.load) return;
  await Promise.all(
    [`450 60px ${SERIF}`, `italic 400 30px ${SERIF}`, `400 24px ${SANS}`, `400 20px ${MONO}`, `500 20px ${MONO}`].map((font) => document.fonts.load(font).catch(() => null))
  );
}

function loadPhoto(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function wrap(ctx, text, maxWidth, maxLines) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth || !line) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    let last = lines[maxLines - 1];
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
    lines[maxLines - 1] = `${last.trimEnd()}…`;
  }
  return lines;
}

function fit(ctx, text, maxWidth) {
  let out = String(text);
  while (out.length > 1 && ctx.measureText(out).width > maxWidth) out = out.slice(0, -1);
  return out === String(text) ? out : `${out.trimEnd()}…`;
}

function spaced(ctx, text, x, y, spacing, align = "left") {
  // letterSpacing on a canvas is recent; where it is missing the text is simply set tighter.
  ctx.letterSpacing = `${spacing}px`;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
  ctx.letterSpacing = "0px";
  ctx.textAlign = "left";
}

// Draws one label with its top-left corner at (0, 0) of the current transform; `scale` sizes the
// type (1 = the big label of a single piece). Returns the label's height.
function drawLabel(ctx, label, width, scale, { measureOnly = false } = {}) {
  const pad = 44 * scale;
  const inner = width - pad * 2;
  const steps = [];
  let y = pad;

  steps.push(() => {
    ctx.fillStyle = INK_SOFT;
    ctx.font = `400 ${22 * scale}px ${MONO}`;
    ctx.textBaseline = "top";
    if (label.status) spaced(ctx, fit(ctx, String(label.status).toUpperCase(), inner * 0.6), width - pad, pad, 1.8 * scale, "right");
  });
  y += 22 * scale + 20 * scale;

  ctx.font = `450 ${64 * scale}px ${SERIF}`;
  const nameLines = wrap(ctx, label.name, inner, 2);
  const nameY = y;
  steps.push(() => {
    ctx.fillStyle = INK;
    ctx.font = `450 ${64 * scale}px ${SERIF}`;
    nameLines.forEach((line, i) => ctx.fillText(line, pad, nameY + i * 70 * scale));
  });
  y += nameLines.length * 70 * scale + 8 * scale;

  if (label.by) {
    const byY = y;
    steps.push(() => {
      ctx.fillStyle = INK_SOFT;
      ctx.font = `italic 400 ${34 * scale}px ${SERIF}`;
      ctx.fillText(fit(ctx, label.by, inner), pad, byY);
    });
    y += 34 * scale + 14 * scale;
  }

  const rows = (label.rows ?? []).filter((row) => row && row.value);
  if (rows.length) {
    y += 18 * scale;
    const ruleY = y;
    steps.push(() => {
      ctx.fillStyle = RULE;
      ctx.fillRect(pad, ruleY, inner, Math.max(1, 2 * scale));
    });
    y += 24 * scale;
    for (const row of rows) {
      const rowY = y;
      steps.push(() => {
        ctx.fillStyle = INK_SOFT;
        ctx.font = `400 ${19 * scale}px ${MONO}`;
        spaced(ctx, String(row.label).toUpperCase(), pad, rowY + 6 * scale, 1.5 * scale);
        ctx.fillStyle = INK;
        ctx.font = `400 ${27 * scale}px ${SANS}`;
        ctx.fillText(fit(ctx, row.value, inner - 250 * scale), pad + 250 * scale, rowY);
      });
      y += 40 * scale;
    }
  }

  if (label.stamp) y += 58 * scale;
  const height = y + pad - 10 * scale;
  if (measureOnly) return height;

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
  ctx.shadowBlur = 50 * scale;
  ctx.shadowOffsetY = 22 * scale;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
  steps.forEach((step) => step());

  if (label.stamp) {
    ctx.save();
    ctx.font = `500 ${20 * scale}px ${MONO}`;
    ctx.letterSpacing = `${2.6 * scale}px`;
    const text = String(label.stamp.text).toUpperCase();
    const w = ctx.measureText(text).width + 26 * scale;
    const h = 38 * scale;
    ctx.translate(width - pad - w / 2, height - pad + 6 * scale - h / 2);
    ctx.rotate((4 * Math.PI) / 180);
    ctx.strokeStyle = ctx.fillStyle = STAMP[label.stamp.status] ?? INK_SOFT;
    ctx.lineWidth = 3 * scale;
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 0, 1 * scale);
    ctx.restore();
  }
  return height;
}

function footer(ctx, tagline) {
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = TEXT;
  ctx.font = `400 38px ${SERIF}`;
  ctx.fillText("Design Archive", 72, H - 66);
  if (tagline) {
    ctx.fillStyle = FAINT;
    ctx.font = `400 20px ${MONO}`;
    spaced(ctx, tagline.toUpperCase(), W - 72, H - 68, 1.6, "right");
  }
}

function canvas() {
  const el = document.createElement("canvas");
  el.width = W;
  el.height = H;
  const ctx = el.getContext("2d");
  ctx.fillStyle = WALL;
  ctx.fillRect(0, 0, W, H);
  return [el, ctx];
}

const toBlob = (el) => new Promise((resolve, reject) => {
  try {
    el.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("empty"))), "image/png");
  } catch (error) {
    reject(error);
  }
});

function drawPiece(ctx, { label, photo, material }) {
  const photoH = 900;
  if (photo) {
    const scale = Math.max(W / photo.naturalWidth, photoH / photo.naturalHeight);
    const w = photo.naturalWidth * scale;
    const h = photo.naturalHeight * scale;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, photoH);
    ctx.clip();
    ctx.drawImage(photo, (W - w) / 2, (photoH - h) / 2, w, h);
    ctx.restore();
  } else {
    const [from, to] = MATERIAL[material] ?? MATERIAL.paper;
    const gradient = ctx.createLinearGradient(0, 0, W, photoH);
    gradient.addColorStop(0, from);
    gradient.addColorStop(1, to);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, photoH);
  }
  // The label hangs over the photo's foot, a little askew, the way it is pinned on the pages.
  const width = 880;
  const height = drawLabel(ctx, label, width, 1, { measureOnly: true });
  ctx.save();
  ctx.translate((W - width) / 2, Math.min(photoH - 150, H - 170 - height));
  ctx.rotate((-1.2 * Math.PI) / 180);
  drawLabel(ctx, label, width, 1);
  ctx.restore();
}

// The label of one piece over its photo.
//   label    { status, name, by, rows: [{ label, value }], stamp: { status, text } }
//   image    the photo's address (optional); material: the piece's material family
export async function pieceLabelImage({ label, image, material, tagline }) {
  await fonts();
  const photo = await loadPhoto(image);
  let [el, ctx] = canvas();
  drawPiece(ctx, { label, photo, material });
  footer(ctx, tagline);
  try {
    return await toBlob(el);
  } catch {
    // The photo's server does not let a canvas read it back: the label on its material instead.
    [el, ctx] = canvas();
    drawPiece(ctx, { label, photo: null, material });
    footer(ctx, tagline);
    return toBlob(el);
  }
}

// The collection as a wall: up to nine labels, three across, each a little askew, under a title.
//   labels   as above (no rows needed); title and summary are the header's two lines
export async function collectionWallImage({ labels, title, summary, tagline }) {
  await fonts();
  const [el, ctx] = canvas();
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = TEXT;
  ctx.font = `350 84px ${SERIF}`;
  ctx.fillText(fit(ctx, title, W - 144), 72, 170);
  ctx.fillStyle = GOLD;
  ctx.font = `400 22px ${MONO}`;
  spaced(ctx, String(summary).toUpperCase(), 72, 222, 1.6);

  // The fewer the labels, the bigger they hang: one column up to three, two up to six, then three.
  const shown = labels.slice(0, 9).map((label) => ({ ...label, rows: [] }));
  const columns = shown.length <= 3 ? 1 : shown.length <= 6 ? 2 : 3;
  const gap = 34;
  const width = columns === 1 ? 760 : (W - 144 - gap * (columns - 1)) / columns;
  const scale = [0.86, 0.62, 0.42][columns - 1];
  const left = (W - (width * columns + gap * (columns - 1))) / 2;
  const tilts = [-0.9, 0.7, -0.5, 0.8, -0.7, 0.5, 0.6, -0.8, 0.4];
  const heights = shown.map((label) => drawLabel(ctx, label, width, scale, { measureOnly: true }));
  const columnHeight = (column) => heights.reduce((sum, height, i) => (i % columns === column ? sum + height + gap : sum), -gap);
  const tallest = Math.max(...Array.from({ length: columns }, (_, column) => columnHeight(column)));
  // The wall sits in the middle of the room between the header and the signature.
  const top = 290 + Math.max(0, (H - 200 - 290 - tallest) / 2);
  const tops = new Array(columns).fill(top);
  shown.forEach((label, i) => {
    const column = i % columns;
    ctx.save();
    ctx.translate(left + column * (width + gap), tops[column]);
    ctx.rotate((tilts[i] * Math.PI) / 180);
    drawLabel(ctx, label, width, scale);
    ctx.restore();
    tops[column] += heights[i] + gap;
  });
  footer(ctx, tagline);
  return toBlob(el);
}

// The tints of the story covers (styles/tokens.css, --tone-*): background and ink.
const TONES = {
  cream: ["#efe8da", "#17160f"],
  teal: ["#6f9c95", "#0e0e0e"],
  pink: ["#e2a3b4", "#2a1118"],
  gold: ["#c9a44d", "#17160f"],
  ink: ["#24211d", "#f2ecdf"],
  cloud: ["#e9e6e0", "#2b2921"],
  orange: ["#d9793f", "#1a0f08"],
  brown: ["#6b4a2e", "#f4efe6"],
};

// The cover of a story with its title under it. A typographic cover is its figure set as large as
// the width allows on the story's tint; a cover about one piece is that piece's photo and label.
//   cover    { mark, tone } or { piece: { label, image, material } }
//   kicker   the typed line above the title (category · minutes)
export async function storyCoverImage({ cover, kicker, title, tagline }) {
  await fonts();
  const draw = (photo) => {
    const [el, ctx] = canvas();
    const coverH = 860;
    if (cover.piece) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, coverH);
      ctx.clip();
      drawPiece(ctx, { label: cover.piece.label, photo, material: cover.piece.material });
      ctx.restore();
    } else {
      const [bg, ink] = TONES[cover.tone] ?? TONES.ink;
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, coverH);
      ctx.fillStyle = ink;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      let size = 460;
      do {
        ctx.font = `400 ${size}px ${SERIF}`;
        size -= 10;
      } while (size > 60 && ctx.measureText(cover.mark).width > W - 160);
      ctx.letterSpacing = `${-size * 0.03}px`;
      ctx.fillText(cover.mark, W / 2, coverH / 2 + size * 0.04);
      ctx.letterSpacing = "0px";
      ctx.textAlign = "left";
    }
    ctx.textBaseline = "top";
    ctx.fillStyle = GOLD;
    ctx.font = `400 22px ${MONO}`;
    spaced(ctx, String(kicker).toUpperCase(), 72, coverH + 56, 1.6);
    ctx.fillStyle = TEXT;
    ctx.font = `400 60px ${SERIF}`;
    wrap(ctx, title, W - 144, 3).forEach((line, i) => ctx.fillText(line, 72, coverH + 104 + i * 68));
    footer(ctx, tagline);
    return el;
  };
  const photo = cover.piece ? await loadPhoto(cover.piece.image) : null;
  try {
    return await toBlob(draw(photo));
  } catch {
    // The photo's server does not let a canvas read it back: the label on its material instead.
    return toBlob(draw(null));
  }
}

// Hands the picture to the phone's share sheet where there is one, or saves it as a file.
// Returns "shared", "saved" or "cancelled".
export async function shareImage(blob, filename, text) {
  const file = new File([blob], filename, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: text, text });
      return "shared";
    } catch (error) {
      if (error?.name === "AbortError") return "cancelled";
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return "saved";
}
