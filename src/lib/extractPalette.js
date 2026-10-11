// "Extract from the selected piece": the main colours of a photo, worked out in this browser on a
// small canvas — nothing is uploaded. The picture is shrunk to 64 px, its colours counted in
// coarse buckets, and the most common ones kept as long as they are clearly different.
// Throws when the photo's server does not let a canvas read it.
const SIZE = 64;
const STEP = 24;

const hex = (r, g, b) => `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

function load(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith("data:")) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function extractPalette(src, count = 5) {
  const img = await load(src);
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, SIZE, SIZE);
  const { data } = ctx.getImageData(0, 0, SIZE, SIZE);
  const buckets = new Map();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const key = [data[i], data[i + 1], data[i + 2]].map((v) => Math.floor(v / STEP)).join(",");
    const bucket = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    bucket.n += 1;
    bucket.r += data[i];
    bucket.g += data[i + 1];
    bucket.b += data[i + 2];
    buckets.set(key, bucket);
  }
  const ranked = [...buckets.values()].sort((a, b) => b.n - a.n).map((b) => [b.r / b.n, b.g / b.n, b.b / b.n]);
  const picked = [];
  for (const colour of ranked) {
    if (picked.every((other) => distance(colour, other) > 48)) picked.push(colour);
    if (picked.length === count) break;
  }
  return picked.map((c) => hex(...c));
}
