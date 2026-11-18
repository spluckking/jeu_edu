// Génère les modèles 3D de la ville avec l'API Tripo (image vers 3D), puis les allège pour la
// tablette, dans public/modeles/. La tablette n'appelle jamais Tripo : elle lit les fichiers GLB.
//
//   node scripts/generer-modeles.mjs                 tout ce qui manque
//   node scripts/generer-modeles.mjs --refaire ID    régénère ce modèle (nouvelle dépense)
//   node scripts/generer-modeles.mjs --solde         affiche le solde de crédits API
//   node scripts/generer-modeles.mjs --image ID      dessine seulement l'image de départ (à regarder avant la 3D)
//
// Le genre « icone » n'a pas de 3D : son image est réduite en WebP 256 px dans public/icones/
// (images de l'interface : produits de l'épicerie…).
//
// Un modèle a soit une image de départ (« image »), soit une description (« prompt ») : l'image
// est alors dessinée par Tripo (GPT Image 2, 10 crédits) et gardée dans content/modeles/images/.
//
// La liste est dans content/modeles/modeles.json. Chaque tâche Tripo réussie est notée dans
// content/modeles/taches.json : relancer le script ne repaie pas un modèle déjà fait.
// La clé est lue dans .env (TRIPO_API_KEY), jamais affichée ni écrite ailleurs.
//
// Coûts (crédits API, 1 crédit = 0,01 $) : image vers 3D texturé 30 ; squelette 25 ;
// 10 par animation.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const RACINE = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const API = 'https://openapi.tripo3d.ai/v3';
const SORTIE = join(RACINE, 'public', 'modeles');
const BRUTS = join(RACINE, 'node_modules', '.cache', 'modeles');
const CATALOGUE = join(RACINE, 'content', 'modeles', 'modeles.json');
const TACHES = join(RACINE, 'content', 'modeles', 'taches.json');
const GLTF = join(RACINE, 'node_modules', '@gltf-transform', 'cli', 'bin', 'cli.js');
const ICONES = join(RACINE, 'public', 'icones');

/** Budget de triangles par genre de modèle (docs/VILLE.md). */
const BUDGET = { personnage: 10000, batiment: 15000, objet: 3000 };

function cle() {
  const env = existsSync(join(RACINE, '.env')) ? readFileSync(join(RACINE, '.env'), 'utf8') : '';
  const ligne = env.split(/\r?\n/).find((l) => l.startsWith('TRIPO_API_KEY='));
  const valeur = ligne?.slice('TRIPO_API_KEY='.length).trim().replace(/^['"]|['"]$/g, '');
  if (!valeur) throw new Error('TRIPO_API_KEY manque dans .env');
  return valeur;
}
const CLE = cle();
const entetes = { Authorization: `Bearer ${CLE}` };

async function appel(chemin, options = {}) {
  const r = await fetch(`${API}${chemin}`, { ...options, headers: { ...entetes, ...(options.headers ?? {}) } });
  const corps = await r.json().catch(() => ({}));
  if (!r.ok || corps.code !== 0) throw new Error(`${chemin} : ${r.status} ${JSON.stringify(corps).slice(0, 300)}`);
  return corps.data;
}

const solde = async () => appel('/account/balance');

async function envoyerImage(fichier) {
  const forme = new FormData();
  forme.append('file', new Blob([readFileSync(fichier)], { type: 'image/png' }), basename(fichier));
  return (await appel('/files', { method: 'POST', body: forme })).file_token;
}

async function tache(chemin, corps) {
  const d = await appel(chemin, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) });
  return d.task_id;
}

/** Attend la fin d'une tâche ; renvoie sa sortie. */
async function attendre(id, nom) {
  const debut = Date.now();
  for (;;) {
    const t = await appel(`/tasks/${id}`);
    if (t.status === 'success') {
      console.log(`  ${nom} : fini (${t.credits_consumed ?? '?'} crédits)`);
      return t.output;
    }
    if (['failed', 'cancelled', 'banned', 'expired'].includes(t.status)) throw new Error(`${nom} : ${t.status} ${t.error_message ?? ''}`);
    if (Date.now() - debut > 15 * 60 * 1000) throw new Error(`${nom} : trop long (${t.status})`);
    process.stdout.write(`\r  ${nom} : ${t.status} ${t.progress ?? 0} %   `);
    await new Promise((r) => setTimeout(r, 5000));
  }
}

async function telecharger(url, fichier) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`téléchargement : ${r.status}`);
  writeFileSync(fichier, Buffer.from(await r.arrayBuffer()));
}

/** Textures en 1024 pixels au plus, au format WebP : le modèle tient en environ 1 Mo. */
function alleger(entree, sortie) {
  const intermediaire = `${sortie}.tmp.glb`;
  execFileSync(process.execPath, [GLTF, 'resize', entree, intermediaire, '--width', '1024', '--height', '1024'], { stdio: 'ignore' });
  execFileSync(process.execPath, [GLTF, 'webp', intermediaire, sortie, '--quality', '85'], { stdio: 'ignore' });
  execFileSync(process.execPath, ['-e', `require('fs').unlinkSync(${JSON.stringify(intermediaire)})`]);
}

const lireTaches = () => (existsSync(TACHES) ? JSON.parse(readFileSync(TACHES, 'utf8')) : {});
const ecrireTaches = (t) => writeFileSync(TACHES, `${JSON.stringify(t, null, 2)}\n`);

/** Dessine l'image de départ d'après la description du modèle (si elle n'existe pas encore). */
async function imageDeDepart(m) {
  const fichier = join(RACINE, 'content', 'modeles', 'images', `${m.id}.png`);
  if (existsSync(fichier)) return fichier;
  const id = await tache('/generation/text-to-image', { model: 'chat_image_2', prompt: m.prompt, quality: 'medium', output_format: 'png' });
  const sortie = await attendre(id, 'image');
  const url = sortie?.image_url ?? sortie?.generated_image_url ?? sortie?.url ?? (Array.isArray(sortie?.image_urls) ? sortie.image_urls[0] : undefined);
  if (!url) throw new Error(`${m.id} : pas d'image dans la réponse ${JSON.stringify(sortie).slice(0, 200)}`);
  await telecharger(url, fichier);
  console.log(`  → content/modeles/images/${m.id}.png`);
  return fichier;
}

async function icone(m, refaire) {
  const fini = join(ICONES, `${m.id}.webp`);
  if (!refaire && existsSync(fini)) {
    console.log(`${m.id} : déjà là`);
    return;
  }
  console.log(`${m.id} (icône)`);
  const { default: sharp } = await import('sharp');
  mkdirSync(ICONES, { recursive: true });
  await sharp(await imageDeDepart(m)).resize(256, 256).webp({ quality: 85 }).toFile(fini);
  console.log(`  → public/icones/${m.id}.webp`);
}

async function produire(m, refaire) {
  if (m.genre === 'icone') return icone(m, refaire);
  const taches = lireTaches();
  const deja = refaire ? {} : (taches[m.id] ?? {});
  const fini = join(SORTIE, `${m.id}.glb`);
  if (!refaire && existsSync(fini)) {
    console.log(`${m.id} : déjà là`);
    return;
  }
  console.log(`${m.id} (${m.genre})`);
  // 1. La géométrie et la texture, à partir de l'image de départ.
  let idModele = deja.modele;
  if (!idModele) {
    const jeton = await envoyerImage(m.image ? join(RACINE, m.image) : await imageDeDepart(m));
    idModele = await tache('/generation/image-to-model', {
      input: jeton,
      model: 'v3.1-20260211',
      texture: true,
      pbr: true,
      face_limit: BUDGET[m.genre] ?? 10000,
    });
    taches[m.id] = { ...(taches[m.id] ?? {}), modele: idModele };
    ecrireTaches(taches);
  }
  let sortie = await attendre(idModele, 'modèle');
  // 2. Pour un personnage : squelette, puis animations.
  if (m.animations?.length) {
    let idRig = deja.squelette;
    if (!idRig) {
      const verif = await attendre(await tache('/animations/rig-check', { input: idModele }), 'vérification du squelette');
      if (verif?.riggable === false) throw new Error(`${m.id} : Tripo ne peut pas lui faire de squelette`);
      idRig = await tache('/animations/rig', { input: idModele, model: 'v3.0-20260909', rig_type: 'biped', out_format: 'glb' });
      taches[m.id] = { ...taches[m.id], squelette: idRig };
      ecrireTaches(taches);
    }
    await attendre(idRig, 'squelette');
    let idAnim = deja.animations;
    if (!idAnim) {
      idAnim = await tache('/animations/retarget', { input: idRig, animations: m.animations, out_format: 'glb', animate_in_place: true });
      taches[m.id] = { ...taches[m.id], animations: idAnim };
      ecrireTaches(taches);
    }
    sortie = await attendre(idAnim, 'animations');
  }
  const url = sortie?.model_url ?? sortie?.pbr_model_url ?? sortie?.model;
  if (!url) throw new Error(`${m.id} : pas de modèle dans la réponse ${JSON.stringify(sortie).slice(0, 200)}`);
  const brut = join(BRUTS, `${m.id}.glb`);
  await telecharger(url, brut);
  alleger(brut, fini);
  console.log(`  → public/modeles/${m.id}.glb`);
}

const args = process.argv.slice(2);
mkdirSync(SORTIE, { recursive: true });
mkdirSync(BRUTS, { recursive: true });
if (args.includes('--solde')) {
  console.log(await solde());
} else if (args.includes('--image')) {
  const { modeles } = JSON.parse(readFileSync(CATALOGUE, 'utf8'));
  const m = modeles.find((x) => x.id === args[args.indexOf('--image') + 1]);
  if (!m?.prompt) throw new Error('modèle inconnu, ou sans description');
  await imageDeDepart(m);
} else {
  const { modeles } = JSON.parse(readFileSync(CATALOGUE, 'utf8'));
  const refaire = args[args.indexOf('--refaire') + 1];
  const liste = args.includes('--refaire') ? modeles.filter((m) => m.id === refaire) : modeles;
  console.log('Solde avant :', (await solde()).balance, 'crédits');
  for (const m of liste) await produire(m, args.includes('--refaire'));
  console.log('Solde après :', (await solde()).balance, 'crédits');
}
