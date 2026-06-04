import {
  defaultCategoryOrder,
  defaultDeclarationMode,
  defaultEqualityRule,
  defaultFlexibleUseInitiative,
  defaultInitiativeOrder,
  defaultInitiativeCostQuickCosts,
  defaultInitiativeCostThreshold,
  defaultMultipleActionMode,
  defaultPhaseActivateOncePerRound,
  defaultPhaseDecrement,
  defaultPhaseRerollEachRound,
  defaultStartRound,
  defaultSurpriseAdvanceOn,
  defaultSurpriseDedicatedRound,
  defaultSurpriseImpact,
  defaultTiebreakerLabel,
  defaultTiebreakerVisible,
  defaultTemporalityMode,
  initiativeOrders,
  multipleActionModes,
  phaseActionModes,
  temporalityModes,
} from '../constants.js';
import { multipleActionModeFromRules, normalizeInitiativeCostQuickCosts, normalizeInitiativeCostThreshold } from './initiativeCost.js';
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
  const surpriseAdvanceOn = temporalite === temporalityModes.FLEXIBLE ? 'round' : rules.surpriseAdvanceOn === 'round' ? 'round' : defaultSurpriseAdvanceOn;
  const multipleActionMode = multipleActionModeFromRules({
    ...rules,
    multipleActionMode: Object.values(multipleActionModes).includes(rules.multipleActionMode) ? rules.multipleActionMode : undefined,
  });
  return {
    temporalite,
    declarationMode: initiativeModeOptions.declarationMode ?? (legacyDeclaration ? true : defaultDeclarationMode),
    startRound: defaultStartRound,
    phaseDecrement: Math.max(1, Number(rules.phaseDecrement) || defaultPhaseDecrement),
    phaseRerollEachRound: rules.phaseRerollEachRound ?? defaultPhaseRerollEachRound,
    phaseActivateOncePerRound: rules.phaseActivateOncePerRound ?? defaultPhaseActivateOncePerRound,
    equalityRule: rules.equalityRule || defaultEqualityRule,
    flexibleUseInitiative: rules.flexibleUseInitiative ?? defaultFlexibleUseInitiative,
    initiativeOrder: Object.values(initiativeOrders).includes(rules.initiativeOrder) ? rules.initiativeOrder : defaultInitiativeOrder,
    categoryOrder: Array.isArray(rules.categoryOrder) && rules.categoryOrder.length ? rules.categoryOrder : defaultCategoryOrder,
    tiebreakerVisible: rules.tiebreakerVisible ?? defaultTiebreakerVisible,
    tiebreakerLabel: typeof rules.tiebreakerLabel === 'string' && rules.tiebreakerLabel.trim() ? rules.tiebreakerLabel.trim() : defaultTiebreakerLabel,
    surpriseImpact: ['limited', 'inactive'].includes(rules.surpriseImpact) ? rules.surpriseImpact : defaultSurpriseImpact,
    surpriseAdvanceOn,
    surpriseDedicatedRound: !!(rules.surpriseDedicatedRound ?? defaultSurpriseDedicatedRound),
    rounding: ['nearest', 'floor', 'ceil'].includes(rules.rounding) ? rules.rounding : 'nearest',
    initiativeTextOrder: normalizeInitiativeTextOrder(rules.initiativeTextOrder),
    promptInitiativeOnNext: !!rules.promptInitiativeOnNext,
    ...initiativeModeOptions,
    multipleActionMode: multipleActionMode || defaultMultipleActionMode,
    multipleActionSlots: multipleActionMode !== multipleActionModes.NONE,
    initiativeCostThreshold: normalizeInitiativeCostThreshold(rules.initiativeCostThreshold ?? defaultInitiativeCostThreshold),
    initiativeCostQuickCosts: normalizeInitiativeCostQuickCosts(rules.initiativeCostQuickCosts ?? defaultInitiativeCostQuickCosts),
    phaseActionMode: temporalite === temporalityModes.FLEXIBLE ? '' : initiativeModeOptions.phaseActionMode,
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
  if (rules.temporalite !== temporalityModes.PHASES || rules.phaseActionMode !== phaseActionModes.CHECKED) return scene;
  return {
    ...scene,
    participants: (scene.participants || []).map((participant) => ({ ...participant, phaseActions: phaseActionsParDefaut(participant) })),
    reserve: (scene.reserve || []).map((participant) => ({ ...participant, phaseActions: phaseActionsParDefaut(participant) })),
  };
}

function appliquerRegleSurpriseParticipant(participant, rules) {
  return {
    ...participant,
    statuses: (participant.statuses || []).map((status) => status.name !== 'Surpris' ? status : {
      ...status,
      inactive: rules.surpriseImpact === 'inactive',
      limited: rules.surpriseImpact !== 'inactive',
      advanceOn: rules.surpriseAdvanceOn,
    }),
  };
}

function appliquerRegleSurpriseParticipants(scene, rules) {
  return {
    ...scene,
    participants: (scene.participants || []).map((participant) => appliquerRegleSurpriseParticipant(participant, rules)),
    reserve: (scene.reserve || []).map((participant) => appliquerRegleSurpriseParticipant(participant, rules)),
  };
}

export function applyInitiativeRules(scene, patch = {}) {
  const next = normalizeCampaignRules({ ...initiativeRulesFromScene(scene), ...patch });
  const sceneWithTemporality = appliquerRegleSurpriseParticipants(appliquerModePhasesParticipants(applyTemporality(scene, next), next), next);
  const sceneWithStartRound = Number(sceneWithTemporality.round) === 0 && next.startRound === 1
    ? { ...sceneWithTemporality, round: 1 }
    : sceneWithTemporality;

  return {
    ...sceneWithStartRound,
    temporalite: next.temporalite,
    declarationMode: !!next.declarationMode,
    startRound: next.startRound,
    phaseDecrement: next.phaseDecrement,
    phaseRerollEachRound: !!next.phaseRerollEachRound,
    phaseActivateOncePerRound: !!next.phaseActivateOncePerRound,
    equalityRule: next.equalityRule,
    flexibleUseInitiative: !!next.flexibleUseInitiative,
    initiativeOrder: next.initiativeOrder,
    categoryOrder: next.categoryOrder,
    tiebreakerVisible: !!next.tiebreakerVisible,
    tiebreakerLabel: next.tiebreakerLabel,
    surpriseImpact: next.surpriseImpact,
    surpriseAdvanceOn: next.surpriseAdvanceOn,
    surpriseDedicatedRound: !!next.surpriseDedicatedRound,
    rounding: next.rounding,
    phaseActionMode: next.phaseActionMode,
    phaseCount: next.phaseCount,
    initiativeValueType: next.initiativeValueType,
    initiativeLabels: next.initiativeLabels,
    multipleActionMode: next.multipleActionMode,
    multipleActionSlots: next.multipleActionMode !== multipleActionModes.NONE,
    initiativeCostThreshold: next.initiativeCostThreshold,
    initiativeCostQuickCosts: next.initiativeCostQuickCosts,
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
