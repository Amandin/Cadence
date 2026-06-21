import { defaultCategoryOrder, defaultEqualityRule, defaultInitiativeOrder } from '../constants.js';
import { clone, newTracker, uid } from '../logic.js';
import { rememberBaseInitiative, rulesAllowMultipleSlots } from '../domain/initiativeCost.js';
import { t } from '../i18n/index.js';
import { defaultReserveSymbol } from '../uiAssets.js';

export function createBlankParticipant() {
  return {
    id: uid('p'),
    name: t('templates.fallback.character'),
    kind: 'Allié',
    symbol: defaultReserveSymbol,
    color: 'emerald',
    initiative: 1,
    initiativeBonus: 0,
    actionSlots: [{ id: 'slot-1', initiative: 1, order: 0 }],
    departage: '',
    description: '',
    stats: [],
    statuses: [],
    trackers: [],
  };
}

export function placerEnReserve(participant) {
  const memo = rememberBaseInitiative(participant);
  return { ...participant, ...memo, initiative: 0, actionSlots: [] };
}

export function clearActiveInPreparation(scene) {
  if (!scene || !(Number(scene.round) < 0)) return scene;
  return { ...scene, activeId: '', activeSlotId: '' };
}

export function createRestorePoint(scene) {
  if (scene.round < 0) return createPreInitiativeRestorePoint(scene);
  return { id: uid('restore'), round: scene.round, activeId: scene.activeId, title: t('restore.beginRound', { round: scene.round }), scene: clone(scene) };
}

export function createPreInitiativeRestorePoint(scene) {
  const scenePreparation = clearActiveInPreparation(clone(scene));
  return { id: uid('restore'), kind: 'pre-initiative', round: -1, activeId: '', title: t('restore.beforeInitiative'), scene: scenePreparation };
}

function isPreInitiativePoint(point) {
  return point?.kind === 'pre-initiative' || point?.round < 0;
}

export function pruneRestorePoints(points = []) {
  const preInitiative = points.filter(isPreInitiativePoint).slice(-1);
  const byRound = new Map();
  for (const point of points) {
    if (isPreInitiativePoint(point)) continue;
    const round = Number(point.round);
    if (!Number.isFinite(round) || round < 0) continue;
    byRound.set(round, point);
  }
  const rounds = [...byRound.keys()].sort((a, b) => a - b);
  const latestRound = rounds.at(-1);
  if (!latestRound) return [...preInitiative, ...rounds.map((round) => byRound.get(round))];

  const keptRounds = rounds.filter((round) => {
    const age = latestRound - round + 1;
    const step = 2 ** Math.max(0, Math.floor((age - 1) / 4));
    return age <= 4 || (latestRound - round) % step === 0;
  });
  return [...preInitiative, ...keptRounds.map((round) => byRound.get(round))];
}

export function addPreInitiativeRestorePoint(points, sceneId, sceneBeforeInitiative) {
  const current = points[sceneId] || [];
  if (current.some(isPreInitiativePoint)) return points;
  return { ...points, [sceneId]: pruneRestorePoints([...current, createPreInitiativeRestorePoint(sceneBeforeInitiative)]) };
}

export function addRestorePoint(points, sceneId, nextScene) {
  const current = points[sceneId] || [];
  if (current.some((point) => point.round === nextScene.round)) return points;
  return { ...points, [sceneId]: pruneRestorePoints([...current, createRestorePoint(nextScene)]) };
}

export function optionsTri(scene) {
  return {
    categoryOrder: scene.categoryOrder || defaultCategoryOrder,
    equalityRule: scene.equalityRule || defaultEqualityRule,
    initiativeOrder: scene.initiativeOrder || defaultInitiativeOrder,
    initiativeTextOrder: scene.initiativeTextOrder,
    initiativeEnabled: scene.temporalite !== 'souple' || scene.flexibleUseInitiative !== false,
    tiebreakerVisible: scene.tiebreakerVisible !== false,
    multipleActionSlots: rulesAllowMultipleSlots(scene),
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

export function actionSlotsDepuisInitiatives(initiatives = [], multipleActionSlots = true) {
  return (multipleActionSlots ? initiatives : initiatives.slice(0, 1))
    .map((initiative, index) => ({ id: `slot-${index + 1}`, initiative, order: index }))
    .filter((slot) => String(slot.initiative ?? '').trim() !== '')
    .map((slot, index) => ({ id: `slot-${index + 1}`, initiative: slot.initiative, order: index }));
}
