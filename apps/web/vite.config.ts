import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@before-its-gone/core': path.resolve(rootDir, '../../packages/core/src'),
      '@before-its-gone/ui': path.resolve(rootDir, '../../packages/ui/src')
    }
  },
  server: {
    port: 5173,
    strictPort: true
  }
});
