// Découper un grand maillage en instances (herbe, arbres) en parcelles carrées : chaque parcelle a
// sa propre sphère englobante, et Three.js ne dessine que celles qui sont dans le champ de la
// caméra (ou de l'ombre du soleil). Un seul maillage pour toute la carte serait dessiné en entier à
// chaque image, même ce qui est derrière l'enfant : c'est lourd pour une tablette.

import * as THREE from 'three';

/** marge : en mètres, ce qui peut dépasser de la sphère (l'herbe qui bouge au vent). */
export function enParcelles(source: THREE.InstancedMesh, cote: number, marge = 0): THREE.Group {
  const groupe = new THREE.Group();
  const m = new THREE.Matrix4();
  const p = new THREE.Vector3();
  const cases = new Map<string, number[]>();
  for (let i = 0; i < source.count; i++) {
    source.getMatrixAt(i, m);
    p.setFromMatrixPosition(m);
    const cle = `${Math.floor(p.x / cote)},${Math.floor(p.z / cote)}`;
    const liste = cases.get(cle);
    if (liste) liste.push(i);
    else cases.set(cle, [i]);
  }
  // Les attributs par instance posés sur la géométrie (s'il y en a) sont découpés eux aussi.
  const parInstance = Object.entries(source.geometry.attributes).filter(([, a]) => a instanceof THREE.InstancedBufferAttribute) as Array<[string, THREE.InstancedBufferAttribute]>;
  const c = new THREE.Color();
  for (const indices of cases.values()) {
    let geometrie = source.geometry;
    if (parInstance.length) {
      geometrie = source.geometry.clone();
      for (const [nom, a] of parInstance) {
        const t = new Float32Array(indices.length * a.itemSize);
        indices.forEach((i, k) => {
          for (let j = 0; j < a.itemSize; j++) t[k * a.itemSize + j] = a.array[i * a.itemSize + j] ?? 0;
        });
        geometrie.setAttribute(nom, new THREE.InstancedBufferAttribute(t, a.itemSize));
      }
    }
    const morceau = new THREE.InstancedMesh(geometrie, source.material, indices.length);
    indices.forEach((i, k) => {
      source.getMatrixAt(i, m);
      morceau.setMatrixAt(k, m);
      if (source.instanceColor) {
        source.getColorAt(i, c);
        morceau.setColorAt(k, c);
      }
    });
    morceau.castShadow = source.castShadow;
    morceau.receiveShadow = source.receiveShadow;
    morceau.computeBoundingSphere();
    if (morceau.boundingSphere) morceau.boundingSphere.radius += marge;
    morceau.frustumCulled = true;
    groupe.add(morceau);
  }
  return groupe;
}
