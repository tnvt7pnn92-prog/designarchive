// Exporting a moodboard as an image: three times the board size, for print and screens alike.
// Returns { url, skipped }: skipped counts the photos left out because their host refuses to
// share them (see MoodboardCanvas exportImage).
export function boardPng(canvasApi) {
  const { url, skipped } = canvasApi.exportImage({ pixelRatio: 3 });
  // Konva answers a canvas it cannot read with an empty string rather than an error: a file made
  // from that would be empty, so it counts as a failure.
  if (!url?.startsWith("data:image/png")) throw new Error("export_failed");
  return { url, skipped };
}

export function downloadDataUrl(dataUrl, name) {
  const link = document.createElement("a");
  link.download = name;
  link.href = dataUrl;
  link.click();
}
