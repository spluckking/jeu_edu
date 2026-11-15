import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// En ligne, le jeu vit dans le sous-dossier /jeu_edu/ de GitHub Pages ; en essai, à la racine.
export default defineConfig(({ command }) => {
  const base = command === 'build' ? '/jeu_edu/' : '/';
  return {
    base,
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
          // Identité explicite et adresses absolues : Android ouvre alors l'icône comme une vraie
          // application (même correctif que Golémanciens).
          id: 'jeu-edu',
          start_url: base,
          scope: base,
          // Plein écran et paysage sont demandés par le jeu au premier toucher (src/app/modeApp.ts) :
          // avec « fullscreen » et « landscape » dans le manifeste, l'icône ne s'ouvrait pas sur Android.
          display: 'standalone',
          orientation: 'any',
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
          globPatterns: ['**/*.{js,css,html,svg,png,woff2,json,mp3,ogg,webmanifest}'],
          navigateFallback: `${base}index.html`,
          cleanupOutdatedCaches: true,
        },
      }),
    ],
  };
});
