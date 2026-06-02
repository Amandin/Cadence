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
  it('starts from preparation initiatives and applies surprise as a limited activation status', () => {
    const harness = createHarness({
      id: 'scene',
      temporalite: temporalityModes.CLASSIC,
      preparationSurprise: true,
      startRound: 1,
      round: -1,
      activeId: '',
      activeSlotId: '',
      participants: [participant('fast', 12), participant('slow', 5)],
      reserve: [{ ...participant('reserve', 0), actionSlots: [] }],
      statuses: [],
    });

    harness.actions().startSceneWithInitiatives({ fast: ['14'], slow: ['7'] }, ['fast']);

    expect(harness.current()).toMatchObject({
      round: 1,
      activeId: 'fast',
      participants: [
        { id: 'fast', initiative: '14', statuses: [{ name: 'Surpris', remaining: 1, limited: true, advanceOn: 'activation', expired: false }] },
        { id: 'slow', initiative: '7', statuses: [] },
      ],
      reserve: [{ id: 'reserve' }],
    });
    expect(harness.current().participants[0].statuses[0]).toMatchObject({ skipNextAdvance: false, advanceSkipConsumed: true });

    harness.actions().nextTurn(1);
    harness.actions().nextTurn(1);

    expect(harness.current().participants.find((item) => item.id === 'fast').statuses[0]).toMatchObject({ name: 'Surpris', remaining: 0, limited: true, expired: true });
  });

  it('starts a flexible scene without initiative while keeping the initial surprise selection', () => {
    const harness = createHarness({
      id: 'scene',
      temporalite: temporalityModes.FLEXIBLE,
      flexibleUseInitiative: false,
      preparationSurprise: true,
      surpriseImpact: 'inactive',
      startRound: 1,
      round: -1,
      participants: [participant('fast', 12)],
      reserve: [],
      statuses: [],
    });

    harness.actions().startSceneWithInitiatives({}, ['fast']);

    expect(harness.current()).toMatchObject({
      round: 1,
      activeId: '',
      participants: [{ id: 'fast', statuses: [{ name: 'Surpris', inactive: true, limited: false, remaining: 1 }] }],
    });
  });

  it('keeps an initial round-based surprise until the next round begins', () => {
    const harness = createHarness({
      id: 'scene',
      temporalite: temporalityModes.CLASSIC,
      preparationSurprise: true,
      surpriseAdvanceOn: 'round',
      startRound: 1,
      round: -1,
      participants: [participant('fast', 12)],
      reserve: [],
      statuses: [],
    });

    harness.actions().startSceneWithInitiatives({ fast: ['12'] }, ['fast']);
    expect(harness.current().participants[0].statuses[0]).toMatchObject({ name: 'Surpris', advanceOn: 'round', remaining: 1, expired: false, advanceSkipConsumed: true });

    harness.actions().nextTurn(1);
    expect(harness.current().participants[0].statuses[0]).toMatchObject({ name: 'Surpris', advanceOn: 'round', remaining: 0, expired: true });
  });

  it('uses the current surprise rules when the initial initiative window starts the scene', () => {
    let scenes = [{
      id: 'scene',
      temporalite: temporalityModes.CLASSIC,
      preparationSurprise: true,
      startRound: 1,
      round: -1,
      participants: [participant('fast', 12)],
      reserve: [],
      statuses: [],
    }];
    const actions = createSceneActions({
      scene: { ...scenes[0], surpriseAdvanceOn: 'round' },
      sceneIndex: 0,
      blocked: [],
      restorePoints: {},
      setScenes: (updater) => { scenes = typeof updater === 'function' ? updater(scenes) : updater; },
      setRestorePoints: () => {},
      setRoundEffect: () => {},
    });

    actions.startSceneWithInitiatives({ fast: ['12'] }, ['fast']);

    expect(scenes[0].participants[0].statuses[0]).toMatchObject({ name: 'Surpris', advanceOn: 'round' });
  });

  it('keeps a tiebreaker entered from the initial initiative window', () => {
    const harness = createHarness({
      id: 'scene',
      temporalite: temporalityModes.CLASSIC,
      startRound: 1,
      round: -1,
      participants: [participant('fast', 12)],
      reserve: [],
      statuses: [],
    });

    harness.actions().startSceneWithInitiatives({ fast: ['14'] }, [], { fast: '3' });

    expect(harness.current().participants[0]).toMatchObject({ id: 'fast', initiative: '14', departage: 3 });
  });

  it('triggers the first classic activation when leaving preparation', () => {
    const harness = createHarness({
      id: 'scene',
      temporalite: temporalityModes.CLASSIC,
      startRound: 1,
      round: -1,
      activeId: '',
      activeSlotId: '',
      participants: [{
        ...participant('fast', 12),
        statuses: [{ id: 'stance', name: 'Posture', duration: 2, remaining: 2, advanceOn: 'activation', expired: false }],
        trackers: [{ id: 'clock', type: 'clock', current: 0, min: 0, max: 6, step: 1, autoReset: 'activation' }],
      }],
      reserve: [],
      statuses: [],
    });

    harness.actions().nextTurn(1);

    expect(harness.current()).toMatchObject({
      activeId: 'fast',
      participants: [{ id: 'fast', statuses: [{ id: 'stance', remaining: 1 }], trackers: [{ id: 'clock', current: 1 }] }],
    });
  });

  it('applies the initial round event before the first classic activation', () => {
    const harness = createHarness({
      id: 'scene',
      temporalite: temporalityModes.CLASSIC,
      startRound: 1,
      round: -1,
      activeId: '',
      activeSlotId: '',
      globalTracker: { enabled: true, mode: 'counter', trigger: 'round', current: 0, total: 0 },
      statuses: [{ id: 'rain', name: 'Pluie', duration: 2, remaining: 2, advanceOn: 'round', expired: false }],
      participants: [{
        ...participant('fast', 12),
        statuses: [
          { id: 'guard', name: 'Garde', duration: 2, remaining: 2, advanceOn: 'round', expired: false },
          { id: 'stance', name: 'Posture', duration: 2, remaining: 2, advanceOn: 'activation', expired: false },
        ],
        trackers: [{ id: 'round-clock', type: 'clock', current: 0, min: 0, max: 6, step: 1, autoReset: 'round' }],
      }, {
        ...participant('slow', 5),
        statuses: [{ id: 'slow-guard', name: 'Garde lente', duration: 2, remaining: 2, advanceOn: 'round', expired: false }],
      }],
      reserve: [],
    });

    harness.actions().nextTurn(1);

    expect(harness.current()).toMatchObject({
      round: 1,
      activeId: 'fast',
      globalTracker: { current: 1 },
      statuses: [{ id: 'rain', remaining: 1 }],
      participants: [{
        id: 'fast',
        statuses: [{ id: 'guard', remaining: 1 }, { id: 'stance', remaining: 1 }],
        trackers: [{ id: 'round-clock', current: 1 }],
      }, {
        id: 'slow',
        statuses: [{ id: 'slow-guard', remaining: 1 }],
      }],
    });
  });

  it('restores initial activation automations when returning to preparation', () => {
    const harness = createHarness({
      id: 'scene',
      temporalite: temporalityModes.CLASSIC,
      startRound: 1,
      round: -1,
      activeId: '',
      activeSlotId: '',
      participants: [{
        ...participant('fast', 12),
        statuses: [{ id: 'stance', name: 'Posture', duration: 2, remaining: 2, advanceOn: 'activation', expired: false }],
        trackers: [{ id: 'clock', type: 'clock', current: 0, min: 0, max: 6, step: 1, autoReset: 'activation' }],
      }],
      reserve: [],
      statuses: [],
    });

    harness.actions().nextTurn(1);
    harness.actions().returnToPreparation();

    expect(harness.current()).toMatchObject({
      round: -1,
      activeId: '',
      activeSlotId: '',
      participants: [{ id: 'fast', statuses: [{ id: 'stance', remaining: 2, expired: false }], trackers: [{ id: 'clock', current: 0 }] }],
      _turnHistory: [],
    });
  });

  it('triggers the first phase activation when leaving preparation', () => {
    const harness = createHarness({
      id: 'scene',
      temporalite: temporalityModes.PHASES,
      phaseActionMode: 'automatic',
      startRound: 1,
      round: -1,
      activeId: '',
      activeSlotId: '',
      participants: [{
        ...participant('fast', 12),
        statuses: [{ id: 'stance', name: 'Posture', duration: 2, remaining: 2, advanceOn: 'activation', expired: false }],
        trackers: [{ id: 'clock', type: 'clock', current: 0, min: 0, max: 6, step: 1, autoReset: 'activation' }],
      }],
      reserve: [],
      statuses: [],
    });

    harness.actions().nextTurn(1);

    expect(harness.current()).toMatchObject({
      activeId: 'fast',
      participants: [{ id: 'fast', statuses: [{ id: 'stance', remaining: 1 }], trackers: [{ id: 'clock', current: 1 }] }],
    });
  });

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

  it('keeps flexible declaration resolution free before returning to declaration next round', () => {
    const harness = createHarness({
      id: 'scene',
      temporalite: temporalityModes.FLEXIBLE,
      declarationMode: true,
      startRound: 1,
      round: 1,
      activeId: '',
      activeSlotId: '',
      participants: [participant('slow', 5), participant('fast', 12)],
      reserve: [],
      statuses: [],
      declarationStage: declarationStages.DECLARATION,
      declarations: {},
      resolutionOrder: [],
      declarationPlayedIds: [],
      jouesSouples: [],
      historiqueSouple: [],
    });

    harness.actions().applyDeclarationChoices({ slow: 'Attaque', fast: 'Soutien' });
    expect(harness.current()).toMatchObject({
      declarationStage: declarationStages.RESOLUTION,
      activeId: '',
      declarations: { slow: 'Attaque', fast: 'Soutien' },
    });

    harness.actions().markFlexiblePlayed('slow');
    harness.actions().markFlexiblePlayed('fast');
    expect(harness.current()).toMatchObject({ jouesSouples: ['slow:slot-1', 'fast:slot-1'], declarationPlayedIds: ['slow', 'fast'] });

    harness.actions().nextTurn(1);
    expect(harness.current()).toMatchObject({
      round: 2,
      declarationStage: declarationStages.DECLARATION,
      activeId: '',
      declarations: {},
      declarationPlayedIds: [],
      jouesSouples: [],
    });
  });

  it('leaves preparation in flexible declaration mode', () => {
    const harness = createHarness({
      id: 'scene',
      temporalite: temporalityModes.FLEXIBLE,
      declarationMode: true,
      startRound: 1,
      round: -1,
      activeId: '',
      activeSlotId: '',
      participants: [participant('slow', 5), participant('fast', 12)],
      reserve: [],
      statuses: [],
      jouesSouples: [],
      historiqueSouple: [],
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
      jouesSouples: [],
    });
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

  it('starts a new round from a single classic slot', () => {
    const harness = createHarness({
      id: 'scene',
      temporalite: temporalityModes.CLASSIC,
      startRound: 1,
      round: 1,
      activeId: 'solo',
      activeSlotId: '',
      globalTracker: { enabled: true, mode: 'counter', trigger: 'round', current: 0, total: 0 },
      statuses: [{ id: 'rain', name: 'Pluie', duration: 2, remaining: 2, advanceOn: 'round', expired: false }],
      participants: [{
        ...participant('solo', 12),
        statuses: [{ id: 'guard', name: 'Garde', duration: 2, remaining: 2, advanceOn: 'round', expired: false }],
        trackers: [{ id: 'round-clock', type: 'clock', current: 0, min: 0, max: 6, step: 1, autoReset: 'round' }],
      }],
      reserve: [],
    });

    harness.actions().nextTurn(1);

    expect(harness.current().round).toBe(2);
    expect(harness.current().activeId).toBe('solo');
    expect(harness.current().globalTracker.current).toBe(1);
    expect(harness.current().statuses[0]).toMatchObject({ id: 'rain', remaining: 1 });
    expect(harness.current().participants[0]).toMatchObject({ id: 'solo', statuses: [{ id: 'guard', remaining: 1 }], trackers: [{ id: 'round-clock', current: 1 }] });
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
