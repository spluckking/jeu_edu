// Captures de référence au format tablette (Xiaomi Pad 7 Pro en paysage : 1600 × 1068 CSS, ×2),
// et mesure des images par seconde. À lancer avec le serveur de développement démarré :
//   npx vite --port 5175 --strictPort
//   node scripts/captures.mjs docs/captures/avant
// Rien ne part sur Internet : le jeu tourne en local, avec une sauvegarde d'essai.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const SORTIE = process.argv[2] ?? 'docs/captures/avant';
const BASE = process.env.ADRESSE ?? 'http://localhost:5175/';
const JOUR = '2026-11-16';
mkdirSync(SORTIE, { recursive: true });

const navigateur = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const contexte = await navigateur.newContext({ viewport: { width: 1600, height: 1068 }, deviceScaleFactor: 2, hasTouch: true });
const page = await contexte.newPage();
const erreurs = [];
page.on('pageerror', (e) => erreurs.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') erreurs.push(m.text());
});

const attendre = (ms) => page.waitForTimeout(ms);
const photo = async (nom) => {
  // JPEG : les PNG pleine définition pèseraient plus d'1 Mo chacun dans le dépôt.
  await page.screenshot({ path: join(SORTIE, `${nom}.jpg`), type: 'jpeg', quality: 82 });
  console.log('capture', nom);
};

// Une sauvegarde d'essai : introduction déjà réussie, prénoms des forains, quelques tickets.
await page.goto(`${BASE}?essai&jour=${JOUR}`);
await page.waitForSelector('#entrer');
await page.evaluate(async () => {
  const { sauvegardeNeuve, suiviNeuf } = await import('/src/sauvegarde/format.ts');
  const s = sauvegardeNeuve();
  s.lectures.introduction = { ...suiviNeuf(), lectures: 1, questions: 3, justes: 3, reussie: true };
  s.forains = { chamboule: 'Marcel', confiserie: 'Lila', chantier: 'Bruno', horloge: 'Pia', peche: 'Lou' };
  s.tickets = 12;
  s.roue = 3;
  s.codeParent = '1234';
  await new Promise((ok, ko) => {
    const d = indexedDB.open('jeu-edu', 1);
    d.onupgradeneeded = () => d.result.createObjectStore('donnees');
    d.onsuccess = () => {
      const t = d.result.transaction('donnees', 'readwrite');
      t.objectStore('donnees').put(s, 'sauvegarde');
      t.oncomplete = ok;
      t.onerror = () => ko(t.error);
    };
  });
});

async function ouvrir(params = '') {
  await page.goto(`${BASE}?essai&fps&jour=${JOUR}${params}`);
  await page.waitForSelector('#entrer');
  await attendre(1500);
}
async function entrer() {
  await page.click('#entrer');
  await attendre(2500);
}

async function ips(secondes) {
  await attendre(secondes * 1000);
  return page.evaluate(() => Number(document.body.dataset.ips ?? 0));
}

const mesures = {};

// 1. Écran d'accueil, puis la grande porte.
await ouvrir();
await photo('01-accueil');
await entrer();
await attendre(2500);
await photo('02-arrivee-porte');
mesures.porte = await ips(4);
mesures.appelsPorte = await page.evaluate(() => Number(document.body.dataset.appels));

// 2. Au milieu de la fête, devant chaque stand.
const approches = await page.evaluate(() => window.essai.approches());
const centre = approches.find(([id]) => id === 'chamboule');
await page.evaluate(() => window.essai.placer(0, 2, Math.PI));
await attendre(2000);
await photo('03-promenade-centre');
mesures.centre = await ips(4);
mesures.appelsCentre = await page.evaluate(() => Number(document.body.dataset.appels));

const STANDS = ['chamboule', 'confiserie', 'chantier', 'horloge', 'peche'];
let n = 4;
for (const id of STANDS) {
  const a = approches.find(([x]) => x === id);
  if (!a) continue;
  await ouvrir();
  await entrer();
  await page.evaluate(([x, z]) => window.essai.placer(x, z, Math.PI), [a[1], a[2]]);
  await attendre(1200);
  if (id === 'chamboule') await photo(`${String(n++).padStart(2, '0')}-devant-un-stand`);
  if (!(await page.isVisible('#interagir'))) {
    console.log('pas de bouton Entrer devant', id);
    continue;
  }
  await page.click('#interagir');
  await attendre(2500);
  await photo(`${String(n++).padStart(2, '0')}-stand-${id}`);
  if (await page.isVisible('#carte-bouton')) {
    await page.click('#carte-bouton');
    await attendre(2000);
    await photo(`${String(n++).padStart(2, '0')}-exercice-${id}`);
    if (id === 'chamboule') mesures.exercice = await ips(3);
  }
}

// 3. Les lots, l'histoire du jour, l'espace parent.
await ouvrir();
await entrer();
await page.click('#garderobe', { force: true });
await attendre(1200);
await photo(`${String(n++).padStart(2, '0')}-lots`);

await ouvrir();
await entrer();
await page.click('#histoire', { force: true });
await attendre(1500);
await photo(`${String(n++).padStart(2, '0')}-histoire-du-jour`);

await ouvrir();
await page.evaluate(() => document.getElementById('parent').dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, bubbles: true })));
await attendre(1800);
await page.fill('.vitrine input', '1234');
await page.click('.vitrine .bouton-principal');
await attendre(800);
await photo(`${String(n++).padStart(2, '0')}-espace-parent`);

// 4. La pause calme et l'introduction.
await ouvrir('&pause');
await entrer();
await attendre(3000);
await photo(`${String(n++).padStart(2, '0')}-pause-calme`);

await ouvrir('&intro');
await entrer();
await attendre(4000);
await photo(`${String(n++).padStart(2, '0')}-introduction`);
mesures.introduction = await ips(3);

writeFileSync(join(SORTIE, 'mesures.json'), JSON.stringify({ mesures, erreurs }, null, 2));
console.log(JSON.stringify({ mesures, erreurs }, null, 2));
await navigateur.close();
