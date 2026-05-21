import {
  APP_VERSION,
  STORAGE_KEY,
  defaultCategoryOrder,
  defaultEqualityRule,
  defaultPhaseDecrement,
  defaultPhaseRerollEachRound,
  defaultStartRound,
  defaultTemporalityMode,
  legacyParticipantKinds,
} from './constants.js';
import { campaignRulesFromPayload, normalizeCampaignRules, unifyCampaignScenes } from './domain/campaignRules.js';
import { normalizeGlobalTracker } from './domain/globalTracker.js';
import { isPointsTracker, normalizeThresholds, makeDefaultCampaign, uid } from './logic.js';
import { isTemplateStoreLike, loadTemplateStore, normalizeTemplateStore } from './templates.js';

export const CADENCE_CAMPAIGN_FORMAT = 'cadence-campaign';
export const CADENCE_CAMPAIGN_SCHEMA_VERSION = 1;
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

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
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
    expired: booleanOr(status.expired),
  };
}

function normalizeResetRule(rule = {}) {
  return {
    mode: ['initial', 'zero', 'max', 'checked', 'delta', 'boxDelta', 'towardDefault'].includes(rule.mode) ? rule.mode : 'towardDefault',
    delta: numberOr(rule.delta, 1),
    step: numberOr(rule.step, 1),
    amount: Math.max(1, numberOr(rule.amount, 1)),
    targetRowId: stringOr(rule.targetRowId, ''),
    after: ['none', 'zero', 'max', 'initial'].includes(rule.after) ? rule.after : 'none',
  };
}

function normalizeTracker(tracker) {
  if (!isPlainObject(tracker)) return null;
  const rawType = ['bar', 'points', 'dots', 'clock', 'boxes', 'boxesFree', 'boxesSorted', 'number'].includes(tracker.type) ? tracker.type : 'bar';
  const type = rawType === 'dots' ? 'points' : ['boxesFree', 'boxesSorted'].includes(rawType) ? 'boxes' : rawType;
  const base = {
    ...tracker,
    id: stringOr(tracker.id, uid('t')),
    type,
    name: stringOr(tracker.name, type === 'clock' ? 'Horloge' : 'Suivi'),
    visible: tracker.visible !== false,
  };

  if (type === 'boxes') {
    return {
      ...base,
      type: 'boxes',
      boxMode: tracker.boxMode === 'free' || rawType === 'boxesFree' ? 'free' : 'sorted',
      secret: booleanOr(tracker.secret),
      autoReset: ['never', 'round', 'activation'].includes(tracker.autoReset) ? tracker.autoReset : 'never',
      autoResetPaused: booleanOr(tracker.autoResetPaused),
      resetMode: ['initial', 'zero', 'checked', 'boxDelta'].includes(tracker.resetMode) ? tracker.resetMode : 'initial',
      resetRule: normalizeResetRule(tracker.resetRule),
      resetDefaultMode: ['full', 'empty', 'custom'].includes(tracker.resetDefaultMode) ? tracker.resetDefaultMode : 'empty',
      fillLevels: Math.max(1, Math.min(5, numberOr(tracker.fillLevels, 5))),
      levelLabels: normalizeArray(tracker.levelLabels).map((label) => String(label || '').trim()).filter(Boolean).slice(0, 5),
      levelPriorities: normalizeArray(tracker.levelPriorities).map((priority) => Math.max(1, numberOr(priority, 1))).slice(0, 5),
      globalSort: tracker.globalSort !== false,
      rows: normalizeArray(tracker.rows).filter(isPlainObject).map((row) => ({
        ...row,
        id: stringOr(row.id, uid('r')),
        label: stringOr(row.label, 'Ligne'),
        marks: normalizeArray(row.marks).map((mark) => Math.max(0, numberOr(mark, 0))),
      })),
      initialRows: normalizeArray(tracker.initialRows).filter(isPlainObject).map((row) => ({
        ...row,
        id: stringOr(row.id, uid('r')),
        label: stringOr(row.label, 'Ligne'),
        marks: normalizeArray(row.marks).map((mark) => Math.max(0, numberOr(mark, 0))),
      })),
    };
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
      autoReset: ['never', 'round', 'activation'].includes(tracker.autoReset) ? tracker.autoReset : 'never',
      autoResetPaused: booleanOr(tracker.autoResetPaused),
      resetMode: ['initial', 'zero', 'max', 'delta'].includes(tracker.resetMode) ? tracker.resetMode : 'initial',
      resetRule: normalizeResetRule(tracker.resetRule),
      resetDefaultMode: ['full', 'empty', 'custom'].includes(tracker.resetDefaultMode) ? tracker.resetDefaultMode : 'empty',
      auto: type === 'clock' ? booleanOr(tracker.auto, true) : tracker.auto,
      frozen: type === 'clock' ? booleanOr(tracker.frozen) : tracker.frozen,
    };
  }

  return {
    ...base,
    current: numberOr(tracker.current, type === 'bar' ? 10 : 0),
    initial: numberOr(tracker.initial, type === 'bar' ? tracker.max ?? tracker.current ?? 10 : tracker.current ?? 0),
    min: tracker.min == null || tracker.min === '' ? null : numberOr(tracker.min, 0),
    max: tracker.max == null || tracker.max === '' ? null : numberOr(tracker.max, type === 'bar' ? 20 : 0),
    step: Math.max(1, numberOr(tracker.step, type === 'bar' ? 5 : 1)),
    direction: type === 'bar' && tracker.direction === 'progression' ? 'progression' : 'countdown',
    thresholds: normalizeThresholds(tracker.thresholds),
    secret: booleanOr(tracker.secret),
    autoReset: ['never', 'round', 'activation'].includes(tracker.autoReset) ? tracker.autoReset : 'never',
    autoResetPaused: booleanOr(tracker.autoResetPaused),
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
  return {
    ...participant,
    id: stringOr(participant.id, uid('p')),
    name: stringOr(participant.name, 'Nouveau personnage'),
    kind: normalizeKind(participant.kind),
    symbol: stringOr(participant.symbol, '⚙'),
    color: stringOr(participant.color, 'slate'),
    initiative: reserve ? 0 : numberOr(participant.initiative, 0),
    departage: participant.departage === '' || participant.departage == null ? '' : numberOr(participant.departage, 0),
    description: stringOr(participant.description),
    stats: normalizeArray(participant.stats).map(normalizeQuickStat).filter(Boolean),
    statuses: normalizeArray(participant.statuses).map(normalizeStatus).filter(Boolean),
    trackers: normalizeArray(participant.trackers).map(normalizeTracker).filter(Boolean),
  };
}

export function normalizeCampaignScene(scene) {
  if (!isPlainObject(scene)) return null;
  return {
    ...scene,
    id: stringOr(scene.id, uid('scene')),
    title: stringOr(scene.title, 'Scène'),
    type: stringOr(scene.type, 'Scène'),
    round: Math.max(-1, numberOr(scene.round, -1)),
    phase: Math.max(1, numberOr(scene.phase, 1)),
    phaseDecrement: Math.max(1, numberOr(scene.phaseDecrement, defaultPhaseDecrement)),
    phaseRerollEachRound: booleanOr(scene.phaseRerollEachRound, defaultPhaseRerollEachRound),
    activeId: stringOr(scene.activeId),
    notes: stringOr(scene.notes),
    reserveNotes: stringOr(scene.reserveNotes),
    temporalite: stringOr(scene.temporalite, defaultTemporalityMode),
    jouesSouples: normalizeArray(scene.jouesSouples).map((id) => String(id)),
    historiqueSouple: normalizeArray(scene.historiqueSouple).map((id) => String(id)),
    equalityRule: stringOr(scene.equalityRule, defaultEqualityRule),
    categoryOrder: normalizeArray(scene.categoryOrder).length ? normalizeArray(scene.categoryOrder).map((category) => String(category)) : defaultCategoryOrder,
    globalTracker: normalizeGlobalTracker(scene.globalTracker),
    reserve: normalizeArray(scene.reserve).map((participant) => normalizeCampaignParticipant(participant, { reserve: true })).filter(Boolean),
    participants: normalizeArray(scene.participants).map((participant) => normalizeCampaignParticipant(participant)).filter(Boolean),
  };
}

export function normalizeCampaignScenes(scenes) {
  return normalizeArray(scenes).map(normalizeCampaignScene).filter(Boolean);
}

export function createCampaignPayload(scenes, dark, campaignName = DEFAULT_CAMPAIGN_NAME, templates, initiativeRules) {
  const safeScenes = normalizeCampaignScenes(scenes);
  const rules = normalizeCampaignRules(initiativeRules || campaignRulesFromPayload({ scenes: safeScenes }));
  return {
    format: CADENCE_CAMPAIGN_FORMAT,
    schemaVersion: CADENCE_CAMPAIGN_SCHEMA_VERSION,
    name: normalizeCampaignName(campaignName),
    version: APP_VERSION,
    initiativeRules: rules,
    scenes: unifyCampaignScenes(safeScenes, rules),
    templates: normalizeTemplateStore(templates),
    settings: { dark: !!dark },
  };
}

export function campaignNameFromPayload(data) {
  return normalizeCampaignName(data?.name || data?.settings?.campaignName);
}

export function campaignTemplatesFromPayload(data) {
  return normalizeTemplateStore(data?.templates || loadTemplateStore());
}

export function normalizeCampaignPayload(data) {
  const scenes = normalizeCampaignScenes(data?.scenes);
  const fallback = makeDefaultCampaign();
  const sourceScenes = scenes.length ? scenes : normalizeCampaignScenes(fallback.scenes);
  const initiativeRules = campaignRulesFromPayload({ ...(isPlainObject(data) ? data : {}), scenes: sourceScenes });
  const settings = isPlainObject(data?.settings) ? data.settings : {};

  return {
    ...(isPlainObject(data) ? data : {}),
    format: CADENCE_CAMPAIGN_FORMAT,
    schemaVersion: CADENCE_CAMPAIGN_SCHEMA_VERSION,
    name: campaignNameFromPayload(data),
    version: APP_VERSION,
    initiativeRules,
    scenes: unifyCampaignScenes(sourceScenes, initiativeRules),
    templates: campaignTemplatesFromPayload(data),
    settings: {
      ...settings,
      dark: !!settings.dark,
    },
  };
}

export function loadCampaign() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (isValidCampaign(saved)) return normalizeCampaignPayload(saved);
  } catch (error) {
    console.warn('Impossible de charger la campagne sauvegardée.', error);
  }

  return normalizeCampaignPayload(makeDefaultCampaign());
}

export function saveCampaign(scenes, dark, campaignName, templates, initiativeRules) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(createCampaignPayload(scenes, dark, campaignName, templates, initiativeRules)));
}

export function serializeCampaign(scenes, dark, campaignName, templates, initiativeRules) {
  return JSON.stringify(createCampaignPayload(scenes, dark, campaignName, templates, initiativeRules), null, 2);
}

function hasScenes(data) {
  return Array.isArray(data?.scenes) && data.scenes.length > 0 && data.scenes.every((scene) => isPlainObject(scene));
}

function hasCurrentSignature(data) {
  return data?.format === CADENCE_CAMPAIGN_FORMAT && data?.schemaVersion === CADENCE_CAMPAIGN_SCHEMA_VERSION;
}

function hasLegacySignature(data) {
  return typeof data?.version === 'string' && data.version.length > 0;
}

export function isValidCampaign(data) {
  if (!isPlainObject(data)) return false;
  if (!hasScenes(data)) return false;
  if (data.settings != null && !isPlainObject(data.settings)) return false;
  if (data.name != null && typeof data.name !== 'string') return false;
  if (data.initiativeRules != null && !isPlainObject(data.initiativeRules)) return false;
  if (!isTemplateStoreLike(data.templates)) return false;
  return hasCurrentSignature(data) || hasLegacySignature(data);
}
