// La carte de la ville : une vue du ciel de toute la ville (photographiée dans la scène au moment
// où on l'ouvre, donc toujours à jour), avec un point par lieu. L'enfant glisse le doigt dessus :
// le nom du lieu le plus proche s'affiche. Un point qui bat montre où il est.

import T from '../../content/ville/carte.json';
import { LIEUX as PIEGES } from '../dictee/pieges.ts';
import { bruitage } from '../son/bruitages.ts';
import { BORDS, BUISSONS_MURES, ETANG, LIEUX } from './monde.ts';

export interface LieuCarte {
  nom: string;
  x: number;
  z: number;
}

/** Les lieux de la carte. La boulangerie n'est un « chantier » que tant qu'elle n'est pas construite. */
export function lieuxDeLaCarte(boulangerieConstruite: boolean): LieuCarte[] {
  const n = T.lieux;
  const mures = BUISSONS_MURES.reduce((s, b) => ({ x: s.x + b.x / BUISSONS_MURES.length, z: s.z + b.z / BUISSONS_MURES.length }), { x: 0, z: 0 });
  return [
    { nom: n.maison, ...LIEUX.maison },
    { nom: n.potager, ...LIEUX.potager },
    { nom: n.pommier, ...LIEUX.pommier },
    { nom: n.place, x: 0, z: 0 },
    { nom: n.tableau, ...LIEUX.tableau },
    { nom: n.murDesMots, ...LIEUX.murDesMots },
    { nom: n.epicerie, ...LIEUX.epicerie },
    { nom: n.poste, ...LIEUX.poste },
    { nom: boulangerieConstruite ? n.boulangerie : n.chantier, ...LIEUX.boulangerie },
    { nom: PIEGES.double.nom, ...LIEUX.tour },
    { nom: PIEGES.mbp.nom, ...LIEUX.pont },
    { nom: n.etang, x: ETANG.x, z: ETANG.z },
    { nom: n.ponton, ...LIEUX.ponton },
    { nom: n.bois, x: -64, z: -24 },
    { nom: n.mures, ...mures },
    { nom: n.fete, ...LIEUX.fete },
  ].map(({ nom, x, z }) => ({ nom, x, z }));
}

/** Le lieu le plus proche de ce point, s'il est assez près (en mètres). */
export function lieuProche(lieux: readonly LieuCarte[], x: number, z: number, portee = 12): LieuCarte | null {
  let meilleur: LieuCarte | null = null;
  let d = portee;
  for (const l of lieux) {
    const e = Math.hypot(l.x - x, l.z - z);
    if (e < d) {
      d = e;
      meilleur = l;
    }
  }
  return meilleur;
}

const LARGEUR = BORDS.xMax - BORDS.xMin;
const PROFONDEUR = BORDS.zMax - BORDS.zMin;
const pc = (x: number, z: number): { left: string; top: string } => ({
  left: `${((x - BORDS.xMin) / LARGEUR) * 100}%`,
  top: `${((z - BORDS.zMin) / PROFONDEUR) * 100}%`,
});

export function ouvrirCarte(image: string, lieux: readonly LieuCarte[], ici: { x: number; z: number }): Promise<void> {
  return new Promise((fini) => {
    const fond = Object.assign(document.createElement('div'), { className: 'carte-fond' });
    const boite = Object.assign(document.createElement('div'), { className: 'carte-boite' });
    const titre = Object.assign(document.createElement('p'), { className: 'carte-titre-ville', textContent: T.titre });
    const aide = Object.assign(document.createElement('p'), { className: 'carte-aide', textContent: T.aide });
    const plan = Object.assign(document.createElement('div'), { className: 'carte-plan' });
    plan.style.aspectRatio = `${LARGEUR} / ${PROFONDEUR}`;
    plan.append(Object.assign(document.createElement('img'), { src: image, alt: '', draggable: false }));
    const points = lieux.map((l) => {
      const p = Object.assign(document.createElement('span'), { className: 'carte-point' });
      Object.assign(p.style, pc(l.x, l.z));
      plan.append(p);
      return p;
    });
    const moi = Object.assign(document.createElement('span'), { className: 'carte-moi' });
    Object.assign(moi.style, pc(ici.x, ici.z));
    plan.append(moi);
    const bulle = Object.assign(document.createElement('span'), { className: 'carte-bulle' });
    bulle.hidden = true;
    plan.append(bulle);

    // Le doigt glisse sur la carte : le nom du lieu le plus proche (ou « Tu es ici »).
    let dernier = '';
    const montrer = (e: PointerEvent): void => {
      const r = plan.getBoundingClientRect();
      const x = BORDS.xMin + ((e.clientX - r.left) / r.width) * LARGEUR;
      const z = BORDS.zMin + ((e.clientY - r.top) / r.height) * PROFONDEUR;
      const tous = [...lieux, { nom: T.ici, x: ici.x, z: ici.z }];
      const l = lieuProche(tous, x, z, (12 * LARGEUR) / Math.max(320, r.width) + 6);
      points.forEach((p, i) => p.classList.toggle('vise', lieux[i] === l));
      if (!l) {
        bulle.hidden = true;
        dernier = '';
        return;
      }
      if (l.nom !== dernier) bruitage.touche();
      dernier = l.nom;
      bulle.textContent = l.nom;
      Object.assign(bulle.style, pc(l.x, l.z));
      bulle.hidden = false;
    };
    plan.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      plan.setPointerCapture(e.pointerId);
      montrer(e);
    });
    plan.addEventListener('pointermove', montrer);

    const fermer = Object.assign(document.createElement('button'), { type: 'button', className: 'bouton-principal', textContent: 'Fermer' });
    fermer.addEventListener('click', () => {
      bruitage.touche();
      fond.remove();
      fini();
    });
    boite.append(titre, aide, plan, fermer);
    fond.append(boite);
    document.body.append(fond);
  });
}
