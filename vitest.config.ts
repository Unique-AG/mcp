import swc from 'unplugin-swc';

export const globalConfig = {
  test: {
    globals: true,
    environment: 'node',
    passWithNoTests: true,
    clearMocks: true,
    reporters: ['verbose'],
  },
  plugins: [swc.vite({ module: { type: 'es6' } })],
};
