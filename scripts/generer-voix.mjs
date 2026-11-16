// Génère à l'avance les phrases lues à voix haute, avec une voix neurale française d'Azure AI
// Speech, en MP3 dans public/voix/. Le jeu les joue hors ligne ; une phrase absente est lue par
// la voix de la tablette, comme avant. La tablette n'appelle jamais Azure.
//
//   node scripts/generer-voix.mjs                 tout ce qui manque, voix par défaut
//   node scripts/generer-voix.mjs --essai         3 voix sur les mêmes phrases, dans docs/voix-essais/
//   node scripts/generer-voix.mjs --voix fr-FR-HenriNeural
//   node scripts/generer-voix.mjs --liste         affiche les phrases, sans rien générer
//
// La clé et la région sont lues dans .env (AZURE_SPEECH_KEY, AZURE_SPEECH_REGION), jamais dans
// le dépôt. Seules les phrases nouvelles ou modifiées sont générées : le quota est épargné.

import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleVoix, empreinte, normaliserPhrase } from '../src/son/cle-voix.ts';

const RACINE = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const SORTIE = join(RACINE, 'public', 'voix');
const MANIFESTE = join(SORTIE, 'manifest.json');
const VOIX_DEFAUT = 'fr-FR-DeniseNeural';
const VOIX_ESSAI = ['fr-FR-DeniseNeural', 'fr-FR-HenriNeural', 'fr-FR-EloiseNeural'];

const args = process.argv.slice(2);
const voix = args.includes('--voix') ? args[args.indexOf('--voix') + 1] : VOIX_DEFAUT;

// --- La clé, depuis .env ----------------------------------------------------------------
function lireEnv() {
  const env = {};
  const chemin = join(RACINE, '.env');
  if (!existsSync(chemin)) return env;
  for (const ligne of readFileSync(chemin, 'utf8').split(/\r?\n/)) {
    const m = ligne.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

// --- Les phrases --------------------------------------------------------------------------
/** Les phrases du jeu : { texte, mode }. Celles qui contiennent un prénom ou un nombre tiré au
 *  hasard ne peuvent pas être connues à l'avance : la voix de la tablette les lit. */
function rassemblerPhrases() {
  const phrases = new Map();
  const ajouter = (texte, mode = 'normal') => {
    const t = normaliserPhrase(texte);
    if (t.length < 2 || /[{}$]/.test(t)) return;
    phrases.set(cleVoix(t, mode), { texte: t, mode });
  };

  // 1. Les phrases écrites dans le code : dire('…') et parler('…').
  const fichiers = [];
  const parcourir = (dossier) => {
    for (const nom of readdirSync(dossier, { withFileTypes: true })) {
      const chemin = join(dossier, nom.name);
      if (nom.isDirectory()) parcourir(chemin);
      else if (nom.name.endsWith('.ts') && !nom.name.endsWith('.test.ts')) fichiers.push(chemin);
    }
  };
  parcourir(join(RACINE, 'src'));
  const appel = /\b(?:dire|parler)\(\s*(?:'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)"|`([^`$]*)`)/g;
  for (const f of fichiers) {
    const code = readFileSync(f, 'utf8');
    for (const m of code.matchAll(appel)) ajouter((m[1] ?? m[2] ?? m[3]).replace(/\\'/g, "'"));
  }
  // Les phrases de la pause calme sont dans des listes.
  for (const f of fichiers.filter((x) => /detente[\\/](pause|regles)\.ts$/.test(x))) {
    for (const m of readFileSync(f, 'utf8').matchAll(/'([^'\n]{12,})'/g)) if (/[.!?]$/.test(m[1])) ajouter(m[1]);
  }

  // 2. Les mots de la dictée et leurs corrections, depuis les paquets de contenus.
  const paquets = join(RACINE, 'content', 'packs');
  for (const nom of readdirSync(paquets).filter((n) => n.endsWith('.json'))) {
    const p = JSON.parse(readFileSync(join(paquets, nom), 'utf8'));
    for (const e of p.elements ?? []) {
      if (p.type === 'mots' && e.mot) {
        ajouter(e.phrase ? `${e.mot}. ${e.phrase} ${e.mot}.` : `${e.mot}. ${e.mot}.`, 'dictee');
        ajouter(`On écrit ${e.mot}. On le revoit tout à l'heure.`, 'dictee');
      }
    }
  }

  // 3. Les tables de multiplication (chamboule-tout) : « 3 fois 8 ».
  for (let a = 0; a <= 10; a++) for (let b = 0; b <= 10; b++) ajouter(`${a} fois ${b}`);

  // 4. Le feuilleton : chaque épisode, lu d'un bloc quand l'enfant touche « Écouter ».
  const feuilleton = join(RACINE, 'content', 'feuilleton');
  for (const nom of readdirSync(feuilleton).filter((n) => n.endsWith('.json'))) {
    const s = JSON.parse(readFileSync(join(feuilleton, nom), 'utf8'));
    if (!s.valide) continue;
    for (const e of s.episodes ?? []) ajouter((e.phrases ?? []).join(' '));
  }
  return phrases;
}

// --- Azure ---------------------------------------------------------------------------------
const echapper = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function ssml(texte, mode, nomVoix) {
  // Dictée : plus lent, et une vraie pause entre le mot, la phrase et le mot répété.
  const corps =
    mode === 'dictee'
      ? `<prosody rate="-28%">${texte
          .split(/(?<=\.)\s+/)
          .map(echapper)
          .join('<break time="700ms"/>')}</prosody>`
      : `<prosody rate="-6%" pitch="+2%">${echapper(texte)}</prosody>`;
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="fr-FR"><voice name="${nomVoix}">${corps}</voice></speak>`;
}

async function synthetiser(env, texte, mode, nomVoix) {
  const adresse = `https://${env.AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;
  for (let essai = 0; essai < 6; essai++) {
    const r = await fetch(adresse, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': env.AZURE_SPEECH_KEY,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'generer-voix',
      },
      body: ssml(texte, mode, nomVoix),
    });
    if (r.ok) return Buffer.from(await r.arrayBuffer());
    // Offre gratuite : quelques requêtes par minute. On attend et on recommence.
    if (r.status === 429 || r.status >= 500) {
      const attente = Number(r.headers.get('retry-after') ?? 0) * 1000 || 4000 * (essai + 1);
      await new Promise((ok) => setTimeout(ok, attente));
      continue;
    }
    throw new Error(`Azure a répondu ${r.status} : ${(await r.text()).slice(0, 200)}`);
  }
  throw new Error('Azure ne répond pas (trop de refus de suite).');
}

// --- Programme -------------------------------------------------------------------------------
const phrases = rassemblerPhrases();
if (args.includes('--liste')) {
  for (const { texte, mode } of phrases.values()) console.log(`${mode === 'dictee' ? '[dictée] ' : ''}${texte}`);
  console.log(`${phrases.size} phrases`);
  process.exit(0);
}

const env = lireEnv();
if (!env.AZURE_SPEECH_KEY || !env.AZURE_SPEECH_REGION) {
  console.error('Il manque AZURE_SPEECH_KEY ou AZURE_SPEECH_REGION dans .env');
  process.exit(1);
}

if (args.includes('--essai')) {
  const dossier = join(RACINE, 'docs', 'voix-essais');
  mkdirSync(dossier, { recursive: true });
  const exemples = [
    ['Bienvenue à la fête foraine !', 'normal'],
    ['Avance avec le joystick et passe la grande porte !', 'normal'],
    ['7 fois 8', 'normal'],
    ["aujourd'hui. Aujourd'hui, il fait beau. aujourd'hui.", 'dictee'],
  ];
  for (const nomVoix of VOIX_ESSAI) {
    for (const [i, [texte, mode]] of exemples.entries()) {
      writeFileSync(join(dossier, `${nomVoix}-${i + 1}.mp3`), await synthetiser(env, texte, mode, nomVoix));
      console.log('essai', nomVoix, i + 1);
    }
  }
  process.exit(0);
}

mkdirSync(SORTIE, { recursive: true });
const ancien = existsSync(MANIFESTE) ? JSON.parse(readFileSync(MANIFESTE, 'utf8')) : { voix, fichiers: {} };
const fichiers = {};
let generees = 0;
let total = 0;
for (const [cle, { texte, mode }] of phrases) {
  // Le nom du fichier dépend aussi de la voix : changer de voix régénère tout.
  const nom = `${empreinte(`${voix}|${mode}|${texte}`)}.mp3`;
  fichiers[cle] = nom;
  if (existsSync(join(SORTIE, nom))) continue;
  const mp3 = await synthetiser(env, texte, mode, voix);
  writeFileSync(join(SORTIE, nom), mp3);
  generees++;
  total += mp3.length;
  if (generees % 20 === 0) console.log(`${generees} phrases générées…`);
}
// Les MP3 qui ne servent plus sont retirés.
const gardes = new Set(Object.values(fichiers));
let retires = 0;
for (const nom of readdirSync(SORTIE)) {
  if (nom.endsWith('.mp3') && !gardes.has(nom)) {
    unlinkSync(join(SORTIE, nom));
    retires++;
  }
}
writeFileSync(MANIFESTE, JSON.stringify({ voix, fichiers }, null, 0));
console.log(`${phrases.size} phrases, ${generees} générées (${Math.round(total / 1024)} ko), ${retires} retirées. Voix : ${voix}.`);
void ancien;
