// A headless browser for the checking scripts, using the Chrome or Edge already installed (so
// playwright-core never downloads one). CHROME_PATH overrides the search.
import { existsSync } from "node:fs";
import { chromium } from "playwright-core";

const CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

export async function launchBrowser() {
  const executablePath = CANDIDATES.find((file) => existsSync(file));
  if (!executablePath) throw new Error("No Chrome/Edge found: set CHROME_PATH to a Chromium-based browser.");
  return chromium.launch({ executablePath });
}
