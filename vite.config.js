import { defineConfig } from 'vite';
import { renderSite } from './src/site.js';

export default defineConfig({
  root: 'src',
  publicDir: '../public',
  base: './',
  plugins: [{
    name: 'portfolio-html',
    transformIndexHtml: { order: 'pre', handler: renderSite },
  }],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    assetsDir: 'site-assets',
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/three/')) return 'three';
        },
      },
    },
  },
});
