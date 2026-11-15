// Les commandes de promenade, comme dans Golémanciens : un joystick qui apparaît sous le pouce
// à gauche, et un doigt glissé à droite pour tourner la caméra. Marche aussi au clavier.

export interface Commandes {
  /** Joystick : x vers la droite, y vers l'avant, de -1 à 1 (zone morte au centre). */
  x: number;
  y: number;
  /** Glissement de la caméra depuis la dernière lecture (pixels). */
  regardX: number;
  regardY: number;
  /** Lit et remet à zéro le glissement de la caméra. */
  prendreRegard(): { x: number; y: number };
  /** Coupe les commandes (dans un stand, une cinématique…). */
  actives: boolean;
}

const RAYON = 64;

export function creerCommandes(zoneStick: HTMLElement, base: HTMLElement, zoneRegard: HTMLElement): Commandes {
  const bouton = base.firstElementChild as HTMLElement;
  const c: Commandes = {
    x: 0,
    y: 0,
    regardX: 0,
    regardY: 0,
    actives: false,
    prendreRegard() {
      const r = { x: c.regardX, y: c.regardY };
      c.regardX = 0;
      c.regardY = 0;
      return r;
    },
  };
  let doigtStick: number | null = null;
  let origine = { x: 0, y: 0 };
  let doigtRegard: number | null = null;
  let dernier = { x: 0, y: 0 };

  const relacher = (): void => {
    doigtStick = null;
    c.x = 0;
    c.y = 0;
    base.classList.remove('actif');
    base.style.left = '';
    base.style.top = '';
    bouton.style.transform = '';
  };

  zoneStick.addEventListener('pointerdown', (e) => {
    if (!c.actives || doigtStick !== null) return;
    e.preventDefault();
    doigtStick = e.pointerId;
    origine = { x: e.clientX, y: e.clientY };
    const r = zoneStick.getBoundingClientRect();
    base.classList.add('actif');
    base.style.left = `${e.clientX - r.left}px`;
    base.style.top = `${e.clientY - r.top}px`;
  });
  zoneRegard.addEventListener('pointerdown', (e) => {
    if (!c.actives) return;
    doigtRegard = e.pointerId;
    dernier = { x: e.clientX, y: e.clientY };
  });
  addEventListener('pointermove', (e) => {
    if (e.pointerId === doigtStick) {
      let dx = e.clientX - origine.x;
      let dy = e.clientY - origine.y;
      const l = Math.hypot(dx, dy);
      if (l > RAYON) {
        dx = (dx / l) * RAYON;
        dy = (dy / l) * RAYON;
      }
      bouton.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      const m = Math.min(1, l / RAYON);
      const k = m < 0.12 ? 0 : (m - 0.12) / 0.88 / Math.max(m, 1e-6);
      c.x = (dx / RAYON) * k;
      c.y = (-dy / RAYON) * k;
    } else if (e.pointerId === doigtRegard) {
      c.regardX += e.clientX - dernier.x;
      c.regardY += e.clientY - dernier.y;
      dernier = { x: e.clientX, y: e.clientY };
    }
  });
  const fin = (e: PointerEvent): void => {
    if (e.pointerId === doigtStick) relacher();
    if (e.pointerId === doigtRegard) doigtRegard = null;
  };
  addEventListener('pointerup', fin);
  addEventListener('pointercancel', fin);

  // Clavier (essais sur ordinateur) : flèches ou ZQSD.
  const touches = new Set<string>();
  const majClavier = (): void => {
    if (doigtStick !== null) return;
    c.x = (touches.has('arrowright') || touches.has('d') ? 1 : 0) - (touches.has('arrowleft') || touches.has('q') ? 1 : 0);
    c.y = (touches.has('arrowup') || touches.has('z') ? 1 : 0) - (touches.has('arrowdown') || touches.has('s') ? 1 : 0);
  };
  addEventListener('keydown', (e) => {
    if (!c.actives) return;
    touches.add(e.key.toLowerCase());
    majClavier();
  });
  addEventListener('keyup', (e) => {
    touches.delete(e.key.toLowerCase());
    if (c.actives) majClavier();
  });
  // Quand les commandes se coupent, plus rien ne bouge.
  const surveiller = (): void => {
    if (!c.actives && (c.x !== 0 || c.y !== 0 || doigtStick !== null)) {
      relacher();
      touches.clear();
    }
    requestAnimationFrame(surveiller);
  };
  requestAnimationFrame(surveiller);
  return c;
}
