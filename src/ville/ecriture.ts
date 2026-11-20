// La zone d'écriture au stylet : des lignes de cahier (Seyès), on écrit comme on dessine, avec
// une gomme et « Tout effacer ». Seul le stylet écrit : le doigt et la paume sont ignorés (on
// peut poser la main). Ce n'est pas un champ de texte : Android ne propose ni son clavier ni sa
// reconnaissance d'écriture. La gomme du stylet (le bouton ou le bout arrière) efface aussi.
// L'image gardée est l'encre seule, recadrée, sur fond blanc (sans les lignes).

export interface ZoneEcriture {
  element: HTMLElement;
  /** Rien n'est écrit. */
  vide(): boolean;
  /** L'instant du premier trait (performance.now()), ou null. */
  debut(): number | null;
  effacer(): void;
  /** Gomme ou crayon. */
  gomme(oui: boolean): void;
  /** L'écriture en image (PNG), recadrée ; null si rien n'est écrit. */
  image(): Promise<Blob | null>;
  /** Appelé quand l'écriture change (pour montrer les boutons de validation). */
  quandChange(f: () => void): void;
}

/** En essai sur ordinateur (« ?essai »), la souris écrit aussi. */
const accepte = (e: PointerEvent): boolean => e.pointerType === 'pen' || (e.pointerType === 'mouse' && new URLSearchParams(location.search).has('essai'));

export function zoneEcriture(): ZoneEcriture {
  const element = document.createElement('div');
  element.className = 'zone-ecriture';
  const toile = document.createElement('canvas');
  toile.className = 'zone-ecriture-toile';
  const aide = document.createElement('p');
  aide.className = 'zone-ecriture-aide';
  aide.textContent = 'Écris avec ton stylet.';
  aide.hidden = true;
  element.append(toile, aide);
  const g = toile.getContext('2d')!;
  let ratio = 1;
  let enGomme = false;
  let encre = false;
  let premier: number | null = null;
  const abonnes: Array<() => void> = [];
  const changer = (): void => abonnes.forEach((f) => f());

  // La taille réelle de la toile suit celle de la zone (et la finesse de l'écran).
  const ajuster = (): void => {
    const r = element.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const ancien = encre ? g.getImageData(0, 0, toile.width, toile.height) : null;
    ratio = window.devicePixelRatio || 1;
    toile.width = Math.round(r.width * ratio);
    toile.height = Math.round(r.height * ratio);
    if (ancien) g.putImageData(ancien, 0, 0);
  };
  new ResizeObserver(ajuster).observe(element);

  let trait: { id: number; x: number; y: number; gomme: boolean } | null = null;
  const point = (e: PointerEvent): { x: number; y: number } => {
    const r = toile.getBoundingClientRect();
    return { x: (e.clientX - r.left) * ratio, y: (e.clientY - r.top) * ratio };
  };
  // La gomme du stylet : bouton 5 (bout arrière) ou bouton latéral maintenu (buttons & 32).
  const gommeDuStylet = (e: PointerEvent): boolean => e.button === 5 || (e.buttons & 32) !== 0;

  toile.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (!accepte(e)) {
      if (e.pointerType === 'touch') aide.hidden = false;
      return;
    }
    aide.hidden = true;
    toile.setPointerCapture(e.pointerId);
    const p = point(e);
    trait = { id: e.pointerId, ...p, gomme: enGomme || gommeDuStylet(e) };
    if (!trait.gomme && premier === null) premier = performance.now();
  });
  toile.addEventListener('pointermove', (e) => {
    if (!trait || e.pointerId !== trait.id) return;
    const evts = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [e];
    for (const c of evts.length ? evts : [e]) {
      const p = point(c);
      g.save();
      g.lineCap = 'round';
      g.lineJoin = 'round';
      if (trait.gomme) {
        g.globalCompositeOperation = 'destination-out';
        g.lineWidth = 26 * ratio;
      } else {
        g.globalCompositeOperation = 'source-over';
        g.strokeStyle = '#1f3a8a';
        // Un trait un peu plus épais quand on appuie fort.
        g.lineWidth = (2.2 + (c.pressure || 0.5) * 2.6) * ratio;
      }
      g.beginPath();
      g.moveTo(trait.x, trait.y);
      g.lineTo(p.x, p.y);
      g.stroke();
      g.restore();
      trait.x = p.x;
      trait.y = p.y;
    }
    if (!trait.gomme) encre = true;
    changer();
  });
  const finir = (e: PointerEvent): void => {
    if (!trait || e.pointerId !== trait.id) return;
    trait = null;
    if (enGomme) encre = aDeLEncre();
    changer();
  };
  toile.addEventListener('pointerup', finir);
  toile.addEventListener('pointercancel', finir);
  toile.addEventListener('contextmenu', (e) => e.preventDefault());

  /** Reste-t-il de l'encre (après la gomme) ? */
  const aDeLEncre = (): boolean => {
    const d = g.getImageData(0, 0, toile.width, toile.height).data;
    for (let i = 3; i < d.length; i += 4 * 7) if ((d[i] ?? 0) > 20) return true;
    return false;
  };

  return {
    element,
    vide: () => !encre,
    debut: () => premier,
    effacer() {
      g.clearRect(0, 0, toile.width, toile.height);
      encre = false;
      changer();
    },
    gomme(oui) {
      enGomme = oui;
      element.classList.toggle('en-gomme', oui);
    },
    quandChange(f) {
      abonnes.push(f);
    },
    async image() {
      if (!encre) return null;
      // Le cadre de l'encre, avec une petite marge.
      const d = g.getImageData(0, 0, toile.width, toile.height).data;
      let x0 = toile.width;
      let y0 = toile.height;
      let x1 = 0;
      let y1 = 0;
      for (let y = 0; y < toile.height; y += 2)
        for (let x = 0; x < toile.width; x += 2)
          if ((d[(y * toile.width + x) * 4 + 3] ?? 0) > 20) {
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
          }
      if (x1 <= x0 || y1 <= y0) return null;
      const marge = 12 * ratio;
      x0 = Math.max(0, x0 - marge);
      y0 = Math.max(0, y0 - marge);
      x1 = Math.min(toile.width, x1 + marge);
      y1 = Math.min(toile.height, y1 + marge);
      // Au plus 140 pixels de haut : assez pour relire, léger à garder et à envoyer.
      const k = Math.min(1, 140 / (y1 - y0));
      const sortie = document.createElement('canvas');
      sortie.width = Math.round((x1 - x0) * k);
      sortie.height = Math.round((y1 - y0) * k);
      const s = sortie.getContext('2d')!;
      s.fillStyle = 'white';
      s.fillRect(0, 0, sortie.width, sortie.height);
      s.drawImage(toile, x0, y0, x1 - x0, y1 - y0, 0, 0, sortie.width, sortie.height);
      return new Promise((ok) => sortie.toBlob((b) => ok(b), 'image/png'));
    },
  };
}
