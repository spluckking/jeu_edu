// Les photos de la maison (l'enfant, la famille) : choisies par le parent dans la galerie de la
// tablette, réduites, puis gardées dans la mémoire du jeu, sur la tablette seulement. Elles ne
// sont jamais envoyées nulle part, ni écrites dans le dépôt, ni mises dans l'export de sauvegarde
// (base à part : « jeu-edu-photos »).

export type IdPhoto = 'enfant' | 'famille';

const BASE = 'jeu-edu-photos';
/** Le plus grand côté d'une photo gardée, en pixels : assez pour l'écran, léger pour la tablette. */
const COTE_MAX = 1280;

function ouvrir(): Promise<IDBDatabase> {
  return new Promise((ok, ko) => {
    const d = indexedDB.open(BASE, 1);
    d.onupgradeneeded = () => d.result.createObjectStore('photos');
    d.onsuccess = () => ok(d.result);
    d.onerror = () => ko(d.error);
  });
}

export async function lirePhoto(id: IdPhoto): Promise<Blob | null> {
  try {
    const db = await ouvrir();
    return await new Promise((ok) => {
      const r = db.transaction('photos').objectStore('photos').get(id);
      r.onsuccess = () => ok(r.result instanceof Blob ? r.result : null);
      r.onerror = () => ok(null);
    });
  } catch {
    return null;
  }
}

async function ecrirePhoto(id: IdPhoto, photo: Blob): Promise<void> {
  const db = await ouvrir();
  await new Promise<void>((ok, ko) => {
    const t = db.transaction('photos', 'readwrite');
    t.objectStore('photos').put(photo, id);
    t.oncomplete = () => ok();
    t.onerror = () => ko(t.error);
  });
}

/** Réduit l'image choisie (JPEG, plus grand côté COTE_MAX), dans le bon sens. */
async function reduire(fichier: File): Promise<Blob> {
  const image = await createImageBitmap(fichier, { imageOrientation: 'from-image' });
  const k = Math.min(1, COTE_MAX / Math.max(image.width, image.height));
  const toile = document.createElement('canvas');
  toile.width = Math.round(image.width * k);
  toile.height = Math.round(image.height * k);
  toile.getContext('2d')!.drawImage(image, 0, 0, toile.width, toile.height);
  image.close();
  return new Promise((ok, ko) => toile.toBlob((b) => (b ? ok(b) : ko(new Error('Photo illisible'))), 'image/jpeg', 0.86));
}

/** Ouvre la galerie (ou l'appareil photo) de la tablette ; rend la photo gardée, ou null si on
 *  a annulé. */
export function choisirPhoto(id: IdPhoto): Promise<Blob | null> {
  return new Promise((ok) => {
    const champ = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*' });
    champ.addEventListener('change', () => {
      const f = champ.files?.[0];
      if (!f) return ok(null);
      void reduire(f)
        .then(async (b) => {
          await ecrirePhoto(id, b);
          ok(b);
        })
        .catch(() => ok(null));
    });
    champ.addEventListener('cancel', () => ok(null));
    champ.click();
  });
}
