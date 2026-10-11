// Hands the board picture from the editor to the print page (/moodboard/print), and keeps the
// visitor's own logo for the title block in this browser (the key keeps its old name, so a logo
// added before stays).
let sheet = null;

export function setPrintSheet(value) {
  sheet = value;
}

export function getPrintSheet() {
  return sheet;
}

const LOGO_KEY = "design-archive:studio-logo";

export function readLogo() {
  try {
    return localStorage.getItem(LOGO_KEY);
  } catch {
    return null;
  }
}

export function writeLogo(dataUrl) {
  try {
    if (dataUrl) localStorage.setItem(LOGO_KEY, dataUrl);
    else localStorage.removeItem(LOGO_KEY);
    return true;
  } catch {
    return false;
  }
}
