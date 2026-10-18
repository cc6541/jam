import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Base relative : le build statique est publiable tel quel (GitHub Pages) et embarquable par Capacitor.
export default defineConfig({
  base: './',
  plugins: [react()],
  // Un seul fichier JS : plus simple à embarquer (Capacitor) et à publier tel quel en démo.
  // Polices inlinées (data:) : l'app tourne hors ligne et sous CSP stricte sans requête de police.
  build: { target: 'es2022', assetsInlineLimit: 100_000, rollupOptions: { output: { inlineDynamicImports: true } } },
});
