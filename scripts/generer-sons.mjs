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
/** Les morceaux : une minute chacun, sans voix, pensés pour boucler (le jeu fond la fin dans le début).
 *  Un morceau par lieu : la promenade, chaque stand de révision (calme, pour se concentrer),
 *  chaque jeu d'adresse (plus rythmé), et la pause respiration. */
export const MUSIQUES = [
  {
    id: 'musique-ville',
    ambiance: 'calme et souriante, promenade dans la petite ville',
    tempo: 92,
    prompt:
      'Calm, warm and smiling music for walking around a cosy little village in a children’s life-sim game. Acoustic guitar fingerpicking, soft piano, light glockenspiel touches, gentle upright bass, brushed percussion, a few birdsong-like flute notes. Peaceful and sunny, never sleepy. 92 BPM, G major. Instrumental, no vocals. Seamless loop: the ending flows straight back into the beginning.',
  },
  {
    id: 'musique-promenade',
    ambiance: 'joyeuse et douillette, promenade dans la fête',
    tempo: 104,
    prompt:
      'Cheerful, cozy modern pop for a colourful fairground in a children’s game. Ukulele strums, glockenspiel lead melody, soft hand claps, light kick and shaker, warm round bass, a playful whistled hook. Bright and happy but gentle, never hectic. 104 BPM, C major. Instrumental, no vocals. Seamless loop: the ending flows straight back into the beginning.',
  },
  {
    id: 'musique-chamboule',
    ambiance: 'espiègle et concentrée, chamboule-tout (tables)',
    tempo: 88,
    prompt:
      'Playful but focused music for a child practising times tables at a fairground tin-can stall. Light pizzicato strings, soft marimba, gentle woodblock pulse, warm bass. Calm enough to think, a little mischievous. 88 BPM, D major. Instrumental, no vocals. Seamless loop: the ending flows straight back into the beginning.',
  },
  {
    id: 'musique-confiserie',
    ambiance: 'douce comme une boîte à musique, confiserie (dictée)',
    tempo: 78,
    prompt:
      'Sweet, gentle music for a candy shop in a children’s spelling game. Music box melody, celesta, soft felt piano, light vibraphone, warm pads, very soft brushes. Calm and cosy, nothing distracting. 78 BPM, F major. Instrumental, no vocals. Seamless loop: the ending flows straight back into the beginning.',
  },
  {
    id: 'musique-chantier',
    ambiance: 'bricoleuse, chantier (défis)',
    tempo: 92,
    prompt:
      'Cheerful workshop music for a children’s puzzle game on a toy construction site. Marimba and xylophone patterns, soft toy percussion like little hammers and blocks, plucked bass, light claps. Curious and motivating, never loud. 92 BPM, G major. Instrumental, no vocals. Seamless loop: the ending flows straight back into the beginning.',
  },
  {
    id: 'musique-horloge',
    ambiance: 'mécanique et tendre, horloge (heure)',
    tempo: 84,
    prompt:
      'Gentle clockwork music for a children’s clock-reading game. Ticking woodblock pulse, pizzicato strings, music box, soft harp, warm low clarinet. Precise and calm, like a friendly clock shop. 84 BPM, A major. Instrumental, no vocals. Seamless loop: the ending flows straight back into the beginning.',
  },
  {
    id: 'musique-peche',
    ambiance: 'aquatique et paisible, pêche aux canards (homophones)',
    tempo: 86,
    prompt:
      'Relaxed water-side music for a duck-fishing stall in a children’s game. Ukulele, steel drum, soft bubbles of marimba, gentle shaker, round bass. Sunny and peaceful. 86 BPM, E major. Instrumental, no vocals. Seamless loop: the ending flows straight back into the beginning.',
  },
  {
    id: 'musique-autos',
    ambiance: 'pétillante et rythmée, autos tamponneuses',
    tempo: 124,
    prompt:
      'Energetic, bouncy funk-pop for a bumper car ride in a children’s game. Funky clean guitar, slap synth bass, toy horns, hand claps, cowbell, bright synth lead. Exciting and fun, never aggressive. 124 BPM, G major. Instrumental, no vocals. Seamless loop: the ending flows straight back into the beginning.',
  },
  {
    id: 'musique-trampoline',
    ambiance: 'rebondissante, trampoline',
    tempo: 116,
    prompt:
      'Springy, joyful pop for a trampoline game for kids. Bouncy synth bass, plucky synths, glockenspiel hooks, playful boing-like accents, light drums with claps. Light-hearted and airy. 116 BPM, C major. Instrumental, no vocals. Seamless loop: the ending flows straight back into the beginning.',
  },
  {
    id: 'musique-glaces',
    ambiance: 'mystérieuse et rigolote, palais des glaces',
    tempo: 100,
    prompt:
      'Playful, slightly mysterious music for a hall of mirrors maze in a children’s game. Celesta, vibraphone, soft theremin-like synth, pizzicato strings, light brushed drums. Curious and magical, never scary. 100 BPM, D minor turning to D major. Instrumental, no vocals. Seamless loop: the ending flows straight back into the beginning.',
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
  { id: 'bruitage-pas', duree: 0.5, prompt: 'A single soft cartoon footstep on grass, light and cute, children’s game.' },
  { id: 'bruitage-porte', duree: 2.5, prompt: 'Welcome to the fair: a small happy crowd cheering softly and a carnival bell ringing twice. Cheerful and short.' },
  { id: 'bruitage-habiller', duree: 0.8, prompt: 'Soft cloth swish followed by a cute little pop, like putting on a hat, cartoon.' },
  { id: 'bruitage-indice', duree: 1, prompt: 'Gentle magical hint sparkle, soft harp and twinkle, children’s game.' },
  { id: 'bruitage-construction', duree: 1.5, prompt: 'Cartoon little hammer taps and a satisfying wooden click, building a toy piece.' },
  { id: 'bruitage-page', duree: 0.8, prompt: 'Soft paper page turn of a storybook.' },
  { id: 'bruitage-tamponneuse', duree: 0.7, prompt: 'Cartoon bumper car soft rubber bonk, playful and bouncy.' },
  { id: 'bruitage-etoile', duree: 0.8, prompt: 'Collecting a star in a children’s game: bright cute twinkle ding.' },
  { id: 'bruitage-boing', duree: 0.8, prompt: 'Cartoon trampoline boing, springy and bouncy, playful.' },
  { id: 'bruitage-boing-rate', duree: 0.6, prompt: 'Soft low cartoon spring wobble, gentle, a small missed bounce.' },
  { id: 'bruitage-mur', duree: 0.5, prompt: 'Soft glass tink of touching a mirror, gentle and clean.' },
  { id: 'bruitage-reussite-chamboule', duree: 1.4, prompt: 'A soft ball throw then light tin cans tumbling down, cartoon fairground game, joyful.' },
  { id: 'bruitage-reussite-peche', duree: 1.2, prompt: 'A cute rubber duck squeak and a small water splash, cartoon.' },
  { id: 'bruitage-reussite-confiserie', duree: 1.2, prompt: 'Candy wrapper crinkle and a sweet sparkly chime, cute.' },
  { id: 'bruitage-reussite-horloge', duree: 1.3, prompt: 'Cute cuckoo clock chime ding, cheerful and short.' },
  { id: 'bruitage-reussite-chantier', duree: 1.3, prompt: 'Cartoon toy hammer hit followed by a bright success ding.' },
  { id: 'ambiance-ville', duree: 20, prompt: 'Peaceful countryside village ambience: birds singing, a light breeze in the leaves, very distant church bell once, calm and loopable. No music, no voices.' },
  { id: 'bruitage-fete-cloche', duree: 2.5, prompt: 'Fairground high striker: a wooden mallet thump, a puck sliding up and a bright bell ding, then a few people cheering softly far away.' },
  { id: 'bruitage-fete-rires', duree: 3, prompt: 'Children laughing happily on a fairground ride, a little distant, joyful and short.' },
  { id: 'bruitage-fete-popcorn', duree: 3, prompt: 'Popcorn popping in a fairground popcorn machine, light and crackly, a little distant.' },
  { id: 'bruitage-fete-orgue', duree: 5, prompt: 'A short cheerful phrase of a fairground carousel band organ, a little distant, ends softly.' },
  { id: 'ambiance-fete', duree: 20, prompt: 'Distant cheerful fairground ambience: soft crowd murmur, children laughing far away, a very faint carousel organ, birds. Calm, even, loopable.' },
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
