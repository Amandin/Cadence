import { defaultCategoryOrder, defaultEqualityRule, defaultInitiativeOrder } from '../constants.js';
import { clone, newTracker, uid } from '../logic.js';

export function createBlankParticipant() {
  return {
    id: uid('p'),
    name: 'Nouveau personnage',
    kind: 'Allié',
    symbol: '🛡',
    color: 'emerald',
    initiative: 1,
    actionSlots: [{ id: 'slot-1', initiative: 1, order: 0 }],
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
  return { ...participant, initiative: 0, actionSlots: [] };
}

export function createRestorePoint(scene) {
  if (scene.round < 0) {
    return {
      id: uid('restore'),
      round: -1,
      activeId: scene.activeId,
      title: 'Préparation',
      scene: clone(scene),
    };
  }

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
    initiativeOrder: scene.initiativeOrder || defaultInitiativeOrder,
  };
}

export function valeurInitiativeRenseignee(valuesById, participantId) {
  const raw = valuesById?.[participantId];
  if (raw === '' || raw == null) return null;
  const initiative = Number(raw);
  return Number.isFinite(initiative) ? initiative : null;
}

export function initiativesRenseignees(valuesById, participantId) {
  const raw = valuesById?.[participantId];
  const valeurs = Array.isArray(raw) ? raw : [raw];
  const initiatives = valeurs
    .map((valeur) => Number(valeur))
    .filter(Number.isFinite);
  return initiatives.length ? initiatives : null;
}

export function actionSlotsDepuisInitiatives(initiatives = []) {
  return initiatives
    .map((initiative, index) => ({ id: `slot-${index + 1}`, initiative: Number(initiative), order: index }))
    .filter((slot) => Number.isFinite(slot.initiative))
    .sort((a, b) => b.initiative - a.initiative || a.order - b.order)
    .map((slot, index) => ({ id: `slot-${index + 1}`, initiative: slot.initiative, order: index }));
}
