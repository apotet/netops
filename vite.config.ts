import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { SHARED_ASSETS_OG_IMAGE_URL } from './src/config/sharedAssets.ts';

export default defineConfig(() => {
  return {
    // Project site: https://apotet.github.io/netops/
    base: '/netops/',
    plugins: [react(), tailwindcss(), {
      name: 'shared-assets-html',
      transformIndexHtml(html) {
        return html.replaceAll('__SHARED_ASSETS_OG_IMAGE_URL__', SHARED_ASSETS_OG_IMAGE_URL);
      },
    }],
    build: {
      outDir: 'dist',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('questions.json')) return 'questions-data';
            if (id.includes('lucide-react')) return 'icons';
            if (id.includes('node_modules/react')) return 'vendor-react';
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
