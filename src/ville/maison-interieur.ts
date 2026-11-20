// L'intérieur de la maison du personnage : une pièce à part, posée loin de la ville (on y passe en
// fondu). Elle est ouverte vers le sud, comme une maison de poupée : la caméra, qui regarde
// toujours depuis le sud, voit dedans. Le sol, les murs, la fenêtre et le paillasson sont faits ici ;
// les meubles sont des modèles Tripo, posés par main.ts.

import * as THREE from 'three';

/** Le centre de la pièce (hors de la ville, trop loin pour être vu de dehors) et sa taille. */
export const INTERIEUR = { x: 0, z: -330, largeur: 9, profondeur: 7, hauteur: 2.8 } as const;

/** Le paillasson pour ressortir, au bord ouvert (au sud) ; l'enfant arrive un peu plus loin dedans. */
export const SORTIE_INTERIEUR = { x: INTERIEUR.x, z: INTERIEUR.z + INTERIEUR.profondeur / 2 - 0.55 };
export const ENTREE_INTERIEUR = { x: INTERIEUR.x, z: INTERIEUR.z + INTERIEUR.profondeur / 2 - 2.4 };

/** Le cadre de l'enfant (mur de droite) et devant lui, où l'enfant se tient pour le regarder. */
export const PANNEAU_PRENOM = { x: INTERIEUR.x + INTERIEUR.largeur / 2 - 1.1, z: INTERIEUR.z + INTERIEUR.profondeur / 2 - 1.8 };
/** Le cadre de la famille, au milieu du mur du fond ; on le regarde de là. */
export const CADRE_FAMILLE = { x: INTERIEUR.x + 0.2, z: INTERIEUR.z - INTERIEUR.profondeur / 2 + 1.6 };

/** Dans la pièce, l'enfant reste entre les murs. */
export function resterDansLaPiece(p: THREE.Vector3): void {
  const mx = INTERIEUR.largeur / 2 - 0.45;
  const mz = INTERIEUR.profondeur / 2 - 0.45;
  p.x = Math.max(INTERIEUR.x - mx, Math.min(INTERIEUR.x + mx, p.x));
  p.z = Math.max(INTERIEUR.z - mz, Math.min(INTERIEUR.z + INTERIEUR.profondeur / 2 - 0.3, p.z));
}

export function dedans(x: number, z: number): boolean {
  return Math.abs(x - INTERIEUR.x) < INTERIEUR.largeur && Math.abs(z - INTERIEUR.z) < INTERIEUR.profondeur;
}

/** Des lattes de parquet, dessinées une fois dans une petite toile. */
function parquet(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d')!;
  const teintes = ['#d9a86c', '#d29f62', '#dfb078', '#cf9a5c'];
  for (let rang = 0; rang < 8; rang++) {
    let x = rang % 2 ? -64 : 0;
    while (x < 256) {
      g.fillStyle = teintes[(rang * 3 + Math.floor(x / 64) + 4) % teintes.length]!;
      g.fillRect(x, rang * 32, 128, 32);
      g.fillStyle = 'rgba(120, 72, 30, 0.35)';
      g.fillRect(x, rang * 32, 2, 32);
      x += 128;
    }
    g.fillStyle = 'rgba(120, 72, 30, 0.35)';
    g.fillRect(0, rang * 32, 256, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(INTERIEUR.largeur / 2.5, INTERIEUR.profondeur / 2.5);
  return t;
}

/** Un cadre photo accroché au mur : un bord de bois et, dedans, la photo (ou un papier crème). */
export interface Cadre {
  objet: THREE.Object3D;
  /** Met la photo dans le cadre, recadrée pour le remplir (null : papier crème). */
  montrer(image: ImageBitmap | null): void;
}

function cadrePhoto(largeur: number, hauteur: number): Cadre {
  const objet = new THREE.Group();
  const bois = new THREE.MeshStandardMaterial({ color: 0xa8774a, roughness: 0.75 });
  const fond = new THREE.Mesh(new THREE.BoxGeometry(largeur + 0.16, hauteur + 0.16, 0.06), bois);
  fond.castShadow = true;
  objet.add(fond);
  const papier = new THREE.MeshStandardMaterial({ color: 0xfffaf0, roughness: 0.85 });
  const photo = new THREE.Mesh(new THREE.PlaneGeometry(largeur, hauteur), papier);
  photo.position.z = 0.035;
  objet.add(photo);
  return {
    objet,
    montrer(image) {
      const ancien = papier.map;
      papier.map = null;
      if (image) {
        // Copiée dans une toile (au plus 1024 px) : légère pour la carte graphique, et à l'endroit.
        const k = Math.min(1, 1024 / Math.max(image.width, image.height));
        const toile = document.createElement('canvas');
        toile.width = Math.round(image.width * k);
        toile.height = Math.round(image.height * k);
        toile.getContext('2d')!.drawImage(image, 0, 0, toile.width, toile.height);
        const t = new THREE.CanvasTexture(toile);
        t.colorSpace = THREE.SRGBColorSpace;
        // Recadrée au milieu, comme une photo glissée dans un cadre.
        const a = image.width / image.height / (largeur / hauteur);
        if (a > 1) {
          t.repeat.set(1 / a, 1);
          t.offset.set((1 - 1 / a) / 2, 0);
        } else {
          t.repeat.set(1, a);
          t.offset.set(0, (1 - a) / 2);
        }
        t.needsUpdate = true;
        papier.map = t;
      }
      papier.color.set(image ? 0xffffff : 0xfffaf0);
      papier.needsUpdate = true;
      ancien?.dispose();
    },
  };
}

export function construirePiece(): { piece: THREE.Group; cadres: { enfant: Cadre; famille: Cadre } } {
  const piece = new THREE.Group();
  piece.position.set(INTERIEUR.x, 0, INTERIEUR.z);
  const { largeur: L, profondeur: P, hauteur: H } = INTERIEUR;

  // Autour de la pièce, un sol neutre : on ne voit pas le vide par le côté ouvert.
  const dehors = new THREE.Mesh(new THREE.PlaneGeometry(80, 80).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x8f7a63, roughness: 1 }));
  dehors.position.y = -0.02;
  dehors.receiveShadow = true;
  piece.add(dehors);

  const sol = new THREE.Mesh(new THREE.BoxGeometry(L, 0.12, P), new THREE.MeshStandardMaterial({ map: parquet(), roughness: 0.75 }));
  sol.position.y = -0.04;
  sol.receiveShadow = true;
  piece.add(sol);

  const mur = new THREE.MeshStandardMaterial({ color: 0xf6ead6, roughness: 0.95 });
  const plinthe = new THREE.MeshStandardMaterial({ color: 0xc58f5a, roughness: 0.8 });
  const poserMur = (l: number, x: number, z: number, angle: number): void => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(l, H, 0.2), mur);
    m.position.set(x, H / 2, z);
    m.rotation.y = angle;
    m.receiveShadow = true;
    m.castShadow = true;
    piece.add(m);
    const b = new THREE.Mesh(new THREE.BoxGeometry(l, 0.16, 0.24), plinthe);
    b.position.set(x, 0.08, z);
    b.rotation.y = angle;
    piece.add(b);
  };
  poserMur(L + 0.2, 0, -P / 2, 0);
  poserMur(P, -L / 2, 0, Math.PI / 2);
  poserMur(P, L / 2, 0, Math.PI / 2);

  // La fenêtre, au mur du fond : un ciel clair dans un cadre de bois, avec une croisée.
  const fenetre = new THREE.Group();
  const cadre = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
  const vitre = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.2), new THREE.MeshBasicMaterial({ color: 0xbfe4f7 }));
  fenetre.add(vitre);
  for (const [w, h, x, y] of [
    [1.8, 0.12, 0, 0.66],
    [1.8, 0.12, 0, -0.66],
    [0.12, 1.4, -0.86, 0],
    [0.12, 1.4, 0.86, 0],
    [0.06, 1.2, 0, 0],
    [1.6, 0.06, 0, 0],
  ] as const) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), cadre);
    b.position.set(x, y, 0.04);
    fenetre.add(b);
  }
  fenetre.position.set(-2.4, 1.6, -P / 2 + 0.11);
  piece.add(fenetre);

  // Le paillasson, au bord ouvert : c'est par là qu'on sort.
  const paillasson = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.04, 0.8), new THREE.MeshStandardMaterial({ color: 0xb4874f, roughness: 1 }));
  paillasson.position.set(SORTIE_INTERIEUR.x - INTERIEUR.x, 0.03, SORTIE_INTERIEUR.z - INTERIEUR.z);
  paillasson.receiveShadow = true;
  piece.add(paillasson);

  // La photo de l'enfant, au mur de droite, près de la sortie (on y change aussi son prénom) ;
  // la photo de famille, plus grande, au milieu du mur du fond.
  const enfant = cadrePhoto(0.8, 1);
  enfant.objet.rotation.y = -Math.PI / 2;
  enfant.objet.position.set(L / 2 - 0.13, 1.5, PANNEAU_PRENOM.z - INTERIEUR.z);
  piece.add(enfant.objet);
  const famille = cadrePhoto(2.1, 1.4);
  famille.objet.position.set(CADRE_FAMILLE.x - INTERIEUR.x, 1.7, -P / 2 + 0.13);
  piece.add(famille.objet);
  return { piece, cadres: { enfant, famille } };
}



/** Le tapis : l'image Tripo posée à plat sur un disque (plus léger qu'un modèle 3D). */
export function tapis(image: THREE.Texture, rx: number, rz: number): THREE.Mesh {
  image.colorSpace = THREE.SRGBColorSpace;
  // Le tapis rond occupe le milieu de l'image (le fond gris autour reste dehors).
  image.repeat.set(0.78, 0.78);
  image.offset.set(0.11, 0.11);
  const t = new THREE.Mesh(new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: image, roughness: 1 }));
  t.scale.set(rx, 1, rz);
  t.receiveShadow = true;
  return t;
}
