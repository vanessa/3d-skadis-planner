/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import stylex from '@stylexjs/unplugin';

// The unplugin's own transformIndexHtml already injects the StyleX runtime
// script and stylesheet link in dev, so no extra HTML-injection plugin is
// needed here.
const stylexPlugin = stylex.vite({
  unstable_moduleResolution: { type: 'commonJS', rootDir: process.cwd() },
});

// Under Vitest, configureServer's setInterval is never cleared (it only
// clears on the real httpServer's 'close' event, which Vitest's Vite
// server never fires), leaving the process alive until Vitest force-closes
// it. Dropping just that hook when running under Vitest avoids the delay
// without touching any other StyleX behavior.
const stylexForConfig = process.env.VITEST
  ? { ...stylexPlugin, configureServer: undefined }
  : stylexPlugin;

export default defineConfig({
  plugins: [stylexForConfig, react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
