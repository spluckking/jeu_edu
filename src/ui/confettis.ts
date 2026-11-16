// Une petite pluie de confettis pastel : récompense visuelle nette, courte, et légère pour la
// tablette (quelques éléments du DOM animés en CSS, rien dans la scène 3D). Rien si l'enfant ou
// le parent a demandé moins de mouvement.

const COULEURS = ['#f6b3c9', '#ffe27a', '#9fd6f0', '#b6e3a8', '#c8a7f0', '#ffc59e'];
const reduit = window.matchMedia('(prefers-reduced-motion: reduce)');

/** Lance des confettis depuis ce point de l'écran (en pixels), ou du haut de l'écran. */
export function confettis(nombre = 26, depart?: { x: number; y: number }): void {
  if (reduit.matches) return;
  const boite = document.createElement('div');
  boite.className = 'confettis';
  boite.setAttribute('aria-hidden', 'true');
  const x0 = depart?.x ?? window.innerWidth / 2;
  const y0 = depart?.y ?? window.innerHeight * 0.25;
  for (let i = 0; i < nombre; i++) {
    const c = document.createElement('span');
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
    const force = 140 + Math.random() * 220;
    c.style.left = `${x0}px`;
    c.style.top = `${y0}px`;
    c.style.background = COULEURS[i % COULEURS.length] ?? '#ffffff';
    c.style.setProperty('--dx', `${Math.cos(angle) * force}px`);
    c.style.setProperty('--dy', `${Math.sin(angle) * force}px`);
    c.style.setProperty('--tour', `${(Math.random() - 0.5) * 720}deg`);
    c.style.animationDelay = `${Math.random() * 0.08}s`;
    if (i % 3 === 0) c.style.borderRadius = '50%';
    boite.append(c);
  }
  document.body.append(boite);
  window.setTimeout(() => boite.remove(), 1600);
}
