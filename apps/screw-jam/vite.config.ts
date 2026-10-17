import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Base relative : le build statique est publiable tel quel (GitHub Pages) et embarquable par Capacitor.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { target: 'es2022' },
});
