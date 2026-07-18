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

  it('triggers flexible activation effects collectively when the round begins', () => {
    const harness = createHarness({
      id: 'scene',
      temporalite: temporalityModes.FLEXIBLE,
      startRound: 1,
      round: -1,
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

    harness.actions().nextTurn(1);

    expect(harness.current()).toMatchObject({
      round: 1,
      activeId: '',
      participants: [{ id: 'runner', statuses: [{ id: 'haste', remaining: 1 }], trackers: [{ id: 'tempo', current: 1 }] }],
    });
  });

  it('starts a dedicated surprise round only when preparation surprise is enabled', () => {
    const harness = createHarness({
      id: 'scene',
      temporalite: temporalityModes.CLASSIC,
      preparationSurprise: true,
      surpriseDedicatedRound: true,
      startRound: 1,
      round: -1,
      activeId: '',
      activeSlotId: '',
      participants: [participant('fast', 12)],
      reserve: [],
      statuses: [],
    });

    harness.actions().startSceneWithInitiatives({ fast: ['12'] }, ['fast']);
    expect(harness.current()).toMatchObject({ round: 0, surpriseRoundActive: true, activeId: 'fast' });

    harness.actions().nextTurn(1);
    expect(harness.current()).toMatchObject({ round: 1, surpriseRoundActive: false, activeId: 'fast' });
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

  it('replaces a tiebreaker explicitly sent from the initiative window', () => {
    const harness = createHarness({
      id: 'scene',
      temporalite: temporalityModes.CLASSIC,
      startRound: 1,
      round: -1,
      participants: [{ ...participant('fast', 12), departage: 3 }],
      reserve: [],
      statuses: [],
    });

    harness.actions().applyInitiativeRolls({ fast: ['14'] }, { fast: '' });

    expect(harness.current().participants[0]).toMatchObject({ id: 'fast', initiative: '14', departage: '' });
  });

  it('does not activate a participant when initiatives are edited in preparation', () => {
    const harness = createHarness({
      id: 'scene',
      temporalite: temporalityModes.CLASSIC,
      startRound: 1,
      round: -1,
      activeId: 'fast',
      activeSlotId: 'fast:slot-1',
      participants: [participant('fast', 12), participant('slow', 5)],
      reserve: [],
      statuses: [],
    });

    harness.actions().applyInitiativeRolls({ fast: ['14'], slow: ['7'] });

    expect(harness.current()).toMatchObject({ round: -1, activeId: '', activeSlotId: '' });
    expect(harness.current().participants[0]).toMatchObject({ id: 'fast', initiative: '14' });
  });

  it('applies and stores an initiative bonus entered from the initiative window', () => {
    const harness = createHarness({
      id: 'scene',
      temporalite: temporalityModes.CLASSIC,
      startRound: 1,
      round: -1,
      participants: [{ ...participant('fast', 12), initiativeBonus: 0 }],
      reserve: [],
      statuses: [],
    });

    harness.actions().startSceneWithInitiatives({ fast: ['14'] }, [], {}, { fast: 2 });

    expect(harness.current().participants[0]).toMatchObject({ id: 'fast', initiative: '14', initiativeBonus: 2 });
  });

  it('ignores initiative bonus updates when the rule is disabled', () => {
    const harness = createHarness({
      id: 'scene',
      temporalite: temporalityModes.CLASSIC,
      initiativeBonusEnabled: false,
      startRound: 1,
      round: -1,
      participants: [{ ...participant('fast', 12), initiativeBonus: 4 }],
      reserve: [],
      statuses: [],
    });

    harness.actions().startSceneWithInitiatives({ fast: ['14'] }, [], {}, { fast: 2 });

    expect(harness.current().participants[0]).toMatchObject({ id: 'fast', initiative: '14', initiativeBonus: 4 });
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

  it('advances automatic initiative phases after the last participant of phase one', () => {
    const harness = createHarness({
      id: 'scene',
      temporalite: temporalityModes.PHASES,
      phaseActionMode: 'automatic',
      phaseDecrement: 10,
      startRound: 1,
      round: 1,
      phase: 1,
      activeId: 'fast',
      activeSlotId: '',
      participants: [participant('fast', 23), participant('middle', 14), participant('slow', 8)],
      reserve: [],
      statuses: [],
    });

    harness.actions().nextTurn(1);
    expect(harness.current()).toMatchObject({ round: 1, phase: 1, activeId: 'middle' });

    harness.actions().nextTurn(1);
    expect(harness.current()).toMatchObject({ round: 1, phase: 1, activeId: 'slow' });

    harness.actions().nextTurn(1);
    expect(harness.current()).toMatchObject({ round: 1, phase: 2, activeId: 'fast' });
  });

  it('does not get stuck when an automatic phase has participants but no valid active id', () => {
    const harness = createHarness({
      id: 'scene',
      temporalite: temporalityModes.PHASES,
      phaseActionMode: 'automatic',
      phaseDecrement: 10,
      startRound: 1,
      round: 1,
      phase: 1,
      activeId: '',
      activeSlotId: '',
      participants: [participant('fast', 23), participant('middle', 14), participant('slow', 8)],
      reserve: [],
      statuses: [],
    });

    harness.actions().nextTurn(1);

    expect(harness.current()).toMatchObject({ round: 1, phase: 1, activeId: 'middle' });
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

  it('keeps preparation without active participant while editing the roster', () => {
    const harness = createHarness({
      id: 'scene',
      temporalite: temporalityModes.CLASSIC,
      startRound: 1,
      round: -1,
      activeId: 'legacy',
      activeSlotId: 'legacy:slot-1',
      participants: [participant('legacy', 10)],
      reserve: [],
      statuses: [],
    });

    harness.actions().addParticipant(participant('new', 12));
    expect(harness.current()).toMatchObject({ round: -1, activeId: '', activeSlotId: '' });

    harness.actions().setActiveParticipant('new');
    expect(harness.current()).toMatchObject({ round: -1, activeId: '', activeSlotId: '' });

    harness.actions().updateParticipant('new', (current) => ({ ...current, initiative: 16 }));
    expect(harness.current()).toMatchObject({ round: -1, activeId: '', activeSlotId: '' });
  });

});
