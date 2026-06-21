import {
  APP_VERSION,
  STORAGE_KEY,
  defaultCategoryOrder,
  defaultDeclarationMode,
  defaultEqualityRule,
  defaultFlexibleUseInitiative,
  defaultInitiativeOrder,
  defaultInitiativeCostLimitToCurrent,
  defaultInitiativeCostQuickCosts,
  defaultInitiativeCostThreshold,
  defaultMultipleActionMode,
  defaultPhaseActionMode,
  defaultPhaseCount,
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
  legacyParticipantKinds,
  multipleActionModes,
  phaseActionModes,
  temporalityModes,
} from './constants.js';
import { campaignRulesFromPayload, normalizeCampaignRules, unifyCampaignScenes } from './domain/campaignRules.js';
import { normalizeGlobalTracker } from './domain/globalTracker.js';
import { normaliserCreneauxAction } from './domain/initiative.js';
import { baseInitiativeSlots, multipleActionModeFromRules, normalizeInitiativeCostLimitToCurrent, normalizeInitiativeCostQuickCosts, normalizeInitiativeCostThreshold } from './domain/initiativeCost.js';
import { isPointsTracker, normalizeBoxTracker, normalizeThresholds, normalizeTrackerThresholds, makeDefaultCampaign, uid } from './logic.js';
import { normalizeRulePresetSnapshot } from './rulePresets.js';
import { isTemplateStoreLike, loadTemplateStore, normalizeTemplateStore } from './templates.js';
import { readLocalCampaignPayload, writeLocalCampaignPayload } from './localCampaignStorage.js';
import { t } from './i18n/index.js';
import { defaultMechanicalSymbol } from './uiAssets.js';

export const CADENCE_CAMPAIGN_FORMAT = 'cadence-campaign';
export const CADENCE_CAMPAIGN_SCHEMA_VERSION = 2;
export const DEFAULT_CAMPAIGN_NAME = 'Campagne Cadence';

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function stringOr(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function numberOr(value, fallback) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function booleanOr(value, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function initiativeOr(value, fallback = 0) {
  const text = typeof value === 'string' ? value.trim() : value;
  if (text === '' || text == null) return fallback;
  const numeric = Number(text);
  return Number.isFinite(numeric) ? numeric : String(text);
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function slugifyFilePart(value) {
  const normalized = normalizeCampaignName(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'campagne-cadence';
}

function normalizeCampaignFileName(value, name) {
  const fallback = `${slugifyFilePart(name)}.cad`;
  const clean = typeof value === 'string' ? value.trim() : '';
  return clean.endsWith('.cad') ? clean : fallback;
}

function normalizeCampaignFolderName(value, name) {
  const clean = typeof value === 'string' ? value.trim() : '';
  return clean || slugifyFilePart(name);
}

function normalizeCampaignId(value, name) {
  const clean = typeof value === 'string' ? value.trim() : '';
  return clean || slugifyFilePart(name);
}

function normalizeKind(kind) {
  const normalized = legacyParticipantKinds[kind] || kind;
  return typeof normalized === 'string' && normalized.trim() ? normalized : 'Environnement';
}

function normalizeQuickStat(stat) {
  if (isPlainObject(stat)) {
    const label = stringOr(stat.label || stat.titre).trim();
    const value = stringOr(stat.value || stat.valeur).trim();
    if (!label && !value) return null;
    return { label, value, editable: booleanOr(stat.editable) };
  }
  const text = String(stat || '').trim();
  return text ? text : null;
}

function normalizeStatus(status) {
  if (!isPlainObject(status)) return null;
  return {
    ...status,
    id: stringOr(status.id, uid('status')),
    name: stringOr(status.name, 'Etat'),
    duration: status.duration == null ? null : Math.max(1, numberOr(status.duration, 1)),
    remaining: status.remaining == null ? null : Math.max(0, numberOr(status.remaining, status.duration || 0)),
    loop: booleanOr(status.loop),
    inactive: booleanOr(status.inactive),
    limited: !booleanOr(status.inactive) && booleanOr(status.limited),
    advanceOn: status.advanceOn === 'round' ? 'round' : 'activation',
    color: stringOr(status.color),
    tintParticipant: booleanOr(status.tintParticipant),
    expired: booleanOr(status.expired),
    skipNextActivation: booleanOr(status.skipNextActivation),
    activationSkipConsumed: booleanOr(status.activationSkipConsumed),
    skipNextAdvance: booleanOr(status.skipNextAdvance),
    advanceSkipConsumed: booleanOr(status.advanceSkipConsumed),
  };
}

function normalizeResetRule(rule = {}) {
  const legacyMultiplier = rule.multiplier === '' ? '' : rule.multiplier;
  const percent = rule.percent === '' ? '' : rule.percent != null
    ? numberOr(rule.percent, 100)
    : legacyMultiplier === ''
      ? ''
      : numberOr(legacyMultiplier, 1) * 100;
  const legacyBarAutoMode = rule.barAutoMode;
  const barAutoMode = legacyBarAutoMode === 'increase' || legacyBarAutoMode === 'decrease'
    ? 'limit'
    : legacyBarAutoMode === 'increaseFree' || legacyBarAutoMode === 'decreaseFree'
      ? 'always'
      : ['limit', 'always', 'default'].includes(legacyBarAutoMode)
        ? legacyBarAutoMode
        : 'limit';
  return {
    mode: ['initial', 'zero', 'max', 'checked', 'delta', 'boxDelta', 'towardDefault'].includes(rule.mode) ? rule.mode : 'towardDefault',
    delta: numberOr(rule.delta, 1),
    step: numberOr(rule.step, 1),
    percent,
    stepMode: rule.stepMode === 'percent' ? 'percent' : 'flat',
    barAutoMode,
    pointsAutoMode: ['increase', 'decrease', 'default'].includes(rule.pointsAutoMode) ? rule.pointsAutoMode : 'default',
    pointsAutoCycles: typeof rule.pointsAutoCycles === 'boolean' ? rule.pointsAutoCycles : rule.pointsAutoMode === 'default',
    counterRules: isPlainObject(rule.counterRules) ? rule.counterRules : {},
    boxBlocks: isPlainObject(rule.boxBlocks) ? rule.boxBlocks : {},
    minCap: rule.minCap === '' ? '' : rule.minCap ?? '',
    maxCap: rule.maxCap === '' ? '' : rule.maxCap ?? '',
    excessReductionPercent: rule.excessReductionPercent === '' ? '' : rule.excessReductionPercent ?? '',
    underflowRecoveryPercent: rule.underflowRecoveryPercent === '' ? '' : rule.underflowRecoveryPercent ?? '',
    overflowTrimPercent: numberOr(rule.overflowTrimPercent, 0),
    rounding: ['nearest', 'floor', 'ceil'].includes(rule.rounding) ? rule.rounding : 'floor',
    amount: Math.max(1, numberOr(rule.amount, 1)),
    after: ['none', 'zero', 'max', 'initial'].includes(rule.after) ? rule.after : 'none',
  };
}

function normalizeTracker(tracker) {
  if (!isPlainObject(tracker)) return null;
  const rawType = ['bar', 'points', 'dots', 'clock', 'boxes', 'number'].includes(tracker.type) ? tracker.type : 'bar';
  const type = rawType === 'dots' ? 'points' : rawType;
  const base = {
    ...tracker,
    id: stringOr(tracker.id, uid('t')),
    type,
    name: stringOr(tracker.name, type === 'clock' ? 'Horloge' : 'Suivi'),
    visible: tracker.visible !== false,
  };

  if (type === 'boxes') {
    return normalizeBoxTracker({
      ...base,
      type: 'boxes',
      secret: booleanOr(tracker.secret),
      autoReset: ['never', 'round', 'activation'].includes(tracker.autoReset) ? tracker.autoReset : (type === 'clock' ? 'activation' : 'never'),
      autoResetPaused: booleanOr(tracker.autoResetPaused),
      resetMode: ['initial', 'zero', 'checked', 'boxDelta'].includes(tracker.resetMode) ? tracker.resetMode : 'initial',
      resetRule: normalizeResetRule(tracker.resetRule),
      resetDefaultMode: ['full', 'empty', 'custom'].includes(tracker.resetDefaultMode) ? tracker.resetDefaultMode : 'empty',
      fillLevels: Math.max(1, Math.min(5, numberOr(tracker.fillLevels, 1))),
      emptyLevelActive: tracker.emptyLevelActive !== false,
      levelVisuals: normalizeArray(tracker.levelVisuals).map((rank) => Math.max(1, Math.min(5, numberOr(rank, 1)))).filter((rank, index, list) => list.indexOf(rank) === index).slice(0, 5),
      levelLabels: normalizeArray(tracker.levelLabels).map((label) => String(label || '').trim()).filter(Boolean).slice(0, 5),
      levelPriorities: normalizeArray(tracker.levelPriorities).map((priority) => Math.max(1, numberOr(priority, 1))).slice(0, 5),
      blocks: normalizeArray(tracker.blocks).filter(isPlainObject),
    });
  }

  if (type === 'clock' || isPointsTracker(type)) {
    return {
      ...base,
      type,
      current: Math.max(0, numberOr(tracker.current, 0)),
      initial: Math.max(0, numberOr(tracker.initial, tracker.current ?? 0)),
      min: tracker.min == null || tracker.min === '' ? 0 : numberOr(tracker.min, 0),
      max: Math.max(1, numberOr(tracker.max, type === 'clock' ? 6 : 5)),
      step: Math.max(1, numberOr(tracker.step, 1)),
      direction: tracker.direction === 'countdown' ? 'countdown' : 'progression',
      limitMode: type === 'clock'
        ? (['manual', 'increment', 'overflow'].includes(tracker.limitMode) ? tracker.limitMode : 'manual')
        : (['clamp', 'loop'].includes(tracker.limitMode) ? tracker.limitMode : 'clamp'),
      cycles: numberOr(tracker.cycles, 0),
      cyclesInitial: numberOr(tracker.cyclesInitial, 0),
      cyclesMin: tracker.cyclesMin == null || tracker.cyclesMin === '' ? null : numberOr(tracker.cyclesMin, 0),
      cyclesMax: tracker.cyclesMax == null || tracker.cyclesMax === '' ? null : numberOr(tracker.cyclesMax, 0),
      currentThresholds: (isPointsTracker(type) || type === 'clock') ? normalizeThresholds(tracker.currentThresholds || tracker.thresholds) : tracker.currentThresholds,
      totalThresholds: (isPointsTracker(type) || type === 'clock') ? normalizeThresholds(tracker.totalThresholds) : tracker.totalThresholds,
      thresholds: normalizeThresholds(tracker.thresholds),
      secret: booleanOr(tracker.secret),
      autoReset: ['never', 'round', 'activation'].includes(tracker.autoReset) ? tracker.autoReset : (type === 'clock' ? 'activation' : 'never'),
      autoResetPaused: booleanOr(tracker.autoResetPaused),
      freezeAllowed: typeof tracker.freezeAllowed === 'boolean' ? tracker.freezeAllowed : false,
      resetMode: ['initial', 'zero', 'max', 'delta'].includes(tracker.resetMode) ? tracker.resetMode : 'initial',
      resetRule: normalizeResetRule(tracker.resetRule),
      resetDefaultMode: ['full', 'empty', 'custom'].includes(tracker.resetDefaultMode) ? tracker.resetDefaultMode : 'empty',
      auto: type === 'clock' ? booleanOr(tracker.auto, true) : tracker.auto,
      frozen: booleanOr(tracker.frozen),
    };
  }

  return {
    ...base,
    current: numberOr(tracker.current, type === 'bar' ? 10 : 0),
    initial: numberOr(tracker.initial, type === 'bar' ? tracker.max ?? tracker.current ?? 10 : tracker.current ?? 0),
    min: tracker.min == null || tracker.min === '' ? null : numberOr(tracker.min, 0),
    max: tracker.max == null || tracker.max === '' ? null : numberOr(tracker.max, type === 'bar' ? 20 : 0),
    step: type === 'bar' ? 1 : Math.max(1, numberOr(tracker.step, 1)),
    direction: type === 'bar' && tracker.direction === 'progression' ? 'progression' : 'countdown',
    thresholds: normalizeTrackerThresholds(type, tracker.thresholds),
    secret: booleanOr(tracker.secret),
    autoReset: ['never', 'round', 'activation'].includes(tracker.autoReset) ? tracker.autoReset : (type === 'clock' ? 'activation' : 'never'),
    autoResetPaused: booleanOr(tracker.autoResetPaused),
    freezeAllowed: typeof tracker.freezeAllowed === 'boolean' ? tracker.freezeAllowed : false,
    resetMode: ['initial', 'zero', 'max', 'delta'].includes(tracker.resetMode) ? tracker.resetMode : 'initial',
    resetRule: normalizeResetRule(tracker.resetRule),
    resetDefaultMode: ['full', 'empty', 'custom'].includes(tracker.resetDefaultMode) ? tracker.resetDefaultMode : (type === 'bar' ? 'full' : 'empty'),
    counterSize: ['compact', 'normal', 'wide'].includes(tracker.counterSize) ? tracker.counterSize : 'compact',
    counters: type === 'number' ? normalizeArray(tracker.counters).filter(isPlainObject).map((counter) => ({
      ...counter,
      id: stringOr(counter.id, uid('counter')),
      label: stringOr(counter.label, 'Compteur'),
      current: numberOr(counter.current, 0),
      initial: numberOr(counter.initial, counter.current ?? 0),
      step: Math.max(1, numberOr(counter.step, 1)),
      size: ['compact', 'normal', 'wide'].includes(counter.size) ? counter.size : 'compact',
    })) : tracker.counters,
    minAbsolute: type === 'bar' ? booleanOr(tracker.minAbsolute, true) : booleanOr(tracker.minAbsolute),
    maxAbsolute: type === 'bar' ? booleanOr(tracker.maxAbsolute, true) : booleanOr(tracker.maxAbsolute),
  };
}

export function normalizeCampaignName(name) {
  const normalized = String(name || '').trim();
  return normalized || DEFAULT_CAMPAIGN_NAME;
}

export function normalizeCampaignParticipant(participant, { reserve = false } = {}) {
  if (!isPlainObject(participant)) return null;
  const initiative = reserve ? 0 : initiativeOr(participant.initiative, 0);
  const actionSlots = reserve ? [] : normaliserCreneauxAction({ ...participant, initiative });
  const previousInitiative = participant.previousInitiative == null || participant.previousInitiative === ''
    ? (reserve ? initiativeOr(participant.initiative, '') : '')
    : initiativeOr(participant.previousInitiative, '');
  const previousActionSlots = reserve && previousInitiative !== ''
    ? baseInitiativeSlots({ ...participant, initiative: previousInitiative, actionSlots: participant.previousActionSlots || participant.actionSlots })
    : [];
  const rawPhaseActions = Array.isArray(participant.phaseActions) ? participant.phaseActions : Array.isArray(participant.phases) ? participant.phases : Array.isArray(participant.checkedPhases) ? participant.checkedPhases : null;
  return {
    ...participant,
    id: stringOr(participant.id, uid('p')),
    name: stringOr(participant.name, t('templates.fallback.character')),
    kind: normalizeKind(participant.kind),
    symbol: stringOr(participant.symbol, defaultMechanicalSymbol),
    color: stringOr(participant.color, 'slate'),
    initiative,
    initiativeBonus: numberOr(participant.initiativeBonus, 0),
    actionSlots,
    previousInitiative,
    previousActionSlots,
    phaseActions: rawPhaseActions ? [...new Set(rawPhaseActions.map((phase) => String(phase ?? '').trim()).filter(Boolean))] : participant.phaseActions,
    departage: participant.departage === '' || participant.departage == null ? '' : numberOr(participant.departage, 0),
    description: stringOr(participant.description),
    stats: normalizeArray(participant.stats).map(normalizeQuickStat).filter(Boolean),
    statuses: normalizeArray(participant.statuses).map(normalizeStatus).filter(Boolean),
    trackers: normalizeArray(participant.trackers).map(normalizeTracker).filter(Boolean),
  };
}

export function normalizeCampaignScene(scene) {
  if (!isPlainObject(scene)) return null;
  const legacyDeclaration = scene.temporalite === temporalityModes.DECLARATION;
  return {
    ...scene,
    id: stringOr(scene.id, uid('scene')),
    title: stringOr(scene.title, 'Scène'),
    type: stringOr(scene.type, 'Scène'),
    round: Math.max(-1, numberOr(scene.round, -1)),
    phase: Math.max(1, numberOr(scene.phase, 1)),
    phaseDecrement: Math.max(1, numberOr(scene.phaseDecrement, defaultPhaseDecrement)),
    phaseRerollEachRound: booleanOr(scene.phaseRerollEachRound, defaultPhaseRerollEachRound),
    phaseActionMode: Object.values(phaseActionModes).includes(scene.phaseActionMode) ? scene.phaseActionMode : defaultPhaseActionMode,
    phaseCount: Math.max(1, Math.min(20, numberOr(scene.phaseCount, defaultPhaseCount))),
    activeId: stringOr(scene.activeId),
    activeSlotId: stringOr(scene.activeSlotId),
    notes: stringOr(scene.notes),
    reserveNotes: stringOr(scene.reserveNotes),
    preparationSurprise: booleanOr(scene.preparationSurprise),
    surpriseImpact: ['limited', 'inactive'].includes(scene.surpriseImpact) ? scene.surpriseImpact : defaultSurpriseImpact,
    surpriseAdvanceOn: scene.surpriseAdvanceOn === 'round' ? 'round' : defaultSurpriseAdvanceOn,
    surpriseDedicatedRound: booleanOr(scene.surpriseDedicatedRound, defaultSurpriseDedicatedRound),
    surpriseRoundActive: booleanOr(scene.surpriseRoundActive),
    statuses: normalizeArray(scene.statuses).map(normalizeStatus).filter(Boolean),
    temporalite: legacyDeclaration ? defaultTemporalityMode : stringOr(scene.temporalite, defaultTemporalityMode),
    declarationMode: booleanOr(scene.declarationMode, legacyDeclaration ? true : defaultDeclarationMode),
    declarationStage: stringOr(scene.declarationStage),
    declarations: isPlainObject(scene.declarations) ? scene.declarations : {},
    resolutionOrder: normalizeArray(scene.resolutionOrder).map((id) => String(id)),
    declarationPlayedIds: normalizeArray(scene.declarationPlayedIds).map((id) => String(id)),
    multipleActionMode: Object.values(multipleActionModes).includes(scene.multipleActionMode) ? scene.multipleActionMode : multipleActionModeFromRules(scene) || defaultMultipleActionMode,
    multipleActionSlots: multipleActionModeFromRules(scene) !== multipleActionModes.NONE,
    initiativeCostThreshold: normalizeInitiativeCostThreshold(scene.initiativeCostThreshold ?? defaultInitiativeCostThreshold),
    initiativeCostQuickCosts: normalizeInitiativeCostQuickCosts(scene.initiativeCostQuickCosts ?? defaultInitiativeCostQuickCosts),
    initiativeCostLimitToCurrent: normalizeInitiativeCostLimitToCurrent(scene.initiativeCostLimitToCurrent ?? defaultInitiativeCostLimitToCurrent),
    jouesSouples: normalizeArray(scene.jouesSouples).map((id) => String(id)),
    historiqueSouple: normalizeArray(scene.historiqueSouple).map((id) => String(id)),
    equalityRule: stringOr(scene.equalityRule, defaultEqualityRule),
    flexibleUseInitiative: booleanOr(scene.flexibleUseInitiative, defaultFlexibleUseInitiative),
    initiativeOrder: Object.values(initiativeOrders).includes(scene.initiativeOrder) ? scene.initiativeOrder : defaultInitiativeOrder,
    categoryOrder: normalizeArray(scene.categoryOrder).length ? normalizeArray(scene.categoryOrder).map((category) => String(category)) : defaultCategoryOrder,
    tiebreakerVisible: booleanOr(scene.tiebreakerVisible, defaultTiebreakerVisible),
    tiebreakerLabel: stringOr(scene.tiebreakerLabel, defaultTiebreakerLabel).trim() || defaultTiebreakerLabel,
    globalTracker: normalizeGlobalTracker(scene.globalTracker),
    reserve: normalizeArray(scene.reserve).map((participant) => normalizeCampaignParticipant(participant, { reserve: true })).filter(Boolean),
    participants: normalizeArray(scene.participants).map((participant) => normalizeCampaignParticipant(participant)).filter(Boolean),
  };
}

export function normalizeCampaignScenes(scenes) {
  return normalizeArray(scenes).map(normalizeCampaignScene).filter(Boolean);
}

function exportedTemplateStore(templates) {
  const normalized = normalizeTemplateStore(templates);
  return {
    ...normalized,
    ruleTemplates: [],
  };
}

export function rulePresetSnapshotFromPayload(data, activeRules = null) {
  return normalizeRulePresetSnapshot(data?.rulePresetSnapshot, activeRules);
}

export function createCampaignPayload(scenes, dark, campaignName = DEFAULT_CAMPAIGN_NAME, templates, initiativeRules, rulePresetSnapshot = null, campaignMeta = {}) {
  const safeScenes = normalizeCampaignScenes(scenes);
  const rules = normalizeCampaignRules(initiativeRules || campaignRulesFromPayload({ scenes: safeScenes }));
  const name = normalizeCampaignName(campaignMeta.name || campaignName);
  const folderName = normalizeCampaignFolderName(campaignMeta.folderName, name);
  const fileName = normalizeCampaignFileName(campaignMeta.fileName, name);
  return {
    format: CADENCE_CAMPAIGN_FORMAT,
    schemaVersion: CADENCE_CAMPAIGN_SCHEMA_VERSION,
    campaign: {
      id: normalizeCampaignId(campaignMeta.id, name),
      name,
      folderName,
      fileName,
    },
    name,
    version: APP_VERSION,
    savedAt: new Date().toISOString(),
    initiativeRules: rules,
    rulePresetSnapshot: rulePresetSnapshotFromPayload({ rulePresetSnapshot }, rules),
    scenes: unifyCampaignScenes(safeScenes, rules),
    templates: exportedTemplateStore(templates),
  };
}

export function campaignNameFromPayload(data) {
  return normalizeCampaignName(data?.campaign?.name || data?.name || data?.settings?.campaignName);
}

export function campaignMetaFromPayload(data) {
  const name = campaignNameFromPayload(data);
  const source = isPlainObject(data?.campaign) ? data.campaign : {};
  return {
    id: normalizeCampaignId(source.id, name),
    name,
    folderName: normalizeCampaignFolderName(source.folderName, name),
    fileName: normalizeCampaignFileName(source.fileName, name),
  };
}

export function campaignTemplatesFromPayload(data) {
  const localStore = typeof localStorage === 'undefined' ? normalizeTemplateStore(null) : loadTemplateStore();
  const importedStore = normalizeTemplateStore(data?.templates || localStore);
  return normalizeTemplateStore({
    ...importedStore,
    ruleTemplates: localStore.ruleTemplates,
  });
}

export function normalizeCampaignPayload(data) {
  const scenes = normalizeCampaignScenes(data?.scenes);
  const fallback = makeDefaultCampaign();
  const sourceScenes = scenes.length ? scenes : normalizeCampaignScenes(fallback.scenes);
  const initiativeRules = campaignRulesFromPayload({ ...(isPlainObject(data) ? data : {}), scenes: sourceScenes });
  const campaign = campaignMetaFromPayload(data);
  const source = isPlainObject(data) ? { ...data } : {};
  delete source.settings;

  return {
    ...source,
    format: CADENCE_CAMPAIGN_FORMAT,
    schemaVersion: CADENCE_CAMPAIGN_SCHEMA_VERSION,
    campaign,
    name: campaign.name,
    version: APP_VERSION,
    savedAt: typeof data?.savedAt === 'string' ? data.savedAt : new Date().toISOString(),
    initiativeRules,
    rulePresetSnapshot: rulePresetSnapshotFromPayload(data, initiativeRules),
    scenes: unifyCampaignScenes(sourceScenes, initiativeRules),
    templates: campaignTemplatesFromPayload(data),
  };
}

export function loadCampaign() {
  try {
    const saved = readLocalCampaignPayload(STORAGE_KEY);
    if (isValidCampaign(saved)) return normalizeCampaignPayload(saved);
  } catch (error) {
    console.warn('Impossible de charger la campagne sauvegardée.', error);
  }

  return normalizeCampaignPayload(makeDefaultCampaign());
}

export function saveCampaign(scenes, dark, campaignName, templates, initiativeRules, rulePresetSnapshot = null, campaignMeta = {}) {
  writeLocalCampaignPayload(STORAGE_KEY, createCampaignPayload(scenes, dark, campaignName, templates, initiativeRules, rulePresetSnapshot, campaignMeta));
}

export function serializeCampaign(scenes, dark, campaignName, templates, initiativeRules, rulePresetSnapshot = null, campaignMeta = {}) {
  return JSON.stringify(createCampaignPayload(scenes, dark, campaignName, templates, initiativeRules, rulePresetSnapshot, campaignMeta), null, 2);
}

function hasScenes(data) {
  return Array.isArray(data?.scenes) && data.scenes.length > 0 && data.scenes.every((scene) => isPlainObject(scene));
}

function hasCurrentSignature(data) {
  return data?.format === CADENCE_CAMPAIGN_FORMAT && data?.schemaVersion === CADENCE_CAMPAIGN_SCHEMA_VERSION;
}

function hasCampaignBlock(data) {
  return isPlainObject(data?.campaign)
    && typeof data.campaign.name === 'string'
    && data.campaign.name.trim().length > 0
    && typeof data.campaign.fileName === 'string'
    && data.campaign.fileName.trim().endsWith('.cad')
    && typeof data.campaign.folderName === 'string'
    && data.campaign.folderName.trim().length > 0;
}

export function isValidCampaign(data) {
  if (!isPlainObject(data)) return false;
  if (!hasScenes(data)) return false;
  if (data.settings != null && !isPlainObject(data.settings)) return false;
  if (data.name != null && typeof data.name !== 'string') return false;
  if (data.initiativeRules != null && !isPlainObject(data.initiativeRules)) return false;
  if (data.rulePresetSnapshot != null && !isPlainObject(data.rulePresetSnapshot)) return false;
  if (!isTemplateStoreLike(data.templates)) return false;
  return hasCurrentSignature(data) && hasCampaignBlock(data);
}
