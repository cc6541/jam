import { defineConfig } from 'vite';

// Build statique (base relative) : publiable tel quel sur GitHub Pages pour mesurer sur téléphone.
export default defineConfig({
  base: './',
  build: { target: 'es2022', outDir: '../dist/demo', emptyOutDir: true },
});
