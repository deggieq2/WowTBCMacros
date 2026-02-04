import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const root = path.resolve(__dirname, '../..');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(root, 'packages/shared/src'),
      '@data': path.resolve(root, 'packages/data/data'),
      '@content': path.resolve(root, 'content/curated')
    }
  },
  server: {
    port: 5173,
    fs: {
      allow: [root]
    }
  }
});
