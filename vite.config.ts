import { defineConfig } from 'vite';

// Relative assets support project Pages, local static hosts, and webview wrappers.
export default defineConfig({
  base: './',
  build: { target: 'es2020' },
});
