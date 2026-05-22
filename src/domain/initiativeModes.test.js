import { describe, expect, it } from 'vitest';
import { activationAdvancePolicies, initiativeOrders, initiativeValueTypes, phaseActionModes } from '../constants.js';
import {
  applyManualActionCost,
  compareInitiativeValues,
  enterDeclarationResolution,
  normalizeDeclarations,
  normalizeInitiativeModeOptions,
  participantActsInCheckedPhase,
  participantsPourPhaseAvancee,
} from './initiativeModes.js';

function participant(id, initiative, extra = {}) {
  return { id, name: id, kind: 'PJ', initiative, departage: 0, ...extra };
}

describe('advanced initiative modes', () => {
  it('normalizes the new initiative options', () => {
    expect(normalizeInitiativeModeOptions({
      phaseActionMode: phaseActionModes.CHECKED,
      initiativeValueType: initiativeValueTypes.LABEL,
      initiativeLabels: ['Rapide', 'Rapide', 'Lent'],
      activationAdvancePolicy: activationAdvancePolicies.EVERY_ACTION,
    })).toMatchObject({
      phaseActionMode: phaseActionModes.CHECKED,
      initiativeValueType: initiativeValueTypes.LABEL,
      initiativeLabels: ['Rapide', 'Lent'],
      activationAdvancePolicy: activationAdvancePolicies.EVERY_ACTION,
    });
  });

  it('compares non numeric initiative labels by configured rank', () => {
    const rules = { initiativeValueType: initiativeValueTypes.LABEL, initiativeLabels: ['Rapide', 'Normal', 'Lent'], initiativeOrder: initiativeOrders.ASC };
    expect(compareInitiativeValues('Rapide', 'Lent', rules)).toBeLessThan(0);
  });

  it('keeps checked phases separate from automatic phase decrement', () => {
    const scene = {
      phaseActionMode: phaseActionModes.CHECKED,
      participants: [participant('slow', 5, { phaseActions: ['Tir'] }), participant('fast', 12, { phaseActions: ['Tir', 'Mouvement'] })],
    };
    expect(participantsPourPhaseAvancee(scene, 'Tir').map((item) => item.id)).toEqual(['fast', 'slow']);
    expect(participantActsInCheckedPhase(scene.participants[1], 'Mouvement')).toBe(true);
  });

  it('builds a declaration resolution order from declared participants', () => {
    const scene = { declarationRequireText: true, participants: [participant('a', 8), participant('b', 12)], declarations: { a: 'attaque', b: 'soin' } };
    expect(normalizeDeclarations(scene.declarations, scene.participants)).toEqual({ a: 'attaque', b: 'soin' });
    expect(enterDeclarationResolution(scene).resolutionOrder).toHaveLength(2);
  });

  it('applies a manual action cost to the current action slot only', () => {
    expect(applyManualActionCost({ initiative: 10, actionSlots: [{ initiative: 10 }, { initiative: 5 }] }, 3)).toMatchObject({ initiative: 7, actionSlots: [{ initiative: 7 }, { initiative: 5 }] });
  });
});
