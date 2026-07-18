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
