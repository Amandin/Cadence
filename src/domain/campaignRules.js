import {
  defaultCategoryOrder,
  defaultDeclarationMode,
  defaultEqualityRule,
  defaultFlexibleUseInitiative,
  defaultInitiativeBonusEnabled,
  defaultInitiativeOrder,
  defaultInitiativeCostQuickCosts,
  defaultInitiativeCostLimitToCurrent,
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
  manualMultipleActionScopes,
  defaultManualMultipleActionScope,
  phaseActionModes,
  temporalityModes,
} from '../constants.js';
import { normalizeInitiativeCostLimitToCurrent, normalizeInitiativeCostQuickCosts, normalizeInitiativeCostThreshold } from './initiativeCost.js';
import { declarationStages, normalizeInitiativeModeOptions } from './initiativeModes.js';
import { trierParInitiative } from './initiative.js';
import { normalizeInitiativeTextOrder } from './initiativeTextOrder.js';
import { normalizeParticipantTypeName, normalizeParticipantTypes } from './participantTypes.js';

function cleanId(value) {
  return String(value ?? '').trim();
}

const retiredDefaultCategoryOrders = [
  ['PJ', 'Opposant', 'Allié', 'Environnement'],
  ['PJ', 'Compagnon', 'Allié', 'Élite', 'Opposant', 'Environnement'],
];

function isRetiredDefaultCategoryOrder(order) {
  return retiredDefaultCategoryOrders.some((retiredOrder) => (
    order.length === retiredOrder.length
    && order.every((type, index) => type === retiredOrder[index])
  ));
}

function normalizeTiebreakerLabel(value) {
  const label = typeof value === 'string' ? value.trim() : '';
  return !label || label === 'Départage' ? defaultTiebreakerLabel : label;
}

export function normalizeCampaignRules(rules = {}) {
  const initiativeModeOptions = normalizeInitiativeModeOptions(rules);
  const legacyDeclaration = rules.temporalite === temporalityModes.DECLARATION;
  const temporalite = legacyDeclaration
    ? temporalityModes.CLASSIC
    : Object.values(temporalityModes).includes(rules.temporalite)
      ? rules.temporalite
      : defaultTemporalityMode;
  const surpriseAdvanceOn = temporalite === temporalityModes.FLEXIBLE ? 'round' : rules.surpriseAdvanceOn === 'round' ? 'round' : defaultSurpriseAdvanceOn;
  const legacyPrompt = !!rules.promptInitiativeOnNext;
  const explicitMultipleActionMode = Object.values(multipleActionModes).includes(rules.multipleActionMode)
    ? rules.multipleActionMode
    : Object.values(multipleActionModes).includes(rules.multipleActionsMode)
      ? rules.multipleActionsMode
      : '';
  const legacyManualSlots = !explicitMultipleActionMode && rules.multipleActionSlots === true;
  const promptConvertible = legacyPrompt
    && temporalite === temporalityModes.CLASSIC
    && rules.declarationMode !== true
    && !(rules.initiativeTextOrder?.enabled)
    && rules.initiativeOrder !== initiativeOrders.ASC
    && !legacyManualSlots;
  const multipleActionMode = promptConvertible
    ? multipleActionModes.INITIATIVE_COST
    : explicitMultipleActionMode || (legacyManualSlots ? multipleActionModes.MANUAL : defaultMultipleActionMode);
  const categoryOrderSource = Array.isArray(rules.categoryOrder) && rules.categoryOrder.length ? rules.categoryOrder : defaultCategoryOrder;
  const normalizedCategoryOrder = [...new Set(categoryOrderSource.map(normalizeParticipantTypeName).filter(Boolean))];
  // Migrate only the former untouched default; custom orders remain fully user-controlled.
  const categoryOrder = isRetiredDefaultCategoryOrder(normalizedCategoryOrder)
    ? [...defaultCategoryOrder]
    : normalizedCategoryOrder;
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
    categoryOrder,
    participantTypes: normalizeParticipantTypes(rules.participantTypes, categoryOrder),
    tiebreakerVisible: rules.tiebreakerVisible ?? defaultTiebreakerVisible,
    tiebreakerLabel: normalizeTiebreakerLabel(rules.tiebreakerLabel),
    initiativeBonusEnabled: rules.initiativeBonusEnabled ?? defaultInitiativeBonusEnabled,
    initiativeBonusRollDefinitionId: cleanId(rules.initiativeBonusRollDefinitionId),
    surpriseImpact: ['limited', 'inactive'].includes(rules.surpriseImpact) ? rules.surpriseImpact : defaultSurpriseImpact,
    surpriseAdvanceOn,
    surpriseDedicatedRound: !!(rules.surpriseDedicatedRound ?? defaultSurpriseDedicatedRound),
    rounding: ['nearest', 'floor', 'ceil'].includes(rules.rounding) ? rules.rounding : 'nearest',
    initiativeTextOrder: normalizeInitiativeTextOrder(rules.initiativeTextOrder),
    promptInitiativeOnNext: false,
    ...initiativeModeOptions,
    multipleActionMode: multipleActionMode || defaultMultipleActionMode,
    manualMultipleActionScope: Object.values(manualMultipleActionScopes).includes(rules.manualMultipleActionScope) ? rules.manualMultipleActionScope : defaultManualMultipleActionScope,
    multipleActionSlots: multipleActionMode !== multipleActionModes.NONE,
    initiativeCostThreshold: normalizeInitiativeCostThreshold(rules.initiativeCostThreshold ?? defaultInitiativeCostThreshold),
    initiativeCostQuickCosts: normalizeInitiativeCostQuickCosts(rules.initiativeCostQuickCosts ?? defaultInitiativeCostQuickCosts),
    initiativeCostLimitToCurrent: normalizeInitiativeCostLimitToCurrent(rules.initiativeCostLimitToCurrent ?? defaultInitiativeCostLimitToCurrent),
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
  const preparation = Number(scene.round) < 0;
  const nextDeclarationStage = declaration ? (scene.declarationStage === declarationStages.RESOLUTION ? declarationStages.RESOLUTION : declarationStages.DECLARATION) : '';
  return {
    ...scene,
    temporalite: rules.temporalite,
    phase: phases ? Math.max(1, Number(scene.phase) || 1) : 1,
    activeId: preparation || (declaration && nextDeclarationStage === declarationStages.DECLARATION) ? '' : premierParticipantId(scene, rules),
    activeSlotId: preparation || (declaration && nextDeclarationStage === declarationStages.DECLARATION) ? '' : rules.temporalite === temporalityModes.CLASSIC ? (scene.activeSlotId || '') : '',
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
    participantTypes: next.participantTypes,
    tiebreakerVisible: !!next.tiebreakerVisible,
    tiebreakerLabel: next.tiebreakerLabel,
    initiativeBonusEnabled: !!next.initiativeBonusEnabled,
    initiativeBonusRollDefinitionId: next.initiativeBonusRollDefinitionId,
    surpriseImpact: next.surpriseImpact,
    surpriseAdvanceOn: next.surpriseAdvanceOn,
    surpriseDedicatedRound: !!next.surpriseDedicatedRound,
    rounding: next.rounding,
    phaseActionMode: next.phaseActionMode,
    phaseCount: next.phaseCount,
    initiativeValueType: next.initiativeValueType,
    initiativeLabels: next.initiativeLabels,
    multipleActionMode: next.multipleActionMode,
    manualMultipleActionScope: next.manualMultipleActionScope,
    multipleActionSlots: next.multipleActionMode !== multipleActionModes.NONE,
    initiativeCostThreshold: next.initiativeCostThreshold,
    initiativeCostQuickCosts: next.initiativeCostQuickCosts,
    initiativeCostLimitToCurrent: next.initiativeCostLimitToCurrent,
    activationAdvancePolicy: next.activationAdvancePolicy,
    declarationRequireText: next.declarationRequireText,
    initiativeTextOrder: next.initiativeTextOrder,
    promptInitiativeOnNext: false,
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
