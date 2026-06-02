import { describe, expect, it } from 'vitest';
import { initiativeOrders, phaseActionModes, temporalityModes } from '../constants.js';
import { classerAjoutDynamique, dynamicAdditionKinds, initiativeClassiqueDejaDepassee } from './dynamicInitiative.js';

const participant = (id, initiative) => ({
  id,
  name: id,
  kind: 'PJ',
  initiative,
  actionSlots: [{ id: 'slot-1', initiative, order: 0 }],
});

const scene = (patch = {}) => ({
  temporalite: temporalityModes.CLASSIC,
  round: 1,
  activeId: 'middle',
  activeSlotId: 'middle:slot-1',
  participants: [participant('fast', 15), participant('middle', 10), participant('slow', 5)],
  ...patch,
});

describe('dynamic classic initiative additions', () => {
  it('detects an initiative already passed in descending classic order', () => {
    expect(initiativeClassiqueDejaDepassee(scene(), participant('late', 12))).toBe(true);
    expect(initiativeClassiqueDejaDepassee(scene(), participant('future', 8))).toBe(false);
  });

  it('distinguishes an immediate insertion from an initiative fully passed', () => {
    expect(classerAjoutDynamique(scene(), participant('insert', 12))).toBe(dynamicAdditionKinds.CLASSIC_INSERT);
    expect(classerAjoutDynamique(scene(), participant('passed', 20))).toBe(dynamicAdditionKinds.CLASSIC_PASSED);
  });

  it('revalidates an adjusted participant by replacing its existing initiative entry', () => {
    const withCandidate = scene({ participants: [...scene().participants, participant('insert', 12)] });
    expect(classerAjoutDynamique(withCandidate, participant('insert', 12), 8)).toBe(null);
    expect(classerAjoutDynamique(withCandidate, participant('insert', 12), 13)).toBe(dynamicAdditionKinds.CLASSIC_INSERT);
  });

  it('uses the configured ascending order', () => {
    const ascending = scene({
      initiativeOrder: initiativeOrders.ASC,
      participants: [participant('slow', 5), participant('middle', 10), participant('fast', 15)],
    });
    expect(initiativeClassiqueDejaDepassee(ascending, participant('late', 8))).toBe(true);
    expect(initiativeClassiqueDejaDepassee(ascending, participant('future', 12))).toBe(false);
  });

  it('does not warn before initiative starts or outside classic mode', () => {
    expect(initiativeClassiqueDejaDepassee(scene({ round: -1, activeId: '', activeSlotId: '' }), participant('new', 20))).toBe(false);
    expect(initiativeClassiqueDejaDepassee(scene({ temporalite: temporalityModes.FLEXIBLE }), participant('new', 20))).toBe(false);
    expect(initiativeClassiqueDejaDepassee(scene({ temporalite: temporalityModes.PHASES }), participant('new', 20))).toBe(false);
  });

  it('reports an automatic phase insertion immediately before the current participant', () => {
    expect(classerAjoutDynamique(scene({
      temporalite: temporalityModes.PHASES,
      phaseActionMode: phaseActionModes.AUTOMATIC,
      phase: 2,
      phaseDecrement: 10,
      activeId: 'middle',
      participants: [participant('fast', 25), participant('middle', 20), participant('slow', 15)],
    }), participant('late', 23))).toBe(dynamicAdditionKinds.PHASE_INSERT);
  });

  it('reports an automatic phase initiative fully passed for the current phase', () => {
    expect(classerAjoutDynamique(scene({
      temporalite: temporalityModes.PHASES,
      phaseActionMode: phaseActionModes.AUTOMATIC,
      phase: 2,
      phaseDecrement: 10,
      activeId: 'middle',
      participants: [participant('fast', 25), participant('middle', 20), participant('slow', 15)],
    }), participant('late', 30))).toBe(dynamicAdditionKinds.PHASE_PASSED);
  });

  it('reports a checked phase addition that does not act in the current phase', () => {
    expect(classerAjoutDynamique(scene({
      temporalite: temporalityModes.PHASES,
      phaseActionMode: phaseActionModes.CHECKED,
      phase: 2,
      activeId: 'middle',
      participants: [{ ...participant('middle', 10), phaseActions: ['2'] }],
    }), { ...participant('late', 12), phaseActions: ['1'] })).toBe(dynamicAdditionKinds.PHASE_NOT_CURRENT);
  });

  it('treats checked phase insertions like the classic sequence when the participant acts in the current phase', () => {
    expect(classerAjoutDynamique(scene({
      temporalite: temporalityModes.PHASES,
      phaseActionMode: phaseActionModes.CHECKED,
      phase: 2,
      activeId: 'middle',
      participants: [
        { ...participant('fast', 15), phaseActions: ['2'] },
        { ...participant('middle', 10), phaseActions: ['2'] },
        { ...participant('slow', 5), phaseActions: ['2'] },
      ],
    }), { ...participant('late', 12), phaseActions: ['2'] })).toBe(dynamicAdditionKinds.PHASE_INSERT);
  });
});
