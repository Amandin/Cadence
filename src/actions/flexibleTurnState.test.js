import { describe, expect, it } from 'vitest';
import { actionsRestantesSouples, ajouterJoueSouple, retirerJoueSouple, toutLeMondeAJoueSouple } from './flexibleTurnState.js';

function scene() {
  return {
    jouesSouples: [],
    participants: [
      { id: 'boss', initiative: 18, actionSlots: [{ initiative: 18 }, { initiative: 12 }, { initiative: 6 }] },
      { id: 'ally', initiative: 10 },
    ],
  };
}

describe('flexible action slots', () => {
  it('marks one action slot at a time for participants with several actions', () => {
    const first = ajouterJoueSouple(scene(), 'boss').scene;
    const second = ajouterJoueSouple(first, 'boss').scene;

    expect(actionsRestantesSouples(first, 'boss')).toBe(2);
    expect(actionsRestantesSouples(second, 'boss')).toBe(1);
    expect(toutLeMondeAJoueSouple(second)).toBe(false);
  });

  it('removes only the latest flexible action for one participant', () => {
    const first = ajouterJoueSouple(scene(), 'boss').scene;
    const second = ajouterJoueSouple(first, 'boss').scene;

    expect(retirerJoueSouple(second, 'boss')).toEqual(['boss:slot-1']);
  });
});
