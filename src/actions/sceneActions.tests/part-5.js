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

describe('turn rollback', () => {
  it('keeps flexible played marks from triggering activation automations', () => {
    const harness = createHarness({
      id: 'scene',
      temporalite: temporalityModes.FLEXIBLE,
      startRound: 1,
      round: 1,
      activeId: '',
      activeSlotId: '',
      participants: [{
        ...participant('runner', 10),
        statuses: [{ id: 'haste', name: 'Hate', duration: 2, remaining: 2, advanceOn: 'activation', expired: false }],
        trackers: [{ id: 'tempo', type: 'clock', current: 0, min: 0, max: 6, step: 1, autoReset: 'activation' }],
      }],
      reserve: [],
      statuses: [],
      jouesSouples: [],
      historiqueSouple: [],
    });

    harness.actions().markFlexiblePlayed('runner');
    expect(harness.current()).toMatchObject({
      activeId: 'runner',
      jouesSouples: ['runner:slot-1'],
      participants: [{ id: 'runner', statuses: [{ id: 'haste', remaining: 2 }], trackers: [{ id: 'tempo', current: 0 }] }],
    });

    harness.actions().nextTurn(-1);
    expect(harness.current()).toMatchObject({
      activeId: '',
      jouesSouples: [],
      historiqueSouple: [],
      participants: [{ id: 'runner', statuses: [{ id: 'haste', remaining: 2, expired: false }], trackers: [{ id: 'tempo', current: 0 }] }],
    });
  });

  it('returns only one flexible action to a participant with several actions', () => {
    const harness = createHarness({
      id: 'scene',
      temporalite: temporalityModes.FLEXIBLE,
      startRound: 1,
      round: 1,
      activeId: '',
      activeSlotId: '',
      participants: [{ ...participant('boss', 18), actionSlots: [{ initiative: 18 }, { initiative: 12 }] }],
      reserve: [],
      statuses: [],
      jouesSouples: [],
      historiqueSouple: [],
    });

    harness.actions().markFlexiblePlayed('boss');
    harness.actions().markFlexiblePlayed('boss');
    harness.actions().unmarkFlexiblePlayed('boss');

    expect(harness.current()).toMatchObject({
      activeId: 'boss',
      jouesSouples: ['boss:slot-1'],
      historiqueSouple: ['boss:slot-1'],
    });
  });

  it('restores declaration state before activation automations', () => {
    const harness = createHarness({
      id: 'scene',
      temporalite: temporalityModes.CLASSIC,
      declarationMode: true,
      declarationStage: declarationStages.DECLARATION,
      startRound: 1,
      round: 1,
      activeId: '',
      activeSlotId: '',
      participants: [{
        ...participant('fast', 12),
        statuses: [{ id: 'stance', name: 'Posture', duration: 2, remaining: 2, advanceOn: 'activation', expired: false }],
        trackers: [{ id: 'clock', type: 'clock', current: 0, min: 0, max: 6, step: 1, autoReset: 'activation' }],
      }],
      reserve: [],
      statuses: [],
      declarations: {},
      resolutionOrder: [],
      declarationPlayedIds: [],
    });

    harness.actions().applyDeclarationChoices({ fast: 'Attaque' });
    expect(harness.current()).toMatchObject({
      activeId: 'fast',
      declarationStage: declarationStages.RESOLUTION,
      participants: [{ id: 'fast', statuses: [{ id: 'stance', remaining: 1 }], trackers: [{ id: 'clock', current: 1 }] }],
    });

    harness.actions().nextTurn(-1);
    expect(harness.current()).toMatchObject({
      activeId: '',
      declarationStage: declarationStages.DECLARATION,
      declarations: {},
      resolutionOrder: [],
      participants: [{ id: 'fast', statuses: [{ id: 'stance', remaining: 2, expired: false }], trackers: [{ id: 'clock', current: 0 }] }],
    });
  });
});
