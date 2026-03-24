import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/utils/ref-store.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  external: ['react', 'react-dom', 'zod']
});
