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
