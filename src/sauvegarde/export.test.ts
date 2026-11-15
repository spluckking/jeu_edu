import { describe, expect, it } from 'vitest';
import { exporterSauvegarde, importerSauvegarde } from './export.ts';
import { sauvegardeNeuve } from './format.ts';

describe('copie de secours de la sauvegarde', () => {
  it('un export se recharge à l’identique', () => {
    const s = sauvegardeNeuve();
    s.tickets = 17;
    s.roue = 3;
    s.forains = { chamboule: 'Gaston' };
    const { nom, texte } = exporterSauvegarde(s, '2026-11-15', new Date('2026-11-15T10:00:00Z'));
    expect(nom).toBe('fete-foraine-2026-11-15.json');
    const lu = importerSauvegarde(texte);
    expect(lu.sauvegarde).toEqual(s);
    expect(lu.exportee).toBe('2026-11-15T10:00:00.000Z');
  });

  it('une ancienne sauvegarde est mise au format actuel', () => {
    const texte = JSON.stringify({ format: 'jeu-edu-sauvegarde', exportee: '', sauvegarde: { version: 1, arrivees: {}, etats: {}, journal: [] } });
    const lu = importerSauvegarde(texte);
    expect(lu.sauvegarde.version).toBe(sauvegardeNeuve().version);
    expect(lu.sauvegarde.tickets).toBe(0);
  });

  it('refuse un fichier qui n’est pas une sauvegarde du jeu', () => {
    expect(() => importerSauvegarde('pas du json')).toThrow(/pas une sauvegarde/);
    expect(() => importerSauvegarde(JSON.stringify({ version: 6 }))).toThrow(/pas une sauvegarde/);
  });

  it('refuse une sauvegarde d’une version future ou abîmée', () => {
    const futur = JSON.stringify({ format: 'jeu-edu-sauvegarde', sauvegarde: { version: 99 } });
    expect(() => importerSauvegarde(futur)).toThrow(/plus récente/);
    const abimee = JSON.stringify({ format: 'jeu-edu-sauvegarde', sauvegarde: { ...sauvegardeNeuve(), journal: 'x' } });
    expect(() => importerSauvegarde(abimee)).toThrow(/abîmé/);
  });
});
