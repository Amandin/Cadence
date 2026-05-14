import { defaultCategoryOrder, defaultEqualityRule } from '../constants.js';
import { clone, newTracker, uid } from '../logic.js';

export function createBlankParticipant() {
  return {
    id: uid('p'),
    name: 'Nouveau personnage',
    kind: 'Allié',
    symbol: '🛡',
    color: 'emerald',
    initiative: 1,
    departage: '',
    description: '',
    stats: [],
    statuses: [],
    trackers: [newTracker('bar')],
  };
}

// Un participant en réserve est hors initiative : on neutralise donc toujours
// son initiative pour éviter qu’un ancien score influence l’affichage ou le tri.
export function placerEnReserve(participant) {
  return { ...participant, initiative: 0 };
}

export function createRestorePoint(scene) {
  return {
    id: uid('restore'),
    round: scene.round,
    activeId: scene.activeId,
    title: `Début R${scene.round}`,
    scene: clone(scene),
  };
}

export function addRestorePoint(points, sceneId, nextScene) {
  const current = points[sceneId] || [];
  if (current.some((point) => point.round === nextScene.round)) return points;
  return { ...points, [sceneId]: [...current, createRestorePoint(nextScene)].slice(-50) };
}

export function optionsTri(scene) {
  return {
    categoryOrder: scene.categoryOrder || defaultCategoryOrder,
    equalityRule: scene.equalityRule || defaultEqualityRule,
  };
}

export function valeurInitiativeRenseignee(valuesById, participantId) {
  const raw = valuesById?.[participantId];
  if (raw === '' || raw == null) return null;
  const initiative = Number(raw);
  return Number.isFinite(initiative) ? initiative : null;
}
