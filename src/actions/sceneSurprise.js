import { createSurprisedStatus } from '../domain/statuses.js';

export function roundDepart(scene) {
  return scene?.surpriseRoundActive ? 0 : 1;
}

export function appliquerSurpriseInitiale(scene, surprisedIds = []) {
  const ids = new Set(surprisedIds);
  if (!scene.preparationSurprise || ids.size === 0) return { ...scene, surpriseRoundActive: false };
  return {
    ...scene,
    surpriseRoundActive: !!scene.surpriseDedicatedRound,
    participants: (scene.participants || []).map((participant) => ids.has(participant.id)
      ? { ...participant, statuses: [...(participant.statuses || []), createSurprisedStatus(scene.surpriseImpact, { advanceOn: scene.surpriseAdvanceOn, skipNextAdvance: true })] }
      : participant),
  };
}
