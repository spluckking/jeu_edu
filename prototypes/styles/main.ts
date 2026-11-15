// Prototype jetable : planche de comparaison des styles visuels.
// On change de style avec les boutons du bas, ou les touches 1 à 9.
// Touche t : tenue suivante. Touche v : vue suivante (place, personnage, stand).

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { buildFair, OUTFITS, type Fair } from './fair.ts';
import { STYLES } from './styles.ts';

const STORAGE_KEY = 'planche-styles:choix';

// Avec « ?capture » dans l'adresse : pas de bandeau, pas de mouvement, pour les captures d'écran.
// « ?capture=anime » garde le mouvement.
const captureParam = new URLSearchParams(window.location.search).get('capture');
const captureMode = captureParam !== null;
const frozen = captureMode && captureParam !== 'anime';
if (captureMode) document.body.classList.add('capture');

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Élément #${id} introuvable`);
  return found as T;
}

const canvas = element<HTMLCanvasElement>('scene');
const nameLabel = element<HTMLParagraphElement>('name');
const descriptionLabel = element<HTMLParagraphElement>('desc');
const choices = element<HTMLDivElement>('choices');
const outfitButton = element<HTMLButtonElement>('outfit');
const zoomButton = element<HTMLButtonElement>('zoom');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.info.autoReset = false;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 250);
camera.position.set(0, 6.5, 16);

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 2.5, -1);
controls.enablePan = false;
controls.enableDamping = true;
controls.minDistance = 9;
controls.maxDistance = 24;
controls.minPolarAngle = 0.6;
controls.maxPolarAngle = 1.45;
controls.minAzimuthAngle = -0.9;
controls.maxAzimuthAngle = 0.9;

const composer = new EffectComposer(
  renderer,
  new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 }),
);
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.5, 0.6, 1.0);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(bloom);
composer.addPass(new OutputPass());

const lights = new THREE.Group();
scene.add(lights);

let fair: Fair | null = null;
let sky: THREE.Texture | null = null;
let currentStyle = 0;
let currentOutfit = 0;
let view = 0;

function makeSky(top: number, bottom: number): THREE.Texture {
  const gradientCanvas = document.createElement('canvas');
  gradientCanvas.width = 2;
  gradientCanvas.height = 256;
  const context = gradientCanvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D indisponible');
  const gradient = context.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, `#${top.toString(16).padStart(6, '0')}`);
  gradient.addColorStop(0.62, `#${bottom.toString(16).padStart(6, '0')}`);
  gradient.addColorStop(1, `#${bottom.toString(16).padStart(6, '0')}`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, 2, 256);
  const texture = new THREE.CanvasTexture(gradientCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function applyStyle(index: number): void {
  const style = STYLES[index];
  if (!style) return;
  currentStyle = index;

  if (fair) {
    scene.remove(fair.root);
    fair.dispose();
  }
  sky?.dispose();
  lights.clear();

  sky = makeSky(style.skyTop, style.skyBottom);
  scene.background = sky;
  scene.fog = new THREE.Fog(style.skyBottom, 34, 82);

  const { hemisphere, sun } = style;
  lights.add(new THREE.HemisphereLight(hemisphere.sky, hemisphere.ground, hemisphere.intensity));
  const directional = new THREE.DirectionalLight(sun.color, sun.intensity);
  directional.position.set(6, 12, 9);
  lights.add(directional);

  bloom.enabled = style.bloom > 0;
  bloom.strength = style.bloom;

  fair = buildFair(style, currentOutfit);
  scene.add(fair.root);
  outfitButton.textContent = `Tenue : ${OUTFITS[currentOutfit] ?? ''}`;

  nameLabel.textContent = style.label;
  descriptionLabel.textContent = style.description;
  choices.querySelectorAll('button').forEach((button, i) => {
    button.setAttribute('aria-pressed', String(i === index));
  });
  try {
    localStorage.setItem(STORAGE_KEY, String(index));
  } catch {
    // Stockage indisponible : le choix ne sera simplement pas retenu.
  }
}

STYLES.forEach((style, index) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = style.label;
  button.addEventListener('click', () => applyStyle(index));
  choices.append(button);
});

outfitButton.addEventListener('click', () => {
  currentOutfit = (currentOutfit + 1) % OUTFITS.length;
  applyStyle(currentStyle);
});

/** Trois vues : la place entière, le personnage de près, le chamboule-tout de près. */
const VIEWS: Array<{ next: string; target: [number, number, number]; from: [number, number, number]; min: number }> = [
  { next: 'Voir le personnage', target: [0, 2.5, -1], from: [0, 6.5, 16], min: 9 },
  { next: 'Voir le stand', target: [0, 1.7, 5], from: [1.4, 2.7, 10.6], min: 3 },
  { next: 'Voir la place', target: [0, 2.3, -4.6], from: [1.2, 2.8, 1.0], min: 3 },
];

function applyView(): void {
  const chosen = VIEWS[view] ?? VIEWS[0];
  if (!chosen) return;
  controls.minDistance = chosen.min;
  controls.target.set(...chosen.target);
  camera.position.set(...chosen.from);
  zoomButton.textContent = chosen.next;
}

zoomButton.addEventListener('click', () => {
  view = (view + 1) % VIEWS.length;
  applyView();
});
applyView();

window.addEventListener('keydown', (event) => {
  if (event.key === 't') outfitButton.click();
  if (event.key === 'v') zoomButton.click();
  const index = Number(event.key) - 1;
  if (Number.isInteger(index) && index >= 0 && index < STYLES.length) applyStyle(index);
});

function resize(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const pixelRatio = Math.min(window.devicePixelRatio, 1.75);
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height, false);
  composer.setPixelRatio(pixelRatio);
  composer.setSize(width, height);
  camera.aspect = width / height;
  camera.fov = camera.aspect < 1 ? 80 : 45;
  // Décale la scène vers le haut pour que le bandeau du bas ne cache pas le personnage.
  camera.setViewOffset(width, height, 0, captureMode ? 0 : Math.round(height * 0.2), width, height);
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

let initial = 0;
try {
  const stored = Number(localStorage.getItem(STORAGE_KEY));
  if (Number.isInteger(stored) && stored >= 0 && stored < STYLES.length) initial = stored;
} catch {
  // Stockage indisponible : on démarre sur le premier style.
}
applyStyle(initial);

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
renderer.setAnimationLoop((milliseconds) => {
  controls.update();
  if (!reducedMotion.matches && !frozen) fair?.update(milliseconds / 1000);
  renderer.info.reset();
  composer.render();
  // Charge d'affichage de l'image, pour la mesurer depuis la console.
  document.body.dataset.calls = String(renderer.info.render.calls);
  document.body.dataset.triangles = String(renderer.info.render.triangles);
});
