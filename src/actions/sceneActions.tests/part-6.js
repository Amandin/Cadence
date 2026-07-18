import { describe, expect, it } from 'vitest';
import { temporalityModes } from '../../constants.js';
import { declarationStages } from '../../domain/initiativeModes.js';
import { createSceneActions } from '.././sceneActions.js';

const participant = (id, initiative) => ({ id, name: id, kind: 'PJ', initiative, trackers: [], statuses: [] });

function createHarness(initialScene) {
  let scenes = [initialScene];
  let restorePoints = {};
  let roundEffect = null;

  const current = () => scenes[0];
  const actions = () => createSceneActions({
    scene: current(),
    sceneIndex: 0,
    blocked: [],
    restorePoints,
    setScenes: (updater) => { scenes = typeof updater === 'function' ? updater(scenes) : updater; },
    setRestorePoints: (updater) => { restorePoints = typeof updater === 'function' ? updater(restorePoints) : updater; },
    setRoundEffect: (value) => { roundEffect = value; },
  });

  return { actions, current, restorePoints: () => restorePoints, roundEffect: () => roundEffect };
}

describe('dynamic initiative additions', () => {
  it('activates an inserted classic participant immediately when requested', () => {
    const harness = createHarness({
      id: 'scene',
      temporalite: temporalityModes.CLASSIC,
      round: 1,
      activeId: 'middle',
      activeSlotId: 'middle:slot-1',
      participants: [participant('fast', 14), participant('middle', 10), participant('slow', 5)],
      reserve: [],
      statuses: [],
    });

    harness.actions().addParticipant({
      ...participant('inserted', 12),
      statuses: [{ id: 'arrival', name: 'Arrivee', duration: 2, remaining: 2, advanceOn: 'activation', expired: false }],
      trackers: [{ id: 'clock', type: 'clock', current: 0, min: 0, max: 6, step: 1, autoReset: 'activation' }],
    });
    harness.actions().activateParticipantNow('inserted');

    expect(harness.current()).toMatchObject({
      round: 1,
      activeId: 'inserted',
      activeSlotId: 'inserted:slot-1',
      participants: [
        { id: 'fast' },
        { id: 'inserted', statuses: [{ id: 'arrival', remaining: 1 }], trackers: [{ id: 'clock', current: 1 }] },
        { id: 'middle' },
        { id: 'slow' },
      ],
    });

    harness.actions().nextTurn(1);
    expect(harness.current().activeId).toBe('middle');
  });

  it('activates an inserted classic participant returning from reserve', () => {
    const harness = createHarness({
      id: 'scene',
      temporalite: temporalityModes.CLASSIC,
      round: 1,
      activeId: 'middle',
      activeSlotId: 'middle:slot-1',
      participants: [participant('fast', 14), participant('middle', 10), participant('slow', 5)],
      reserve: [{ ...participant('inserted', 0), actionSlots: [] }],
      statuses: [],
    });

    harness.actions().joinInit('inserted', 12);
    harness.actions().activateParticipantNow('inserted');

    expect(harness.current()).toMatchObject({
      activeId: 'inserted',
      activeSlotId: 'inserted:slot-1',
      reserve: [],
      participants: [{ id: 'fast' }, { id: 'inserted', initiative: '12' }, { id: 'middle' }, { id: 'slow' }],
    });

    harness.actions().nextTurn(1);
    expect(harness.current().activeId).toBe('middle');
  });

  it('activates an inserted automatic-phase participant without a classic slot', () => {
    const harness = createHarness({
      id: 'scene',
      temporalite: temporalityModes.PHASES,
      phaseActionMode: 'automatic',
      phase: 2,
      phaseDecrement: 10,
      round: 1,
      activeId: 'middle',
      activeSlotId: '',
      participants: [participant('fast', 25), participant('middle', 20), participant('slow', 15)],
      reserve: [],
      statuses: [],
    });

    harness.actions().addParticipant(participant('inserted', 23));
    harness.actions().activateParticipantNow('inserted');

    expect(harness.current()).toMatchObject({ activeId: 'inserted', activeSlotId: '' });
    harness.actions().nextTurn(1);
    expect(harness.current().activeId).toBe('middle');
  });
});
