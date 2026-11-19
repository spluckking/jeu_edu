// Captures du prototype « la ville » (serveur de dev lancé sur le port 5175).
// node scripts/captures-ville.mjs <dossier>
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const dossier = process.argv[2] ?? 'docs/captures/prototype-ville';
fs.mkdirSync(dossier, { recursive: true });
const navigateur = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await navigateur.newPage({ viewport: { width: 1600, height: 1000 } });
for (const vue of ['place', 'maison', 'fete', 'comparer', 'interieur']) {
  await page.goto(`http://localhost:5175/prototypes/ville/index.html?vue=${vue}`);
  await page.waitForFunction(() => document.body.dataset.pret === '1', null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(dossier, `${vue}.jpg`), type: 'jpeg', quality: 85 });
  console.log('capture', vue);
}
await navigateur.close();
