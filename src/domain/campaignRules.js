import {
  defaultCategoryOrder,
  defaultEqualityRule,
  defaultPhaseDecrement,
  defaultPhaseRerollEachRound,
  defaultTemporalityMode,
  temporalityModes,
} from '../constants.js';
import { trierParInitiative } from './initiative.js';

export function initiativeRulesFromScene(scene = {}) {
  return {
    temporalite: scene.temporalite || defaultTemporalityMode,
    phaseDecrement: Math.max(1, Number(scene.phaseDecrement) || defaultPhaseDecrement),
    phaseRerollEachRound: scene.phaseRerollEachRound ?? defaultPhaseRerollEachRound,
    equalityRule: scene.equalityRule || defaultEqualityRule,
    categoryOrder: Array.isArray(scene.categoryOrder) && scene.categoryOrder.length ? scene.categoryOrder : defaultCategoryOrder,
  };
}

function premierParticipantId(scene, rules) {
  if (rules?.temporalite === temporalityModes.FLEXIBLE) return '';
  return scene?.activeId || trierParInitiative(scene?.participants || [], rules)[0]?.id || '';
}

function applyTemporality(scene, rules) {
  return {
    ...scene,
    temporalite: rules.temporalite,
    phase: rules.temporalite === temporalityModes.PHASES ? Math.max(1, Number(scene.phase) || 1) : 1,
    activeId: premierParticipantId(scene, rules),
    jouesSouples: rules.temporalite === temporalityModes.FLEXIBLE ? (scene.jouesSouples || []) : [],
    historiqueSouple: rules.temporalite === temporalityModes.FLEXIBLE ? (scene.historiqueSouple || []) : [],
  };
}

export function applyInitiativeRules(scene, patch = {}) {
  const next = { ...initiativeRulesFromScene(scene), ...patch };
  const sceneWithTemporality = applyTemporality(scene, next);

  return {
    ...sceneWithTemporality,
    temporalite: next.temporalite,
    phaseDecrement: Math.max(1, Number(next.phaseDecrement) || defaultPhaseDecrement),
    phaseRerollEachRound: !!next.phaseRerollEachRound,
    equalityRule: next.equalityRule || defaultEqualityRule,
    categoryOrder: Array.isArray(next.categoryOrder) && next.categoryOrder.length ? next.categoryOrder : defaultCategoryOrder,
  };
}

export function campaignRulesFromScenes(scenes = []) {
  return initiativeRulesFromScene(scenes[0] || {});
}

export function unifyCampaignScenes(scenes = [], rules = campaignRulesFromScenes(scenes)) {
  return scenes.map((scene) => applyInitiativeRules(scene, rules));
}
