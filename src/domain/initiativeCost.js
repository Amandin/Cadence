import {
  defaultInitiativeCostQuickCosts,
  defaultInitiativeCostThreshold,
  multipleActionModes,
} from '../constants.js';

export const INITIATIVE_COST_SLOT_KIND = 'initiative-cost';

const arr = (value) => Array.isArray(value) ? value : [];
const num = (value, fallback = 0) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
};

export function multipleActionModeFromRules(rules = {}) {
  if (Object.values(multipleActionModes).includes(rules.multipleActionMode)) return rules.multipleActionMode;
  if (Object.values(multipleActionModes).includes(rules.multipleActionsMode)) return rules.multipleActionsMode;
  return rules.multipleActionSlots !== false ? multipleActionModes.MANUAL : multipleActionModes.NONE;
}

export function isManualMultipleActionMode(rules = {}) {
  return multipleActionModeFromRules(rules) === multipleActionModes.MANUAL;
}

export function isInitiativeCostMode(rules = {}) {
  return multipleActionModeFromRules(rules) === multipleActionModes.INITIATIVE_COST;
}

export function rulesAllowMultipleSlots(rules = {}) {
  return multipleActionModeFromRules(rules) !== multipleActionModes.NONE;
}

export function normalizeInitiativeCostThreshold(value) {
  return num(value, defaultInitiativeCostThreshold);
}

export function normalizeInitiativeCostQuickCosts(value) {
  const costs = arr(value)
    .map((item) => Math.max(1, Math.floor(num(item, 0))))
    .filter(Boolean);
  return [...new Set(costs)].slice(0, 8).length ? [...new Set(costs)].slice(0, 8) : defaultInitiativeCostQuickCosts;
}

export function isGeneratedInitiativeCostSlot(slot = {}) {
  return slot.generatedBy === INITIATIVE_COST_SLOT_KIND;
}

function cleanBaseSlot(slot = {}, index = 0, fallbackInitiative = 0) {
  const { played, costPaid, costResult, generatedBy, sourceSlotId, ...rest } = slot && typeof slot === 'object' ? slot : { initiative: slot };
  return {
    ...rest,
    id: rest.id ? String(rest.id) : `slot-${index + 1}`,
    initiative: rest.initiative ?? fallbackInitiative,
    order: index,
  };
}

export function baseInitiativeSlots(participant = {}) {
  const rawSlots = arr(participant.actionSlots).filter((slot) => !isGeneratedInitiativeCostSlot(slot));
  const fallback = participant.previousInitiative ?? participant.initiative ?? 0;
  const slots = rawSlots.length ? rawSlots : [{ id: 'slot-1', initiative: fallback, order: 0 }];
  return slots.map((slot, index) => cleanBaseSlot(slot, index, fallback));
}

export function participantWithCleanInitiativeCostRound(participant = {}) {
  const actionSlots = baseInitiativeSlots(participant);
  return {
    ...participant,
    initiative: actionSlots[0]?.initiative ?? participant.initiative ?? 0,
    actionSlots,
  };
}

export function rememberBaseInitiative(participant = {}) {
  const actionSlots = baseInitiativeSlots(participant);
  return {
    previousInitiative: actionSlots[0]?.initiative ?? participant.initiative ?? 0,
    previousActionSlots: actionSlots,
  };
}
