// Génère les musiques et les bruitages du jeu avec ElevenLabs, en MP3 dans public/sons/.
// Le jeu les joue hors ligne ; un fichier absent est remplacé par le son fabriqué dans le code,
// comme avant. La tablette n'appelle jamais ElevenLabs.
//
//   node scripts/generer-sons.mjs                 tout ce qui manque
//   node scripts/generer-sons.mjs --refaire ID    régénère ce son (par exemple musique-promenade)
//   node scripts/generer-sons.mjs --liste         affiche les sons et leurs descriptions
//
// La clé est lue dans .env (ELEVENLABS_API_KEY), jamais dans le dépôt.
// Budget : environ 3,5 Mo de musique (4 morceaux d'une minute à 96 kbit/s) et 100 ko de bruitages.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const RACINE = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const SORTIE = join(RACINE, 'public', 'sons');
const FORMAT = 'mp3_44100_96';

/** Les morceaux : une minute chacun, sans voix, pensés pour boucler (le jeu fond la fin dans le début). */
export const MUSIQUES = [
  {
    id: 'musique-promenade',
    ambiance: 'joyeuse et douillette, promenade dans la fête',
    tempo: 104,
    prompt:
      'Cheerful, cozy modern pop instrumental for a pastel fairground in a children’s game. Ukulele strums, glockenspiel lead melody, soft hand claps, light kick and shaker, warm round bass, a playful whistled hook. Bright and happy but gentle, never hectic. 104 BPM, C major. Instrumental, no vocals. Seamless loop: the ending flows straight back into the beginning.',
  },
  {
    id: 'musique-exercice',
    ambiance: 'calme et concentrée, pendant les exercices',
    tempo: 80,
    prompt:
      'Calm focus music for a child doing maths and spelling exercises. Soft lo-fi, mellow electric piano chords, gentle marimba motif, brushed drums, warm pads. Steady and unobtrusive, no sudden changes, nothing that distracts. 80 BPM, F major. Instrumental, no vocals. Seamless loop: the ending flows straight back into the beginning.',
  },
  {
    id: 'musique-detente',
    ambiance: 'bondissante, pour les autos tamponneuses, le trampoline et le palais des glaces',
    tempo: 118,
    prompt:
      'Bouncy, joyful funk-pop for kids’ fairground rides. Clean funky guitar, round synth bass, toy piano, hand claps, cowbell, a catchy bright synth lead. Upbeat and playful, never aggressive. 118 BPM, G major. Instrumental, no vocals. Seamless loop: the ending flows straight back into the beginning.',
  },
  {
    id: 'musique-pause',
    ambiance: 'très calme, pour la pause respiration',
    tempo: 60,
    prompt:
      'Very calm ambient music for a child’s breathing exercise. Soft warm pads, sparse kalimba notes, distant gentle wind chimes, slow swells of about five seconds. No drums, no beat. Peaceful and reassuring. Around 60 BPM feel. Instrumental, no vocals. Seamless loop: the ending flows straight back into the beginning.',
  },
];

export const BRUITAGES = [
  { id: 'bruitage-touche', duree: 0.5, prompt: 'Soft cute bubbly pop click for a children’s game button. Very short, clean, gentle.' },
  { id: 'bruitage-ouverture', duree: 1.2, prompt: 'Cheerful short magical opening chime for a children’s game: quick harp glissando and soft bells. Light and happy.' },
  { id: 'bruitage-reussite', duree: 1.3, prompt: 'Bright sparkly success sound for a children’s learning game: a little cartoon pop followed by a twinkling chime. Joyful, short, not too loud.' },
  { id: 'bruitage-erreur', duree: 0.8, prompt: 'Gentle soft two-note marimba boop going down, friendly and kind, for a child’s wrong answer. Not negative, not a buzzer, very soft.' },
  { id: 'bruitage-fin', duree: 2.5, prompt: 'Short joyful celebration fanfare for a children’s game: toy trumpet, glockenspiel and a soft confetti pop. Happy and warm, ends cleanly.' },
  { id: 'bruitage-ticket', duree: 0.7, prompt: 'Cute light sparkle sound of collecting a fairground ticket, like a soft coin twinkle, children’s game.' },
];

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

async function demander(cle, chemin, corps) {
  for (let essai = 0; essai < 4; essai++) {
    const r = await fetch(`https://api.elevenlabs.io${chemin}?output_format=${FORMAT}`, {
      method: 'POST',
      headers: { 'xi-api-key': cle, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify(corps),
    });
    if (r.ok) return Buffer.from(await r.arrayBuffer());
    if (r.status === 429 || r.status >= 500) {
      await new Promise((ok) => setTimeout(ok, 5000 * (essai + 1)));
      continue;
    }
    throw new Error(`ElevenLabs a répondu ${r.status} : ${(await r.text()).slice(0, 300)}`);
  }
  throw new Error('ElevenLabs ne répond pas.');
}

const args = process.argv.slice(2);
if (args.includes('--liste')) {
  for (const m of MUSIQUES) console.log(`${m.id} (${m.ambiance}, ${m.tempo} BPM, 60 s)\n  ${m.prompt}\n`);
  for (const b of BRUITAGES) console.log(`${b.id} (${b.duree} s)\n  ${b.prompt}\n`);
  process.exit(0);
}
const refaire = args.includes('--refaire') ? args[args.indexOf('--refaire') + 1] : null;
const env = lireEnv();
if (!env.ELEVENLABS_API_KEY) {
  console.error('Il manque ELEVENLABS_API_KEY dans .env');
  process.exit(1);
}
mkdirSync(SORTIE, { recursive: true });
const aFaire = (id) => refaire === id || (!refaire && !existsSync(join(SORTIE, `${id}.mp3`)));

for (const b of BRUITAGES.filter((x) => aFaire(x.id))) {
  const mp3 = await demander(env.ELEVENLABS_API_KEY, '/v1/sound-generation', { text: b.prompt, duration_seconds: b.duree, prompt_influence: 0.6 });
  writeFileSync(join(SORTIE, `${b.id}.mp3`), mp3);
  console.log(b.id, `${Math.round(mp3.length / 1024)} ko`);
}
for (const m of MUSIQUES.filter((x) => aFaire(x.id))) {
  const mp3 = await demander(env.ELEVENLABS_API_KEY, '/v1/music', { prompt: m.prompt, music_length_ms: 60000, model_id: 'music_v1', force_instrumental: true });
  writeFileSync(join(SORTIE, `${m.id}.mp3`), mp3);
  console.log(m.id, `${Math.round(mp3.length / 1024)} ko`);
}
console.log('Terminé.');
