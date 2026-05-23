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

export function placerEnReserve(participant) {
  return { ...participant, initiative: 0, actionSlots: [] };
}

export function createRestorePoint(scene) {
  if (scene.round < 0) return { id: uid('restore'), round: -1, activeId: scene.activeId, title: 'Préparation', scene: clone(scene) };
  return { id: uid('restore'), round: scene.round, activeId: scene.activeId, title: `Début R${scene.round}`, scene: clone(scene) };
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
    initiativeTextOrder: scene.initiativeTextOrder,
  };
}

export function valeurInitiativeRenseignee(valuesById, participantId) {
  const raw = valuesById?.[participantId];
  if (raw === '' || raw == null) return null;
  return raw;
}

export function initiativesRenseignees(valuesById, participantId) {
  const raw = valuesById?.[participantId];
  const valeurs = Array.isArray(raw) ? raw : [raw];
  const initiatives = valeurs.map((valeur) => String(valeur ?? '').trim()).filter(Boolean);
  return initiatives.length ? initiatives : null;
}

export function actionSlotsDepuisInitiatives(initiatives = []) {
  return initiatives
    .map((initiative, index) => ({ id: `slot-${index + 1}`, initiative, order: index }))
    .filter((slot) => String(slot.initiative ?? '').trim() !== '')
    .map((slot, index) => ({ id: `slot-${index + 1}`, initiative: slot.initiative, order: index }));
}
