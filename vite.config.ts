import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// En ligne, le jeu vit dans le sous-dossier /jeu_edu/ de GitHub Pages ; en essai, à la racine.
export default defineConfig(({ command, isPreview }) => {
  // L'aperçu de la version construite (vite preview) sert aussi /jeu_edu/, comme en ligne.
  const base = command === 'build' || isPreview ? '/jeu_edu/' : '/';
  return {
    base,
    build: {
      target: 'es2022',
      // Three.js pèse à lui seul environ 500 ko : c'est attendu.
      chunkSizeWarningLimit: 800,
      // ville.html : la ville en construction (docs/VILLE.md), à part du jeu actuel.
      rollupOptions: { input: { accueil: 'index.html', ville: 'ville.html', ancienne: 'ancienne-fete.html', essais: 'essais-fete.html' } },
    },
    plugins: [
      VitePWA({
        // Une nouvelle version attend que l'enfant soit sur l'écran d'accueil ou dans la fête :
        // jamais de rechargement en plein exercice (src/app/miseAJour.ts).
        registerType: 'prompt',
        injectRegister: false,
        includeAssets: ['icone.svg', 'icone-192.png', 'icone-512.png'],
        manifest: {
          name: 'MiniVille',
          short_name: 'MiniVille',
          lang: 'fr',
          // Identité explicite et adresses absolues : Android ouvre alors l'icône comme une vraie
          // application (même correctif que Golémanciens).
          id: 'jeu-edu',
          // L'appli s'ouvre sur la ville ; index.html y renvoie aussi. L'ancien jeu est archivé
          // (ancienne-fete.html), à une adresse que rien n'affiche.
          start_url: `${base}ville.html`,
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
          navigateFallback: `${base}ville.html`,
          cleanupOutdatedCaches: true,
        },
      }),
    ],
  };
});
