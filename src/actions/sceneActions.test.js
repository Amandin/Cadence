import { describe, expect, it } from 'vitest';
import { temporalityModes } from '../constants.js';
import { declarationStages } from '../domain/initiativeModes.js';
import { createSceneActions } from './sceneActions.js';

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

describe('declaration round flow', () => {
  it('starts each classic round in declaration before resolving turns', () => {
    const harness = createHarness({
      id: 'scene',
      temporalite: temporalityModes.CLASSIC,
      declarationMode: true,
      startRound: 1,
      round: -1,
      activeId: '',
      activeSlotId: '',
      participants: [participant('slow', 5), participant('fast', 12)],
      reserve: [],
      statuses: [],
    });

    harness.actions().nextTurn(1);

    expect(harness.current()).toMatchObject({
      round: 1,
      activeId: '',
      activeSlotId: '',
      declarationStage: declarationStages.DECLARATION,
      declarations: {},
      resolutionOrder: [],
      declarationPlayedIds: [],
    });

    harness.actions().applyDeclarationChoices({ slow: 'Attaque', fast: 'Soutien' });

    expect(harness.current()).toMatchObject({
      activeId: 'fast',
      declarationStage: declarationStages.RESOLUTION,
      declarations: { slow: 'Attaque', fast: 'Soutien' },
      declarationPlayedIds: [],
    });

    harness.actions().nextTurn(1);
    expect(harness.current()).toMatchObject({ activeId: 'slow', declarationPlayedIds: ['fast'] });

    harness.actions().nextTurn(1);
    expect(harness.current()).toMatchObject({
      round: 2,
      activeId: '',
      activeSlotId: '',
      declarationStage: declarationStages.DECLARATION,
      declarations: {},
      resolutionOrder: [],
      declarationPlayedIds: [],
    });
  });
});

describe('restore points', () => {
  it('keeps the scene state from just before initiative starts', () => {
    const harness = createHarness({
      id: 'scene',
      temporalite: temporalityModes.CLASSIC,
      startRound: 1,
      round: -1,
      activeId: '',
      activeSlotId: '',
      notes: 'Avant le depart',
      participants: [participant('slow', 5), participant('fast', 12)],
      reserve: [],
      statuses: [],
    });

    harness.actions().nextTurn(1);

    const points = harness.restorePoints().scene;
    expect(points.map((point) => [point.kind || 'round', point.round])).toEqual([['pre-initiative', -1], ['round', 1]]);
    expect(points[0].scene).toMatchObject({ round: -1, notes: 'Avant le depart', activeId: '' });
  });
});

describe('turn rollback', () => {
  it('restores activation automations when stepping back in classic initiative', () => {
    const initialScene = {
      id: 'scene',
      temporalite: temporalityModes.CLASSIC,
      startRound: 1,
      round: 1,
      activeId: 'fast',
      activeSlotId: '',
      participants: [
        participant('fast', 12),
        {
          ...participant('slow', 5),
          statuses: [{ id: 'focus', name: 'Focus', duration: 2, remaining: 2, advanceOn: 'activation', expired: false }],
          trackers: [{ id: 'clock', type: 'clock', current: 0, min: 0, max: 6, step: 1, autoReset: 'activation' }],
        },
      ],
      reserve: [],
      statuses: [],
    };
    const harness = createHarness(initialScene);

    harness.actions().nextTurn(1);
    expect(harness.current().activeId).toBe('slow');
    expect(harness.current().participants[1].statuses[0].remaining).toBe(1);
    expect(harness.current().participants[1].trackers[0].current).toBe(1);

    harness.actions().nextTurn(-1);
    expect(harness.current()).toMatchObject({
      activeId: 'fast',
      participants: [
        { id: 'fast' },
        {
          id: 'slow',
          statuses: [{ id: 'focus', remaining: 2, expired: false }],
          trackers: [{ id: 'clock', current: 0 }],
        },
      ],
    });
    expect(harness.current()._turnHistory).toEqual([]);
  });

  it('restores round automations and the global tracker when stepping back across a round', () => {
    const harness = createHarness({
      id: 'scene',
      temporalite: temporalityModes.CLASSIC,
      startRound: 1,
      round: 1,
      activeId: 'slow',
      activeSlotId: '',
      globalTracker: { enabled: true, mode: 'counter', trigger: 'round', current: 0, total: 0 },
      statuses: [{ id: 'rain', name: 'Pluie', duration: 2, remaining: 2, advanceOn: 'round', expired: false }],
      participants: [
        {
          ...participant('fast', 12),
          statuses: [{ id: 'guard', name: 'Garde', duration: 2, remaining: 2, advanceOn: 'round', expired: false }],
          trackers: [{ id: 'round-clock', type: 'clock', current: 0, min: 0, max: 6, step: 1, autoReset: 'round' }],
        },
        participant('slow', 5),
      ],
      reserve: [],
    });

    harness.actions().nextTurn(1);
    expect(harness.current().round).toBe(2);
    expect(harness.current().activeId).toBe('fast');
    expect(harness.current().globalTracker.current).toBe(1);
    expect(harness.current().statuses[0]).toMatchObject({ id: 'rain', remaining: 1 });
    expect(harness.current().participants[0]).toMatchObject({ id: 'fast', statuses: [{ id: 'guard', remaining: 1 }], trackers: [{ id: 'round-clock', current: 1 }] });

    harness.actions().nextTurn(-1);
    expect(harness.current().round).toBe(1);
    expect(harness.current().activeId).toBe('slow');
    expect(harness.current().globalTracker.current).toBe(0);
    expect(harness.current().statuses[0]).toMatchObject({ id: 'rain', remaining: 2, expired: false });
    expect(harness.current().participants[0]).toMatchObject({ id: 'fast', statuses: [{ id: 'guard', remaining: 2, expired: false }], trackers: [{ id: 'round-clock', current: 0 }] });
  });

  it('restores flexible activation automations when undoing a played action', () => {
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
      participants: [{ id: 'runner', statuses: [{ id: 'haste', remaining: 1 }], trackers: [{ id: 'tempo', current: 1 }] }],
    });

    harness.actions().nextTurn(-1);
    expect(harness.current()).toMatchObject({
      activeId: '',
      jouesSouples: [],
      historiqueSouple: [],
      participants: [{ id: 'runner', statuses: [{ id: 'haste', remaining: 2, expired: false }], trackers: [{ id: 'tempo', current: 0 }] }],
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
