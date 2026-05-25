import {
  defaultCategoryOrder,
  defaultDeclarationMode,
  defaultEqualityRule,
  defaultInitiativeOrder,
  defaultPhaseActivateOncePerRound,
  defaultPhaseDecrement,
  defaultPhaseRerollEachRound,
  defaultStartRound,
  defaultTemporalityMode,
  initiativeOrders,
  phaseActionModes,
  temporalityModes,
} from '../constants.js';
import { declarationStages, normalizeInitiativeModeOptions } from './initiativeModes.js';
import { trierParInitiative } from './initiative.js';
import { normalizeInitiativeTextOrder } from './initiativeTextOrder.js';

export function normalizeCampaignRules(rules = {}) {
  const initiativeModeOptions = normalizeInitiativeModeOptions(rules);
  const legacyDeclaration = rules.temporalite === temporalityModes.DECLARATION;
  const temporalite = legacyDeclaration
    ? temporalityModes.CLASSIC
    : Object.values(temporalityModes).includes(rules.temporalite)
      ? rules.temporalite
      : defaultTemporalityMode;
  return {
    temporalite,
    declarationMode: initiativeModeOptions.declarationMode ?? (legacyDeclaration ? true : defaultDeclarationMode),
    startRound: [0, 1].includes(Number(rules.startRound)) ? Number(rules.startRound) : defaultStartRound,
    phaseDecrement: Math.max(1, Number(rules.phaseDecrement) || defaultPhaseDecrement),
    phaseRerollEachRound: rules.phaseRerollEachRound ?? defaultPhaseRerollEachRound,
    phaseActivateOncePerRound: rules.phaseActivateOncePerRound ?? defaultPhaseActivateOncePerRound,
    equalityRule: rules.equalityRule || defaultEqualityRule,
    initiativeOrder: Object.values(initiativeOrders).includes(rules.initiativeOrder) ? rules.initiativeOrder : defaultInitiativeOrder,
    categoryOrder: Array.isArray(rules.categoryOrder) && rules.categoryOrder.length ? rules.categoryOrder : defaultCategoryOrder,
    rounding: ['nearest', 'floor', 'ceil'].includes(rules.rounding) ? rules.rounding : 'nearest',
    initiativeTextOrder: normalizeInitiativeTextOrder(rules.initiativeTextOrder),
    promptInitiativeOnNext: !!rules.promptInitiativeOnNext,
    ...initiativeModeOptions,
    temporalite,
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
  const flexible = rules.temporalite === temporalityModes.FLEXIBLE;
  const phases = rules.temporalite === temporalityModes.PHASES;
  const declaration = !!rules.declarationMode;
  const nextDeclarationStage = declaration ? (scene.declarationStage === declarationStages.RESOLUTION ? declarationStages.RESOLUTION : declarationStages.DECLARATION) : '';
  return {
    ...scene,
    temporalite: rules.temporalite,
    phase: phases ? Math.max(1, Number(scene.phase) || 1) : 1,
    activeId: declaration && nextDeclarationStage === declarationStages.DECLARATION ? '' : premierParticipantId(scene, rules),
    activeSlotId: declaration && nextDeclarationStage === declarationStages.DECLARATION ? '' : rules.temporalite === temporalityModes.CLASSIC ? (scene.activeSlotId || '') : '',
    jouesSouples: flexible ? (scene.jouesSouples || []) : [],
    historiqueSouple: flexible ? (scene.historiqueSouple || []) : [],
    declarationStage: nextDeclarationStage,
    declarations: declaration && scene.declarations && typeof scene.declarations === 'object' && !Array.isArray(scene.declarations) ? scene.declarations : {},
    resolutionOrder: declaration && Array.isArray(scene.resolutionOrder) ? scene.resolutionOrder : [],
    declarationPlayedIds: declaration && Array.isArray(scene.declarationPlayedIds) ? scene.declarationPlayedIds : [],
    activatedThisRound: Array.isArray(scene.activatedThisRound) ? scene.activatedThisRound : [],
  };
}

function phaseActionsParDefaut(participant) {
  return Array.isArray(participant.phaseActions) ? participant.phaseActions : ['1'];
}

function appliquerModePhasesParticipants(scene, rules) {
  if (rules.phaseActionMode !== phaseActionModes.CHECKED) return scene;
  return {
    ...scene,
    participants: (scene.participants || []).map((participant) => ({ ...participant, phaseActions: phaseActionsParDefaut(participant) })),
    reserve: (scene.reserve || []).map((participant) => ({ ...participant, phaseActions: phaseActionsParDefaut(participant) })),
  };
}

export function applyInitiativeRules(scene, patch = {}) {
  const next = normalizeCampaignRules({ ...initiativeRulesFromScene(scene), ...patch });
  const sceneWithTemporality = appliquerModePhasesParticipants(applyTemporality(scene, next), next);

  return {
    ...sceneWithTemporality,
    temporalite: next.temporalite,
    declarationMode: !!next.declarationMode,
    startRound: next.startRound,
    phaseDecrement: next.phaseDecrement,
    phaseRerollEachRound: !!next.phaseRerollEachRound,
    phaseActivateOncePerRound: !!next.phaseActivateOncePerRound,
    equalityRule: next.equalityRule,
    initiativeOrder: next.initiativeOrder,
    categoryOrder: next.categoryOrder,
    rounding: next.rounding,
    phaseActionMode: next.phaseActionMode,
    phaseCount: next.phaseCount,
    initiativeValueType: next.initiativeValueType,
    initiativeLabels: next.initiativeLabels,
    multipleActionSlots: next.multipleActionSlots,
    activationAdvancePolicy: next.activationAdvancePolicy,
    declarationRequireText: next.declarationRequireText,
    initiativeTextOrder: next.initiativeTextOrder,
    promptInitiativeOnNext: next.promptInitiativeOnNext,
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
