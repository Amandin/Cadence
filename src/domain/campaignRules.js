import {
  defaultCategoryOrder,
  defaultEqualityRule,
  defaultInitiativeOrder,
  defaultPhaseActivateOncePerRound,
  defaultPhaseDecrement,
  defaultPhaseRerollEachRound,
  defaultStartRound,
  defaultTemporalityMode,
  initiativeOrders,
  temporalityModes,
} from '../constants.js';
import { declarationStages, normalizeInitiativeModeOptions } from './initiativeModes.js';
import { trierParInitiative } from './initiative.js';

export function normalizeCampaignRules(rules = {}) {
  const initiativeModeOptions = normalizeInitiativeModeOptions(rules);
  return {
    temporalite: Object.values(temporalityModes).includes(rules.temporalite) ? rules.temporalite : defaultTemporalityMode,
    startRound: [0, 1].includes(Number(rules.startRound)) ? Number(rules.startRound) : defaultStartRound,
    phaseDecrement: Math.max(1, Number(rules.phaseDecrement) || defaultPhaseDecrement),
    phaseRerollEachRound: rules.phaseRerollEachRound ?? defaultPhaseRerollEachRound,
    phaseActivateOncePerRound: rules.phaseActivateOncePerRound ?? defaultPhaseActivateOncePerRound,
    equalityRule: rules.equalityRule || defaultEqualityRule,
    initiativeOrder: Object.values(initiativeOrders).includes(rules.initiativeOrder) ? rules.initiativeOrder : defaultInitiativeOrder,
    categoryOrder: Array.isArray(rules.categoryOrder) && rules.categoryOrder.length ? rules.categoryOrder : defaultCategoryOrder,
    rounding: ['nearest', 'floor', 'ceil'].includes(rules.rounding) ? rules.rounding : 'nearest',
    ...initiativeModeOptions,
  };
}

export function initiativeRulesFromScene(scene = {}) {
  return normalizeCampaignRules(scene);
}

function premierParticipantId(scene, rules) {
  if (rules?.temporalite === temporalityModes.FLEXIBLE) return '';
  if (rules?.temporalite === temporalityModes.DECLARATION) return scene?.activeId || '';
  return scene?.activeId || trierParInitiative(scene?.participants || [], rules)[0]?.id || '';
}

function applyTemporality(scene, rules) {
  const flexible = rules.temporalite === temporalityModes.FLEXIBLE;
  const phases = rules.temporalite === temporalityModes.PHASES;
  const declaration = rules.temporalite === temporalityModes.DECLARATION;
  return {
    ...scene,
    temporalite: rules.temporalite,
    phase: phases ? Math.max(1, Number(scene.phase) || 1) : 1,
    activeId: premierParticipantId(scene, rules),
    activeSlotId: rules.temporalite === temporalityModes.CLASSIC || (declaration && scene.declarationStage === declarationStages.RESOLUTION) ? (scene.activeSlotId || '') : '',
    jouesSouples: flexible ? (scene.jouesSouples || []) : [],
    historiqueSouple: flexible ? (scene.historiqueSouple || []) : [],
    declarationStage: declaration ? (scene.declarationStage === declarationStages.RESOLUTION ? declarationStages.RESOLUTION : declarationStages.DECLARATION) : '',
    declarations: declaration && scene.declarations && typeof scene.declarations === 'object' && !Array.isArray(scene.declarations) ? scene.declarations : {},
    resolutionOrder: declaration && Array.isArray(scene.resolutionOrder) ? scene.resolutionOrder : [],
    activatedThisRound: Array.isArray(scene.activatedThisRound) ? scene.activatedThisRound : [],
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
    phaseActivateOncePerRound: !!next.phaseActivateOncePerRound,
    equalityRule: next.equalityRule,
    initiativeOrder: next.initiativeOrder,
    categoryOrder: next.categoryOrder,
    rounding: next.rounding,
    phaseActionMode: next.phaseActionMode,
    initiativeValueType: next.initiativeValueType,
    initiativeLabels: next.initiativeLabels,
    multipleActionSlots: next.multipleActionSlots,
    activationAdvancePolicy: next.activationAdvancePolicy,
    declarationRequireText: next.declarationRequireText,
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
