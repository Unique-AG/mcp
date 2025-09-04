import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    environment: 'node',
    passWithNoTests: true,
    clearMocks: true,
    include: ['**/*.spec.ts'],
    reporters: ['verbose'],
    setupFiles: ['./test/setup.ts'],
  },
  plugins: [swc.vite({ module: { type: 'es6' } })],
});
