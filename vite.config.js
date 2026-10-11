import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
//
// The site is published on GitHub Pages. A project site lives under /<repository-name>/, a user
// site or a custom domain at /: the deploy workflow sets VITE_BASE accordingly, and a local
// build defaults to /.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  // MapLibre loads its worker from a file next to its own (new URL(…, import.meta.url)): pre-bundled
  // into .vite/deps, that file is left behind and the map cannot start in development.
  optimizeDeps: { exclude: ['maplibre-gl'] },
  // Web workers as ES modules: MapLibre's worker imports the code it shares with the page.
  worker: { format: 'es' },
  // The manifest tells scripts/prerender.mjs which files each page's code is in, so a prerendered
  // page can start downloading its own code together with the app's (it is removed afterwards).
  build: { manifest: true },
})
