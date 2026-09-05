/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import stylex from '@stylexjs/unplugin';

// Dev only: link the StyleX virtual stylesheet into index.html.
const stylexDevHtml = (): Plugin => ({
  name: 'stylex-dev-html',
  apply: 'serve',
  transformIndexHtml: () => [
    { tag: 'link', attrs: { rel: 'stylesheet', href: '/virtual:stylex.css' }, injectTo: 'head' },
  ],
});

export default defineConfig({
  plugins: [
    stylex.vite({
      unstable_moduleResolution: { type: 'commonJS', rootDir: process.cwd() },
    }),
    stylexDevHtml(),
    react(),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
