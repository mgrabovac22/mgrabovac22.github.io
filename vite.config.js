import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { renderSite } from './src/site.js';

const portfolioPath = new URL('./portfolio.json', import.meta.url);
const readPortfolio = () => readFileSync(portfolioPath, 'utf8');

export default defineConfig({
  root: 'src',
  publicDir: '../public',
  base: './',
  plugins: [{
    name: 'portfolio-html',
    transformIndexHtml: { order: 'pre', handler: (html, context) => renderSite(html, context, JSON.parse(readPortfolio())) },
    configureServer(server) {
      server.middlewares.use('/portfolio.json', (_request, response) => {
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        response.setHeader('Cache-Control', 'no-cache');
        response.end(readPortfolio());
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'portfolio.json', source: readPortfolio() });
    },
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
