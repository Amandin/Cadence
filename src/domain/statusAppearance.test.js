import { describe, expect, it } from 'vitest';
import { couleurVersAccent, teinteEtatParticipant, teinteEtats } from './statusAppearance.js';

describe('status appearance', () => {
  it('ignore les états sans teinte active', () => {
    expect(teinteEtats([{ color: 'red', tintParticipant: false }, { color: 'blue', tintParticipant: true, expired: true }])).toBeNull();
  });

  it('déduplique les accents et produit un dégradé stable', () => {
    const result = teinteEtatParticipant({
      statuses: [
        { color: 'red', tintParticipant: true },
        { color: 'red', tintParticipant: true },
        { color: 'blue', tintParticipant: true },
      ],
    });
    expect(result.accents).toEqual([couleurVersAccent('red'), couleurVersAccent('blue')]);
    expect(result.gradient).toContain('linear-gradient');
  });
});
