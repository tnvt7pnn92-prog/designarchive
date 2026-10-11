// Exporting a moodboard as an image: three times the board size, for print and screens alike.

export function boardPng(canvasApi) {
  return canvasApi.exportImage({ pixelRatio: 3 });
}

export function downloadDataUrl(dataUrl, name) {
  const link = document.createElement("a");
  link.download = name;
  link.href = dataUrl;
  link.click();
}
