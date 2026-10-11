// Faces only the moodboard uses: the handwritten Caveat, Space Mono and Inter italic (canvas text
// can be italic). Every other page gets by with Fraunces and upright Inter from index.html, so
// these are requested only when the moodboard route starts loading.
const MOODBOARD_FONTS =
  "https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Inter:ital,wght@1,400;1,700&family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700&display=swap";

export function loadMoodboardFonts() {
  if (typeof document === "undefined" || document.getElementById("moodboard-fonts")) return;
  const link = document.createElement("link");
  link.id = "moodboard-fonts";
  link.rel = "stylesheet";
  link.href = MOODBOARD_FONTS;
  link.crossOrigin = "anonymous";
  document.head.appendChild(link);
}
