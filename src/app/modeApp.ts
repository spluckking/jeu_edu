// Application installée : plein écran et paysage, demandés par le jeu au toucher.
// Le manifeste reste en « standalone » et orientation libre : avec « fullscreen » et « landscape »,
// l'icône de l'application ne s'ouvrait pas sur Android (même constat que pour Golémanciens).

/** Verrouillage d'orientation (absent des types du DOM). */
interface OrientationVerrouillable {
  lock?(orientation: 'landscape'): Promise<void>;
}

async function passerEnModeApp(): Promise<void> {
  if (document.fullscreenElement || !window.matchMedia('(display-mode: standalone)').matches) return;
  try {
    await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    await (screen.orientation as OrientationVerrouillable).lock?.('landscape');
  } catch {
    // Refusé par l'appareil : le jeu reste jouable dans sa fenêtre.
  }
}

/** Le navigateur exige un geste : on réessaie à chaque toucher (retour d'arrière-plan compris). */
export function surveillerModeApp(): void {
  window.addEventListener('pointerup', () => void passerEnModeApp(), { capture: true });
}
