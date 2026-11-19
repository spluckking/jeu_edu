import { describe, expect, it } from 'vitest';
import { avecPrenom, retenirPrenomEcrit } from './prenom-ecrit.ts';

describe('le prénom dans les saluts écrits', () => {
  it('ajoute le prénom après « Bonjour ! » ou « Coucou ! » en début de phrase', () => {
    retenirPrenomEcrit('Zoé');
    expect(avecPrenom('Bonjour ! Tu m’aides ?')).toBe('Bonjour, Zoé ! Tu m’aides ?');
    expect(avecPrenom('Coucou ! J’ai des sucettes.')).toBe('Coucou, Zoé ! J’ai des sucettes.');
  });

  it('ne touche pas aux autres phrases, ni sans prénom', () => {
    retenirPrenomEcrit('Zoé');
    expect(avecPrenom('Salut, petit bricoleur !')).toBe('Salut, petit bricoleur !');
    expect(avecPrenom('Merci ! Bonjour !')).toBe('Merci ! Bonjour !');
    retenirPrenomEcrit('');
    expect(avecPrenom('Bonjour !')).toBe('Bonjour !');
  });
});
