import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Resolve @pauly/core to the local source for development
      '@pauly/core': path.resolve(__dirname, '../../packages/core/src/index.ts'),
    },
  },
  css: {
    modules: {
      // Generate readable class names in dev for easier debugging
      generateScopedName: '[name]__[local]___[hash:base64:5]',
    },
  },
});
