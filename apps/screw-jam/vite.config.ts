import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Base relative : le build statique est publiable tel quel (GitHub Pages) et embarquable par Capacitor.
export default defineConfig({
  base: './',
  plugins: [react()],
  // Un seul fichier JS : plus simple à embarquer (Capacitor) et à publier tel quel en démo.
  build: { target: 'es2022', rollupOptions: { output: { inlineDynamicImports: true } } },
});
