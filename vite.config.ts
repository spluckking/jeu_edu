import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Chemins relatifs : le jeu marche à la racine comme dans un sous-dossier de GitHub Pages.
  base: './',
  build: {
    target: 'es2022',
    // Three.js pèse à lui seul environ 500 ko : c'est attendu.
    chunkSizeWarningLimit: 800,
    rollupOptions: { input: 'index.html' },
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icone.svg', 'icone-192.png', 'icone-512.png'],
      manifest: {
        name: 'La fête foraine',
        short_name: 'Fête foraine',
        lang: 'fr',
        start_url: './',
        scope: './',
        display: 'fullscreen',
        orientation: 'landscape',
        background_color: '#cfeeff',
        theme_color: '#3fa0ff',
        icons: [
          { src: 'icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icone-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Tout est mis en cache dès la première ouverture : le jeu marche ensuite sans réseau.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json,mp3,ogg}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
});
