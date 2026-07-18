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

  it('keeps reserve characters out of automatic round progression', () => {
    const harness = createHarness({
      id: 'scene',
      temporalite: temporalityModes.CLASSIC,
      startRound: 1,
      round: 1,
      activeId: 'solo',
      activeSlotId: '',
      participants: [participant('solo', 12)],
      reserve: [{
        ...participant('reserve', 0),
        actionSlots: [],
        statuses: [{ id: 'wait', name: 'Attente', duration: 2, remaining: 2, advanceOn: 'round', expired: false }],
        trackers: [{ id: 'reserve-clock', type: 'clock', current: 0, min: 0, max: 6, step: 1, autoReset: 'round' }],
      }],
      statuses: [],
    });

    harness.actions().nextTurn(1);
    expect(harness.current().reserve[0]).toMatchObject({ statuses: [{ id: 'wait', remaining: 2 }], trackers: [{ id: 'reserve-clock', current: 0 }] });

    harness.actions().advanceReserveRound();
    expect(harness.current().reserve[0]).toMatchObject({ statuses: [{ id: 'wait', remaining: 1 }], trackers: [{ id: 'reserve-clock', current: 1 }] });
  });

  it('advances manual automation correction for round and activation effects', () => {
    const harness = createHarness({
      id: 'scene',
      temporalite: temporalityModes.CLASSIC,
      startRound: 1,
      round: 1,
      activeId: 'solo',
      activeSlotId: '',
      globalTracker: { enabled: true, name: 'Menace', mode: 'counter', current: 0, max: 6, total: 0, auto: true, trigger: 'round' },
      participants: [{
        ...participant('solo', 12),
        statuses: [
          { id: 'round-status', name: 'Round', duration: 2, remaining: 2, advanceOn: 'round', expired: false },
          { id: 'activation-status', name: 'Activation', duration: 2, remaining: 2, advanceOn: 'activation', expired: false },
        ],
        trackers: [
          { id: 'round-clock', type: 'clock', current: 0, min: 0, max: 6, step: 1, autoReset: 'round' },
          { id: 'activation-clock', type: 'clock', current: 0, min: 0, max: 6, step: 1, autoReset: 'activation' },
        ],
      }],
      reserve: [{
        ...participant('reserve', 0),
        actionSlots: [],
        statuses: [{ id: 'reserve-status', name: 'Reserve', duration: 2, remaining: 2, advanceOn: 'activation', expired: false }],
        trackers: [{ id: 'reserve-clock', type: 'clock', current: 0, min: 0, max: 6, step: 1, autoReset: 'activation' }],
      }],
      statuses: [{ id: 'scene-status', name: 'Scene', duration: 2, remaining: 2, advanceOn: 'round', expired: false }],
    });

    harness.actions().advanceAllAutomations();

    expect(harness.current().globalTracker.current).toBe(1);
    expect(harness.current().statuses[0]).toMatchObject({ id: 'scene-status', remaining: 1 });
    expect(harness.current().participants[0].statuses).toEqual([
      expect.objectContaining({ id: 'round-status', remaining: 1 }),
      expect.objectContaining({ id: 'activation-status', remaining: 1 }),
    ]);
    expect(harness.current().participants[0].trackers).toEqual([
      expect.objectContaining({ id: 'round-clock', current: 1 }),
      expect.objectContaining({ id: 'activation-clock', current: 1 }),
    ]);
    expect(harness.current().reserve[0]).toMatchObject({
      statuses: [{ id: 'reserve-status', remaining: 2 }],
      trackers: [{ id: 'reserve-clock', current: 0 }],
    });
  });

  it('changes the round number with optional automation correction', () => {
    const harness = createHarness({
      id: 'scene',
      temporalite: temporalityModes.CLASSIC,
      startRound: 1,
      round: 3,
      activeId: 'solo',
      activeSlotId: '',
      globalTracker: { enabled: true, name: 'Menace', mode: 'counter', current: 1, max: 6, total: 1, auto: true, trigger: 'round' },
      statuses: [{ id: 'scene-status', name: 'Scene', duration: 3, remaining: 2, advanceOn: 'round', expired: false }],
      participants: [{
        ...participant('solo', 12),
        statuses: [
          { id: 'round-status', name: 'Round', duration: 3, remaining: 2, advanceOn: 'round', expired: false },
          { id: 'activation-status', name: 'Activation', duration: 3, remaining: 2, advanceOn: 'activation', expired: false },
        ],
        trackers: [
          { id: 'round-clock', type: 'clock', current: 1, min: 0, max: 6, step: 1, autoReset: 'round' },
          { id: 'activation-clock', type: 'clock', current: 1, min: 0, max: 6, step: 1, autoReset: 'activation' },
        ],
      }],
      reserve: [],
    });

    harness.actions().changeRoundNumberWithAutomations(1, { applyAutomations: false });
    expect(harness.current().round).toBe(4);
    expect(harness.current().participants[0].statuses[0]).toMatchObject({ id: 'round-status', remaining: 2 });

    harness.actions().changeRoundNumberWithAutomations(1, { applyAutomations: true });
    expect(harness.current().round).toBe(5);
    expect(harness.current().globalTracker.current).toBe(2);
    expect(harness.current().statuses[0]).toMatchObject({ id: 'scene-status', remaining: 1 });
    expect(harness.current().participants[0].statuses).toEqual([
      expect.objectContaining({ id: 'round-status', remaining: 1 }),
      expect.objectContaining({ id: 'activation-status', remaining: 1 }),
    ]);
    expect(harness.current().participants[0].trackers).toEqual([
      expect.objectContaining({ id: 'round-clock', current: 2 }),
      expect.objectContaining({ id: 'activation-clock', current: 2 }),
    ]);
  });

  it('returns to preparation with optional tracker reset and temporary effects ended', () => {
    const harness = createHarness({
      id: 'scene',
      temporalite: temporalityModes.CLASSIC,
      startRound: 1,
      round: 2,
      activeId: 'solo',
      activeSlotId: '',
      globalTracker: { enabled: true, name: 'Menace', mode: 'counter', current: 4, max: 6, total: 4, auto: true, trigger: 'round' },
      statuses: [
        { id: 'scene-temp', name: 'Scene temporaire', duration: 2, remaining: 1, advanceOn: 'round', expired: false },
        { id: 'scene-perm', name: 'Scene permanente', duration: null, remaining: null, advanceOn: 'round', expired: false },
      ],
      participants: [{
        ...participant('solo', 12),
        statuses: [{ id: 'temp', name: 'Temporaire', duration: 2, remaining: 1, advanceOn: 'activation', expired: false }],
        trackers: [{ id: 'clock', type: 'clock', current: 3, initial: 0, min: 0, max: 6, step: 1, autoReset: 'round' }],
      }],
      reserve: [],
    });

    harness.actions().returnToPreparationWithOptions({ resetTrackers: true, endTemporaryEffects: true });

    expect(harness.current()).toMatchObject({ round: -1, activeId: '' });
    expect(harness.current().globalTracker).toMatchObject({ current: 0, total: 0 });
    expect(harness.current().statuses).toEqual([
      expect.objectContaining({ id: 'scene-temp', remaining: 0, expired: true }),
      expect.objectContaining({ id: 'scene-perm', remaining: null, expired: false }),
    ]);
    expect(harness.current().participants[0]).toMatchObject({
      statuses: [expect.objectContaining({ id: 'temp', remaining: 0, expired: true })],
      trackers: [expect.objectContaining({ id: 'clock', current: 0 })],
    });
  });

  it('creates and clears initiative-cost slots without changing base initiative', () => {
    const harness = createHarness({
      id: 'scene',
      temporalite: temporalityModes.CLASSIC,
      multipleActionMode: 'initiative-cost',
      multipleActionSlots: true,
      initiativeCostThreshold: 0,
      startRound: 1,
      round: 1,
      activeId: 'alix',
      activeSlotId: 'alix:slot-1',
      participants: [participant('alix', 18), participant('bran', 15)],
      reserve: [],
      statuses: [],
    });

    harness.actions().applyInitiativeCost(6);

    const alix = harness.current().participants.find((item) => item.id === 'alix');
    expect(alix.initiative).toBe(18);
    expect(alix.actionSlots).toEqual([
      expect.objectContaining({ id: 'slot-1', initiative: 18, played: true, costPaid: 6, costResult: 12 }),
      expect.objectContaining({ initiative: 12, generatedBy: 'initiative-cost' }),
    ]);
    expect(harness.current()).toMatchObject({ activeId: 'bran', activeSlotId: 'bran:slot-1' });

    harness.actions().applyInitiativeCost(null);
    harness.actions().applyInitiativeCost(null);

    expect(harness.current()).toMatchObject({ round: 2, activeId: 'alix' });
    expect(harness.current().participants.find((item) => item.id === 'alix')).toMatchObject({
      initiative: 18,
      actionSlots: [expect.objectContaining({ id: 'slot-1', initiative: 18 })],
    });
  });

  it('steps back over the previous initiative-cost action before leaving the round', () => {
    const harness = createHarness({
      id: 'scene',
      temporalite: temporalityModes.CLASSIC,
      multipleActionMode: 'initiative-cost',
      multipleActionSlots: true,
      initiativeCostThreshold: 0,
      startRound: 1,
      round: 1,
      activeId: 'alix',
      activeSlotId: 'alix:slot-1',
      participants: [participant('alix', 18), participant('bran', 15)],
      reserve: [],
      statuses: [],
    });

    harness.actions().applyInitiativeCost(6);
    harness.actions().nextTurn(-1);

    expect(harness.current()).toMatchObject({ round: 1, activeId: 'alix', activeSlotId: 'alix:slot-1' });
    expect(harness.current().participants.find((item) => item.id === 'alix').actionSlots).toBeUndefined();
  });

  it('steps back over an ended action sequence in initiative-cost mode', () => {
    const harness = createHarness({
      id: 'scene',
      temporalite: temporalityModes.CLASSIC,
      multipleActionMode: 'initiative-cost',
      multipleActionSlots: true,
      initiativeCostThreshold: 0,
      startRound: 1,
      round: 1,
      activeId: 'alix',
      activeSlotId: 'alix:slot-1',
      participants: [participant('alix', 18), participant('bran', 15)],
      reserve: [],
      statuses: [],
    });

    harness.actions().applyInitiativeCost(null);
    harness.actions().nextTurn(-1);

    expect(harness.current()).toMatchObject({ round: 1, activeId: 'alix', activeSlotId: 'alix:slot-1' });
    expect(harness.current().participants.find((item) => item.id === 'alix').actionSlots).toBeUndefined();
  });

  it('keeps starting initiatives at or below the initiative-cost threshold out of the active sequence', () => {
    const harness = createHarness({
      id: 'scene',
      temporalite: temporalityModes.CLASSIC,
      multipleActionMode: 'initiative-cost',
      multipleActionSlots: true,
      initiativeCostThreshold: 5,
      startRound: 1,
      round: -1,
      activeId: '',
      activeSlotId: '',
      participants: [participant('under', 4), participant('equal', 5), participant('above', 6)],
      reserve: [],
      statuses: [],
    });

    harness.actions().nextTurn(1);
    expect(harness.current()).toMatchObject({ round: 1, activeId: 'above', activeSlotId: 'above:slot-1' });

    harness.actions().applyInitiativeCost(null);
    expect(harness.current()).toMatchObject({ round: 2, activeId: 'above' });
  });

  it('can start an initiative-cost round with no active character when all initiatives are below threshold', () => {
    const harness = createHarness({
      id: 'scene',
      temporalite: temporalityModes.CLASSIC,
      multipleActionMode: 'initiative-cost',
      multipleActionSlots: true,
      initiativeCostThreshold: 0,
      startRound: 1,
      round: -1,
      activeId: '',
      activeSlotId: '',
      participants: [participant('zero', 0), participant('negative', -1)],
      reserve: [],
      statuses: [],
    });

    harness.actions().nextTurn(1);
    expect(harness.current()).toMatchObject({ round: 1, activeId: '', activeSlotId: '' });
  });

  it('leaves initiative empty for reroll at the next initiative-cost round', () => {
    const harness = createHarness({
      id: 'scene',
      temporalite: temporalityModes.CLASSIC,
      multipleActionMode: 'initiative-cost',
      multipleActionSlots: true,
      phaseRerollEachRound: true,
      initiativeCostThreshold: 0,
      startRound: 1,
      round: 1,
      activeId: 'alix',
      activeSlotId: 'alix:slot-1',
      participants: [participant('alix', 12)],
      reserve: [],
      statuses: [],
    });

    harness.actions().applyInitiativeCost(null);

    expect(harness.current()).toMatchObject({ round: 2, activeId: '', activeSlotId: '' });
  });

  it('limits initiative cost to the current slot when the rule is active', () => {
    const harness = createHarness({
      id: 'scene',
      temporalite: temporalityModes.CLASSIC,
      multipleActionMode: 'initiative-cost',
      multipleActionSlots: true,
      initiativeCostThreshold: 0,
      initiativeCostLimitToCurrent: true,
      startRound: 1,
      round: 1,
      activeId: 'alix',
      activeSlotId: 'alix:slot-1',
      participants: [participant('alix', 4), participant('bran', 3)],
      reserve: [],
      statuses: [],
    });

    harness.actions().applyInitiativeCost(5);
    expect(harness.current().participants.find((item) => item.id === 'alix').actionSlots[0]).toMatchObject({
      played: true,
      costPaid: 4,
      costResult: 0,
    });
  });

  it('uses the initiative-cost threshold when limiting cost below zero', () => {
    const harness = createHarness({
      id: 'scene',
      temporalite: temporalityModes.CLASSIC,
      multipleActionMode: 'initiative-cost',
      multipleActionSlots: true,
      initiativeCostThreshold: -10,
      initiativeCostLimitToCurrent: true,
      startRound: 1,
      round: 1,
      activeId: 'alix',
      activeSlotId: 'alix:slot-1',
      participants: [participant('alix', -2), participant('bran', -3)],
      reserve: [],
      statuses: [],
    });

    harness.actions().applyInitiativeCost(12);
    expect(harness.current().participants.find((item) => item.id === 'alix').actionSlots[0]).toMatchObject({
      played: true,
      costPaid: 8,
      costResult: -10,
    });
  });

  it('allows initiative cost above the current slot when the rule is inactive', () => {
    const harness = createHarness({
      id: 'scene',
      temporalite: temporalityModes.CLASSIC,
      multipleActionMode: 'initiative-cost',
      multipleActionSlots: true,
      initiativeCostThreshold: 0,
      initiativeCostLimitToCurrent: false,
      startRound: 1,
      round: 1,
      activeId: 'alix',
      activeSlotId: 'alix:slot-1',
      participants: [participant('alix', 4), participant('bran', 3)],
      reserve: [],
      statuses: [],
    });

    harness.actions().applyInitiativeCost(5);
    expect(harness.current().participants.find((item) => item.id === 'alix').actionSlots[0]).toMatchObject({
      played: true,
      costPaid: 5,
      costResult: -1,
    });
  });

});
