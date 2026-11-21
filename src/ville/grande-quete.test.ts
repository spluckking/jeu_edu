import { describe, expect, it } from 'vitest';
import Q from '../../content/ville/grandes-quetes.json';
import { CHAPITRES, grandeQueteNeuve, idTache, lireGrandeQuete, lireTache, queteDuJour, tacheDuJour, type GrandeQuete } from './grande-quete.ts';

const PRODUITS = new Set(['pomme', 'poire', 'carotte', 'tomate', 'pain', 'lait', 'poisson', 'mure', 'colis', 'lettre', 'crepes']);

const tache = { donneur: 'epiciere', destinataire: 'postiere', fournit: [{ produit: 'colis', nombre: 1 }], besoin: [{ produit: 'colis', nombre: 1 }], recompense: [200], texte: 'Porte ce colis.', rappel: 'Le colis, à la poste.', merci: 'Merci !' };
const chapitre = (n: number): unknown => ({
  titre: `Chapitre ${n}`,
  phrases: ['Une phrase.', 'Une autre phrase.'],
  questions: [
    { question: 'Qui ?', choix: ['a', 'b', 'c'], indice: 1 },
    { question: 'Quoi ?', choix: ['d', 'e', 'f'], indice: 2 },
  ],
  tache,
});
const brute = (id: string): unknown => ({
  id,
  titre: 'Une quête',
  chapitres: [1, 2, 3, 4, 5].map(chapitre),
  fin: { titre: 'La fin', phrases: ['Fin.', 'Vraiment.'], reflexion: { question: 'Et toi ?', choix: ['oui', 'non', 'peut-être'] }, morale: 'La morale.' },
});

describe('la grande quête', () => {
  it('lit une quête bien formée, refuse le reste', () => {
    expect(typeof lireGrandeQuete(brute('test-1'), PRODUITS)).toBe('object');
    expect(lireGrandeQuete({ ...(brute('test-1') as object), chapitres: [chapitre(1)] }, PRODUITS)).toMatch(/5 chapitres/);
    expect(lireTache({ ...tache, besoin: [{ produit: 'licorne', nombre: 1 }] }, PRODUITS)).toMatch(/produits/);
    expect(lireTache({ ...tache, donneur: 'inconnu' }, PRODUITS)).toMatch(/habitant/);
    expect(lireTache({ ...tache, recompense: [99999] }, PRODUITS)).toMatch(/récompense/);
  });

  it('les quêtes écrites pour le jeu sont toutes bien formées', () => {
    expect(Q.quetes.length).toBeGreaterThanOrEqual(3);
    for (const q of Q.quetes) {
      const r = lireGrandeQuete(q, PRODUITS);
      expect(typeof r === 'string' ? `${q.id} : ${r}` : 'ok').toBe('ok');
    }
  });

  it('un chapitre par jour, seulement quand sa tâche est faite', () => {
    const quetes = [lireGrandeQuete(brute('q-un'), PRODUITS), lireGrandeQuete(brute('q-deux'), PRODUITS)] as GrandeQuete[];
    const faites = new Set<string>();
    let r = queteDuJour(grandeQueteNeuve(), quetes, '2026-11-23', (id) => faites.has(id));
    expect(r.quete?.id).toBe('q-un');
    expect(r.etat.chapitre).toBe(0);
    expect(tacheDuJour(r.etat, r.quete)?.id).toBe(idTache('q-un', 0));
    // Le même jour, même tâche faite : on ne change pas de chapitre.
    faites.add(idTache('q-un', 0));
    r = queteDuJour(r.etat, quetes, '2026-11-23', (id) => faites.has(id));
    expect(r.etat.chapitre).toBe(0);
    // Le lendemain : chapitre 2.
    r = queteDuJour(r.etat, quetes, '2026-11-24', (id) => faites.has(id));
    expect(r.etat.chapitre).toBe(1);
    // Un jour sans tâche faite : on reste au chapitre 2.
    r = queteDuJour(r.etat, quetes, '2026-11-25', (id) => faites.has(id));
    expect(r.etat.chapitre).toBe(1);
    // Les chapitres suivants, puis la fin.
    let jour = 26;
    for (let c = 1; c < CHAPITRES; c++) {
      faites.add(idTache('q-un', c));
      r = queteDuJour(r.etat, quetes, `2026-11-${jour++}`, (id) => faites.has(id));
    }
    expect(r.etat.chapitre).toBe(CHAPITRES);
    expect(tacheDuJour(r.etat, r.quete)).toBeNull();
    // La fin pas lue : elle reste ; lue, la quête suivante commence le lendemain.
    r = queteDuJour(r.etat, quetes, `2026-11-${jour++}`, (id) => faites.has(id));
    expect(r.quete?.id).toBe('q-un');
    r = queteDuJour({ ...r.etat, finLue: true }, quetes, `2026-11-${jour++}`, (id) => faites.has(id));
    expect(r.quete?.id).toBe('q-deux');
    expect(r.etat.finies).toEqual(['q-un']);
    expect(r.etat.chapitre).toBe(0);
  });

  it('sans quête à jouer, rien', () => {
    const r = queteDuJour(grandeQueteNeuve(), [], '2026-11-23', () => false);
    expect(r.quete).toBeNull();
  });
});
