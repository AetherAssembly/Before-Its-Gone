import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const require = createRequire(import.meta.url);
const pkg = require('./package.json') as { version: string };

export default defineConfig({
  plugins: [react()],
  base: './',
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version)
  },
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
