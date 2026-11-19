// The My Pets homepage and /press (plan § Architecture). scripts/build.mjs runs Astro's build() with
// this root and dist/ as outDir, before the card page's esbuild steps. Static, no integrations, no
// client script; stylesheets and assets are files (never inline, never data: URLs), so the homepage CSP
// needs no 'unsafe-inline'.
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://pets.binarybridges.co',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file', assets: '_astro', inlineStylesheets: 'never' },
  devToolbar: { enabled: false },
  vite: { plugins: [tailwindcss()], build: { assetsInlineLimit: 0 } },
});
