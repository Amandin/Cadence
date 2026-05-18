import {
  defaultCategoryOrder,
  defaultEqualityRule,
  defaultPhaseDecrement,
  defaultPhaseRerollEachRound,
  defaultStartRound,
  defaultTemporalityMode,
  temporalityModes,
} from '../constants.js';
import { trierParInitiative } from './initiative.js';

export function normalizeCampaignRules(rules = {}) {
  return {
    temporalite: rules.temporalite || defaultTemporalityMode,
    startRound: [0, 1].includes(Number(rules.startRound)) ? Number(rules.startRound) : defaultStartRound,
    phaseDecrement: Math.max(1, Number(rules.phaseDecrement) || defaultPhaseDecrement),
    phaseRerollEachRound: rules.phaseRerollEachRound ?? defaultPhaseRerollEachRound,
    equalityRule: rules.equalityRule || defaultEqualityRule,
    categoryOrder: Array.isArray(rules.categoryOrder) && rules.categoryOrder.length ? rules.categoryOrder : defaultCategoryOrder,
  };
}

export function initiativeRulesFromScene(scene = {}) {
  return normalizeCampaignRules(scene);
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
  const next = normalizeCampaignRules({ ...initiativeRulesFromScene(scene), ...patch });
  const sceneWithTemporality = applyTemporality(scene, next);

  return {
    ...sceneWithTemporality,
    temporalite: next.temporalite,
    startRound: next.startRound,
    phaseDecrement: next.phaseDecrement,
    phaseRerollEachRound: !!next.phaseRerollEachRound,
    equalityRule: next.equalityRule,
    categoryOrder: next.categoryOrder,
  };
}

export function campaignRulesFromScenes(scenes = []) {
  return initiativeRulesFromScene(scenes[0] || {});
}

export function campaignRulesFromPayload(data = {}) {
  return normalizeCampaignRules(data.initiativeRules || data.rules || campaignRulesFromScenes(data.scenes || []));
}

export function unifyCampaignScenes(scenes = [], rules = campaignRulesFromScenes(scenes)) {
  const campaignRules = normalizeCampaignRules(rules);
  return scenes.map((scene) => applyInitiativeRules(scene, campaignRules));
}
