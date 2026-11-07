import { fileURLToPath } from 'node:url';
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
      input: {
        index: fileURLToPath(new URL('./src/index.html', import.meta.url)),
        hr: fileURLToPath(new URL('./src/hr.html', import.meta.url)),
        drive: fileURLToPath(new URL('./src/drive.html', import.meta.url)),
      },
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/three/')) return 'three';
        },
      },
    },
  },
});
