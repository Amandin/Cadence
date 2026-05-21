import { temporalityModes } from './constants.js';

export const symbols = ['●●', '⚔', '🗡', '🛡', '🪓', '🏹', '🔮', '🗝', '📜', '⏳', '⚙', '🔥', '☁', '🌳', '🐺', '☠', '✦', '🦴', '🧪', '🕯'];
export const colors = ['slate', 'red', 'orange', 'amber', 'emerald', 'cyan', 'blue', 'violet', 'pink', 'rose'];

export function uid(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function isVisible(item) {
  return item.visible !== false;
}

function hasBound(value) {
  return value !== null && value !== '' && value !== undefined;
}

function numberOr(value, fallback) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

function roundByMode(value, mode = 'nearest') {
  if (mode === 'floor') return Math.floor(value);
  if (mode === 'ceil') return Math.ceil(value);
  return Math.round(value);
}

export function isPointsTracker(trackerOrType) {
  const type = typeof trackerOrType === 'string' ? trackerOrType : trackerOrType?.type;
  return type === 'points' || type === 'dots';
}

export function isBoxesFreeTracker(trackerOrType) {
  if (typeof trackerOrType === 'string') return trackerOrType === 'boxesFree';
  return trackerOrType?.type === 'boxes' && trackerOrType.boxMode === 'free';
}

export function isBoxesSortedTracker(trackerOrType) {
  if (typeof trackerOrType === 'string') return trackerOrType === 'boxesSorted';
  return trackerOrType?.type === 'boxes' && trackerOrType.boxMode !== 'free';
}

export function isBoxesTracker(trackerOrType) {
  const type = typeof trackerOrType === 'string' ? trackerOrType : trackerOrType?.type;
  return ['boxes', 'boxesFree', 'boxesSorted'].includes(type);
}

export function isNumericTracker(trackerOrType) {
  const type = typeof trackerOrType === 'string' ? trackerOrType : trackerOrType?.type;
  return ['bar', 'number', 'clock', 'points', 'dots'].includes(type);
}

export function trackerDirection(tracker) {
  return tracker.direction === 'countdown' ? 'countdown' : 'progression';
}

export function defaultLimitMode(trackerOrType) {
  const type = typeof trackerOrType === 'string' ? trackerOrType : trackerOrType?.type;
  if (type === 'clock') return 'manual';
  if (type === 'points' || type === 'dots') return 'clamp';
  return 'clamp';
}

export function trackerLimitMode(tracker) {
  if (tracker.type === 'clock' && ['manual', 'increment', 'overflow'].includes(tracker.limitMode)) return tracker.limitMode;
  if (isPointsTracker(tracker) && ['clamp', 'loop'].includes(tracker.limitMode)) return tracker.limitMode;
  if (tracker.type === 'bar' && ['clamp', 'overflow'].includes(tracker.limitMode)) return tracker.limitMode;
  return defaultLimitMode(tracker);
}

export function trackerBounds(tracker) {
  const min = hasBound(tracker.min) ? Number(tracker.min) : 0;
  const max = hasBound(tracker.max) ? Number(tracker.max) : (tracker.type === 'clock' ? 6 : isPointsTracker(tracker) ? 5 : min);
  return { min, max: Math.max(min, max) };
}

export function isTriggeredClock(tracker) {
  if (tracker.type !== 'clock') return false;
  if (trackerLimitMode(tracker) !== 'manual') return false;
  const { min, max } = trackerBounds(tracker);
  const current = numberOr(tracker.current, 0);
  return trackerDirection(tracker) === 'countdown' ? current <= min : current >= max;
}

export function hasTriggeredClock(participant) {
  return participant.trackers?.some(isTriggeredClock) || false;
}

export function newTracker(type = 'bar') {
  const canonicalType = type === 'dots' ? 'points' : ['boxesFree', 'boxesSorted'].includes(type) ? 'boxes' : type;
  const base = { id: uid('t'), type: canonicalType, visible: true, autoReset: 'never', resetMode: 'initial' };
  if (type === 'clock') return { ...base, name: 'Horloge', current: 0, initial: 0, min: 0, max: 6, step: 1, direction: 'progression', limitMode: 'manual', cycles: 0, thresholds: [], auto: true, frozen: false, secret: false };
  if (type === 'points' || type === 'dots') return { ...base, name: 'Puces', current: 0, initial: 0, min: 0, max: 5, step: 1, direction: 'progression', limitMode: 'clamp', cycles: 0, cyclesInitial: 0, cyclesMin: null, cyclesMax: null, currentThresholds: [], totalThresholds: [], thresholds: [], secret: false };
  if (type === 'boxesFree') { const rows = [{ id: uid('r'), label: 'Case 1', marks: [0] }]; return { ...base, name: 'Cases', boxMode: 'free', fillLevels: 1, rows, initialRows: clone(rows), secret: false }; }
  if (type === 'boxes') { const rows = [{ id: uid('r'), label: 'Case 1', marks: [0] }]; return { ...base, name: 'Cases', boxMode: 'free', fillLevels: 1, rows, initialRows: clone(rows), secret: false }; }
  if (type === 'boxesSorted') { const rows = [{ id: uid('r'), label: 'Jauge', marks: [0, 0, 0, 0] }]; return { ...base, name: 'Cases', boxMode: 'sorted', fillLevels: 1, rows, initialRows: clone(rows), levelLabels: ['Marque'], levelPriorities: [1], secret: false }; }
  if (type === 'number') return { ...base, name: 'Compteur', current: 0, initial: 0, step: 1, counterSize: 'compact', counters: [], thresholds: [], secret: false };
  return { ...base, name: 'PV', current: 20, initial: 20, min: 0, max: 20, step: 5, direction: 'countdown', minAbsolute: true, maxAbsolute: true, thresholds: [], secret: false };
}

function resetRows(rows = [], mode = 'initial', initialRows = []) {
  if (mode === 'checked') return rows.map((row) => ({ ...row, marks: (row.marks || []).map(() => 1) }));
  if (mode === 'zero') return rows.map((row) => ({ ...row, marks: (row.marks || []).map(() => 0) }));
  if (initialRows?.length) return rows.map((row, index) => {
    const initial = initialRows[index];
    return initial ? { ...row, marks: (row.marks || []).map((_, markIndex) => Number(initial.marks?.[markIndex] || 0)) } : { ...row, marks: (row.marks || []).map(() => 0) };
  });
  return rows.map((row) => ({ ...row, marks: (row.marks || []).map(() => 0) }));
}

function applyResetAfter(tracker, next, after) {
  if (after === 'zero' || after === 'max' || after === 'initial') return resetTracker(next, after);
  return next;
}

function moveValueToward(current, target, step) {
  const delta = numberOr(step, 1);
  if (delta > 0 && target > current) return Math.min(target, current + delta);
  if (delta < 0 && target < current) return Math.max(target, current + delta);
  return current;
}

function capWithRule(value, rule = {}) {
  let next = value;
  if (hasBound(rule.minCap)) next = Math.max(next, Number(rule.minCap));
  if (hasBound(rule.maxCap)) next = Math.min(next, Number(rule.maxCap));
  return next;
}

function applyRuleStep(value, rule = {}) {
  const step = numberOr(rule.step, 1);
  const next = rule.stepMode === 'percent'
    ? value + roundByMode(value * (step / 100), rule.rounding || 'nearest')
    : value + step;
  return capWithRule(next, rule);
}

function capWithBounds(value, item = {}) {
  let next = value;
  if (hasBound(item.min)) next = Math.max(next, Number(item.min));
  if (hasBound(item.max)) next = Math.min(next, Number(item.max));
  return next;
}

function moveRowsToward(rows = [], initialRows = [], step = -1, amount = 1, freeGroups = false, skipLevels = []) {
  const delta = numberOr(step, -1);
  const limitByRow = Math.max(1, numberOr(amount, 1));
  const skipped = new Set((Array.isArray(skipLevels) ? skipLevels : []).map(Number));
  let globalRemaining = limitByRow;
  return rows.map((row, rowIndex) => {
    let remaining = freeGroups ? limitByRow : globalRemaining;
    const initial = initialRows[rowIndex];
    const marks = (row.marks || []).map((mark, markIndex) => {
      if (remaining <= 0) return mark;
      const target = numberOr(initial?.marks?.[markIndex], 0);
      const current = numberOr(mark, 0);
      if (skipped.has(current)) return mark;
      const next = moveValueToward(current, target, delta > 0 ? 1 : -1);
      if (next !== current) remaining -= 1;
      return next;
    });
    if (!freeGroups) globalRemaining = remaining;
    return { ...row, marks };
  });
}

function moveRowsByZone(rows = [], initialRows = [], rule = {}) {
  const rowRules = rule.boxRows || {};
  const reduceScopedRows = (sourceRows, sourceInitialRows, rowRule = {}) => {
    const amount = Math.max(1, numberOr(rowRule.amount, rule.amount ?? 1));
    const levels = Math.max(1, numberOr(rowRule.levels, Math.abs(rule.step ?? 1)));
    const maxLevel = hasBound(rowRule.maxLevel) ? Number(rowRule.maxLevel) : Infinity;
    const candidates = sourceRows.flatMap((row, rowIndex) => (row.marks || []).map((mark, markIndex) => ({
      rowIndex,
      markIndex,
      current: numberOr(mark, 0),
    }))).filter((item) => item.current > 0 && item.current <= maxLevel)
      .sort((a, b) => a.current - b.current || a.rowIndex - b.rowIndex || a.markIndex - b.markIndex)
      .slice(0, amount);
    const selected = new Map(candidates.map((item) => [`${item.rowIndex}:${item.markIndex}`, item]));
    return sourceRows.map((row, rowIndex) => ({
      ...row,
      marks: (row.marks || []).map((mark, markIndex) => {
        const item = selected.get(`${rowIndex}:${markIndex}`);
        if (!item) return mark;
        return Math.max(0, item.current - levels);
      }),
    }));
  };
  if (rowRules.__all) {
    return reduceScopedRows(rows, initialRows, rowRules.__all);
  }
  return rows.map((row, rowIndex) => {
    const rowRule = rowRules[row.id] || {};
    return reduceScopedRows([row], [initialRows[rowIndex] || { marks: [] }], rowRule)[0];
  });
}

function applyResetRule(tracker) {
  const rule = tracker.resetRule || {};
  const amount = Math.max(1, numberOr(rule.amount, 1));
  if (tracker.type === 'bar') {
    const { min, max } = trackerBounds(tracker);
    const current = numberOr(tracker.current, 0);
    if (current > max) {
      if (hasBound(rule.excessReductionPercent)) {
        const reduction = clamp(numberOr(rule.excessReductionPercent, 0), 0, 100);
        return { ...tracker, current: max + roundByMode((current - max) * (1 - reduction / 100), rule.rounding || 'nearest') };
      }
      return tracker;
    }
    return { ...tracker, current: clamp(current + numberOr(rule.step, 0), min, max) };
  }
  if (rule.mode !== 'delta' && rule.mode !== 'boxDelta') {
    if (isBoxesTracker(tracker)) {
      const initialRows = tracker.initialRows?.length ? tracker.initialRows : tracker.rows || [];
      if (rule.boxRows && Object.keys(rule.boxRows).length) return { ...tracker, rows: moveRowsByZone(tracker.rows || [], initialRows, rule) };
      return { ...tracker, rows: moveRowsToward(tracker.rows || [], initialRows, rule.step ?? -1, amount, isBoxesFreeTracker(tracker), rule.skipLevels) };
    }
    if (tracker.type === 'number') {
      const counterRules = rule.counterRules || {};
      if (!Object.keys(counterRules).length) {
        return {
          ...tracker,
          current: applyRuleStep(numberOr(tracker.current, 0), rule),
          counters: (tracker.counters || []).map((counter) => ({ ...counter, current: applyRuleStep(numberOr(counter.current, 0), rule) })),
        };
      }
      const mainRule = counterRules.__main || {};
      const applyCounterRule = (value, itemRule = {}, bounds = {}) => {
        const flat = numberOr(itemRule.flat, 0);
        const percent = numberOr(itemRule.percent, 0);
        const next = value + flat + roundByMode(value * (percent / 100), rule.rounding || 'nearest');
        return capWithBounds(next, bounds);
      };
      return {
        ...tracker,
        current: applyCounterRule(numberOr(tracker.current, 0), mainRule, tracker),
        counters: (tracker.counters || []).map((counter) => ({ ...counter, current: applyCounterRule(numberOr(counter.current, 0), counterRules[counter.id] || {}, counter) })),
      };
    }
    if (isPointsTracker(tracker)) {
      const step = Math.abs(numberOr(rule.step, 1));
      if (rule.pointsAutoMode === 'increase') return applyDelta(tracker, step);
      if (rule.pointsAutoMode === 'decrease') return applyDelta(tracker, -step);
      const target = numberOr(tracker.initial, 0);
      const cyclesTarget = numberOr(tracker.cyclesInitial, 0);
      return {
        ...tracker,
        current: moveValueToward(numberOr(tracker.current, 0), target, numberOr(tracker.current, 0) <= target ? step : -step),
        cycles: tracker.cycles,
      };
    }
    if (isNumericTracker(tracker) && tracker.type !== 'clock') {
      const current = numberOr(tracker.current, 0);
      const target = numberOr(tracker.initial, 0);
      return { ...tracker, current: moveValueToward(current, target, rule.step ?? 1) };
    }
    return tracker;
  }
  if (isBoxesTracker(tracker)) {
    const rows = tracker.rows || [];
    const targetRowId = rule.targetRowId || rows[0]?.id;
    let restants = amount;
    const rowsNext = rows.map((row) => {
      if (isBoxesFreeTracker(tracker) && row.id !== targetRowId) return row;
      const marks = [...(row.marks || [])];
      for (let index = 0; index < marks.length && restants > 0; index += 1) {
        const courant = numberOr(marks[index], 0);
        if (courant <= 0) continue;
        marks[index] = Math.max(0, courant - 1);
        restants -= 1;
      }
      return { ...row, marks };
    });
    return applyResetAfter(tracker, { ...tracker, rows: rowsNext }, rule.after);
  }
  if (isNumericTracker(tracker)) {
    if (tracker.type === 'clock') return tracker;
    const next = applyDelta(tracker, numberOr(rule.delta, 1));
    return applyResetAfter(tracker, next, rule.after);
  }
  return resetTracker(tracker);
}

export function resetTracker(tracker, mode = tracker.resetMode || 'initial') {
  if (isBoxesTracker(tracker)) {
    const initialRows = tracker.initialRows?.length ? tracker.initialRows : tracker.rows || [];
    return { ...tracker, rows: resetRows(tracker.rows || [], mode, initialRows) };
  }
  if (isPointsTracker(tracker)) {
    const { min, max } = trackerBounds(tracker);
    const current = mode === 'zero' ? min : mode === 'max' ? max : numberOr(tracker.initial, min);
    return { ...tracker, current, cycles: numberOr(tracker.cyclesInitial, 0) };
  }
  if (tracker.type === 'bar' || tracker.type === 'clock') {
    const { min, max } = trackerBounds(tracker);
    const current = mode === 'zero' ? 0 : mode === 'max' ? max : numberOr(tracker.initial, min);
    return { ...tracker, current, cycles: numberOr(tracker.cyclesInitial, 0) };
  }
  if (tracker.type === 'number') {
    const current = mode === 'zero' ? 0 : mode === 'max' && hasBound(tracker.max) ? Number(tracker.max) : numberOr(tracker.initial, 0);
    return { ...tracker, current, counters: (tracker.counters || []).map((counter) => ({ ...counter, current: mode === 'zero' ? 0 : numberOr(counter.initial, counter.current || 0) })) };
  }
  return { ...tracker };
}

export function resetAutoTrackers(participant, trigger) {
  return {
    ...participant,
    trackers: (participant.trackers || []).map((tracker) => tracker.autoReset === trigger && !tracker.autoResetPaused ? applyResetRule(tracker) : tracker),
  };
}

export function applyDelta(tracker, delta) {
  let current = numberOr(tracker.current, 0) + numberOr(delta, 0);
  if (!isNumericTracker(tracker)) return { ...tracker, current };
  if (tracker.type === 'number') return { ...tracker, current };
  const mode = trackerLimitMode(tracker);
  const { min, max } = trackerBounds(tracker);
  let cycles = numberOr(tracker.cycles, 0);
  if (tracker.type === 'bar') {
    if (tracker.minAbsolute) current = Math.max(current, min);
    if (tracker.maxAbsolute) current = Math.min(current, max);
    return { ...tracker, current };
  }
  if (isPointsTracker(tracker) && mode === 'loop') {
    const span = Math.max(1, max - min + 1);
    const before = current;
    const nextCycles = cycles + Math.floor((before - min) / span);
    if (hasBound(tracker.cyclesMax) && nextCycles > Number(tracker.cyclesMax)) {
      return { ...tracker, current: max, cycles: Number(tracker.cyclesMax) };
    }
    if (hasBound(tracker.cyclesMin) && nextCycles < Number(tracker.cyclesMin)) {
      return { ...tracker, current: min, cycles: Number(tracker.cyclesMin) };
    }
    cycles = nextCycles;
    current = ((current - min) % span + span) % span + min;
    return { ...tracker, current, cycles };
  }
  if (tracker.type === 'clock' && mode === 'increment') {
    const span = Math.max(1, max - min);
    if (trackerDirection(tracker) === 'countdown') {
      while (current <= min) { current += span; cycles -= 1; }
    } else {
      while (current >= max) { current -= span; cycles += 1; }
    }
    return { ...tracker, current, cycles };
  }
  if (mode === 'clamp' || mode === 'manual') current = clamp(current, min, max);
  return { ...tracker, current };
}

export function normalizeThresholds(thresholds = []) {
  return (Array.isArray(thresholds) ? thresholds : []).map((threshold) => {
    if (threshold == null || typeof threshold !== 'object') return null;
    const value = Number(threshold.value);
    const label = String(threshold.label || '').trim();
    const color = ['green', 'amber', 'red', 'blue', 'violet', 'neutral'].includes(threshold.color) ? threshold.color : 'neutral';
    const operator = ['gte', 'lte', 'eq'].includes(threshold.operator) ? threshold.operator : '';
    const counterId = threshold.counterId ? String(threshold.counterId) : '';
    return Number.isFinite(value) && label ? { value, label, color, operator, counterId } : null;
  }).filter(Boolean).sort((a, b) => a.value - b.value);
}

function thresholdMatches(tracker, threshold, value) {
  const operator = threshold.operator || (trackerDirection(tracker) === 'countdown' ? 'lte' : 'gte');
  if (operator === 'lte') return value <= threshold.value;
  if (operator === 'eq') return value === threshold.value;
  return value >= threshold.value;
}

function thresholdFor(tracker, thresholds, value) {
  const normalized = normalizeThresholds(thresholds);
  const matches = normalized.filter((threshold) => thresholdMatches(tracker, threshold, value));
  if (trackerDirection(tracker) === 'countdown') return matches.sort((a, b) => a.value - b.value)[0] || null;
  return matches.sort((a, b) => b.value - a.value)[0] || null;
}

export function activeThresholds(tracker) {
  if (!isNumericTracker(tracker)) return null;
  const current = numberOr(tracker.current, 0);
  const total = numberOr(tracker.cycles, 0);
  if (tracker.type === 'number') {
    const counters = [{ id: '__main', current }, ...(tracker.counters || []).map((counter) => ({ id: counter.id, current: numberOr(counter.current, 0) }))];
    return normalizeThresholds(tracker.thresholds).map((threshold) => {
      const target = threshold.counterId || '__main';
      const counter = counters.find((item) => item.id === target) || counters[0];
      return thresholdMatches(tracker, threshold, counter.current) ? { ...threshold, counterId: target } : null;
    }).filter(Boolean);
  }
  if (isPointsTracker(tracker) || tracker.type === 'clock') {
    return [
      thresholdFor(tracker, tracker.currentThresholds || tracker.thresholds, current),
      thresholdFor(tracker, tracker.totalThresholds, total) ? { ...thresholdFor(tracker, tracker.totalThresholds, total), total: true } : null,
    ].filter(Boolean);
  }
  const threshold = thresholdFor(tracker, tracker.thresholds, current);
  return threshold ? [threshold] : [];
}

export function activeThreshold(tracker) {
  return activeThresholds(tracker)?.[0] || null;
}

export function sortedBoxMarks(tracker) {
  const rows = tracker.rows || [];
  const marks = rows.flatMap((row) => row.marks || []);
  const priorities = tracker.levelPriorities || [];
  return [...marks].sort((a, b) => {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    const pa = numberOr(priorities[a - 1], a);
    const pb = numberOr(priorities[b - 1], b);
    return pb - pa;
  });
}

export function sortedMarksForRow(tracker, row) {
  return sortedBoxMarks({ ...tracker, rows: [row] });
}

export function boxVisualRank(mark, max) {
  const value = numberOr(mark, 0);
  const levels = clamp(numberOr(max, 5), 1, 5);
  if (!value) return 0;
  const ranksByLevel = { 1: [5], 2: [2, 5], 3: [1, 2, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5] };
  return ranksByLevel[levels][Math.min(value, levels) - 1] || 5;
}

export function cycleBoxMark(mark, max) {
  return (numberOr(mark, 0) + 1) % (numberOr(max, 1) + 1);
}

export function tickStatuses(statuses = []) {
  return statuses.flatMap((status) => {
    if (status.duration == null) return [status];
    if (status.expired) return status.loop ? [{ ...status, remaining: status.duration, expired: false }] : [];
    const remaining = Math.max(0, numberOr(status.remaining, status.duration) - 1);
    return [{ ...status, remaining, expired: remaining <= 0 }];
  });
}

export function untickStatuses(statuses = []) {
  return statuses.map((status) => {
    if (status.duration == null) return status;
    if (status.expired) return { ...status, remaining: 1, expired: false };
    if (status.loop && numberOr(status.remaining, status.duration) >= numberOr(status.duration, 1)) return { ...status, remaining: 0, expired: true };
    const remaining = Math.min(numberOr(status.duration, 1), numberOr(status.remaining, status.duration) + 1);
    return { ...status, remaining, expired: false };
  });
}

export function tickParticipant(participant) {
  return { ...participant, statuses: tickStatuses(participant.statuses), trackers: (participant.trackers || []).map((tracker) => tracker.type === 'clock' && tracker.auto && !tracker.frozen ? applyDelta(tracker, trackerDirection(tracker) === 'countdown' ? -1 : 1) : tracker) };
}

export function untickParticipant(participant) {
  return { ...participant, statuses: untickStatuses(participant.statuses), trackers: (participant.trackers || []).map((tracker) => tracker.type === 'clock' && tracker.auto && !tracker.frozen ? applyDelta(tracker, trackerDirection(tracker) === 'countdown' ? 1 : -1) : tracker) };
}

export function nextTurnInfo(scene, blocked = false) {
  const participants = scene.participants || [];
  const currentIndex = Math.max(0, participants.findIndex((p) => p.id === scene.activeId));
  const nextIndex = participants.length ? (currentIndex + 1) % participants.length : 0;
  return { currentIndex, nextIndex, nextStartsRound: participants.length > 0 && nextIndex === 0 && currentIndex !== 0 && !blocked };
}

function makeBaseDefaultCampaign() {
  return {
    version: '0.1.5',
    initiativeRules: { startRound: 0 },
    scenes: [
      {
        id: 'entrepot', title: 'Entrepôt sous la pluie', type: 'Combat', round: -1, activeId: 'ombre', reserveOpen: true,
        notes: 'Scène de démo volontairement chargée : préparation, surprise, égalités d’initiative, départage, catégories et suivis variés.',
        reserveNotes: 'Tester ici : rejoindre l’initiative, ordre des catégories et retri instantané.',
        globalTracker: { enabled: true, name: 'Menace', mode: 'clock', current: 3, max: 10, auto: true },
        reserve: [
          { id: 'contact', name: 'Contact paniqué', kind: 'Allié', symbol: '🕯', color: 'pink', initiative: 7, departage: '', description: 'Réserve prête à rejoindre l’initiative.', stats: ['Fragile'], statuses: [{ id: 'reserve-status', name: 'Caché', duration: null, remaining: null, loop: false, expired: false }], trackers: [{ id: 'contact-stress', type: 'dots', name: 'Panique', visible: true, current: 1, max: 4 }] },
          { id: 'tourelle', name: 'Tourelle inactive', kind: 'Environnement', symbol: '⚙', color: 'amber', initiative: 6, departage: 2, description: 'Tester environnement rejoignant l’initiative.', stats: [], statuses: [], trackers: [{ id: 'turret-clock', type: 'clock', name: 'Réactivation', visible: true, current: 2, max: 4, auto: false }] },
        ],
        participants: [
          { id: 'ombre', name: 'Ombre de Lune', kind: 'PJ', symbol: '●●', color: 'slate', initiative: 8, departage: 2, description: 'Même initiative que plusieurs autres pour tester le départage.', stats: ['Défense 3'], statuses: [{ id: 's1', name: 'À couvert', duration: null, remaining: null, loop: false, expired: false }], trackers: [{ id: 'b1', type: 'boxes', name: 'Blessures', visible: true, fillLevels: 5, rows: [{ id: 'r1', label: 'Superf.', marks: [0, 1, 2, 3, 4, 5] }] }] },
          { id: 'vigile', name: 'Chef des vigiles', kind: 'Opposant', symbol: '⚔', color: 'red', initiative: 8, departage: 1, description: 'Même initiative mais départage plus faible.', stats: ['Défense 2'], statuses: [], trackers: [{ id: 'pv', type: 'bar', name: 'PV', visible: true, current: 32, min: 0, max: 50, step: 5, minAbsolute: true, maxAbsolute: false }] },
          { id: 'mercenaire', name: 'Mercenaire allié', kind: 'Allié', symbol: '🛡', color: 'emerald', initiative: 8, departage: '', description: 'Même initiative sans départage.', stats: [], statuses: [], trackers: [{ id: 'stress', type: 'dots', name: 'Stress', visible: true, current: 2, max: 5 }] },
          { id: 'incendie', name: 'Incendie rampant', kind: 'Environnement', symbol: '🔥', color: 'orange', initiative: 8, departage: '', description: 'Égalité parfaite pour tester l’ordre des catégories.', stats: [], statuses: [], trackers: [{ id: 'fire-clock', type: 'clock', name: 'Propagation', visible: true, current: 4, max: 6, auto: true }] },
          { id: 'renforts', name: 'Renforts en approche', kind: 'Environnement', symbol: '⏳', color: 'amber', initiative: 3, departage: '', description: 'Horloge environnementale proche de la fin.', stats: [], statuses: [], trackers: [{ id: 'clock', type: 'clock', name: 'Arrivée', visible: true, current: 5, max: 6, auto: true }] },
        ],
      },
      {
        id: 'conseil', title: 'Conseil sous tension', type: 'Négociation', round: -1, activeId: '', reserveOpen: true,
        temporalite: temporalityModes.FLEXIBLE,
        notes: 'Exemple pour tester le mode souple : le MJ coche librement qui a déjà pris la parole. Dans Règles, basculer en Round 1 direct permet de comparer le départ.',
        reserveNotes: 'Les observateurs peuvent rejoindre la scène si la discussion dégénère.',
        globalTracker: { enabled: true, name: 'Tension', mode: 'clock', current: 1, max: 6, auto: false },
        jouesSouples: [], historiqueSouple: [],
        reserve: [
          { id: 'scribe', name: 'Scribe nerveux', kind: 'Allié', symbol: '📜', color: 'amber', initiative: 0, departage: '', description: 'Prend des notes, peut révéler un détail.', stats: ['Observateur'], statuses: [], trackers: [{ id: 'scribe-stress', type: 'dots', name: 'Nervosité', visible: true, current: 1, max: 4 }] },
          { id: 'garde-porte', name: 'Garde à la porte', kind: 'Opposant', symbol: '🛡', color: 'slate', initiative: 0, departage: '', description: 'Intervient seulement si la salle s’agite.', stats: ['Patient'], statuses: [], trackers: [{ id: 'alerte-garde', type: 'clock', name: 'Alerte', visible: true, current: 0, max: 4, auto: false }] },
        ],
        participants: [
          { id: 'diplomate', name: 'Diplomate tenace', kind: 'PJ', symbol: '🗝', color: 'blue', initiative: 12, departage: 2, description: 'Veut maintenir le dialogue ouvert.', stats: ['Influence 2'], statuses: [], trackers: [{ id: 'aplomb', type: 'dots', name: 'Aplomb', visible: true, current: 3, max: 5 }] },
          { id: 'ancienne', name: 'Ancienne méfiante', kind: 'Allié', symbol: '🕯', color: 'violet', initiative: 10, departage: 1, description: 'Aide si on lui laisse le temps de parler.', stats: ['Mémoire'], statuses: [{ id: 'mefiante', name: 'Méfiante', duration: null, remaining: null, loop: false, expired: false }], trackers: [{ id: 'confiance', type: 'bar', name: 'Confiance', visible: true, current: 8, min: 0, max: 15, step: 1, minAbsolute: true, maxAbsolute: true }] },
          { id: 'emissaire', name: 'Émissaire hostile', kind: 'Opposant', symbol: '⚔', color: 'red', initiative: 11, departage: 3, description: 'Cherche à provoquer une rupture.', stats: ['Pression'], statuses: [], trackers: [{ id: 'influence', type: 'bar', name: 'Influence', visible: true, current: 12, min: 0, max: 20, step: 2, minAbsolute: true, maxAbsolute: false }] },
          { id: 'rumeur', name: 'Rumeur dans la salle', kind: 'Environnement', symbol: '☁', color: 'pink', initiative: 6, departage: '', description: 'Fait monter la tension quand elle progresse.', stats: [], statuses: [], trackers: [{ id: 'rumeur-clock', type: 'clock', name: 'Propagation', visible: true, current: 2, max: 6, auto: false }] },
        ],
      },
      {
        id: 'poursuite', title: 'Poursuite sur les toits', type: 'Action', round: -1, phase: 1, activeId: 'coursiere', reserveOpen: false,
        temporalite: temporalityModes.PHASES,
        phaseDecrement: 10,
        phaseRerollEachRound: false,
        notes: 'Exemple pour tester les phases : 23 / 14 / 8 donne trois phases avant le nouveau round.',
        reserveNotes: 'La réserve reste à 0 et sert à tester l’entrée tardive.',
        globalTracker: { enabled: true, name: 'Distance', mode: 'clock', current: 2, max: 8, auto: true },
        reserve: [
          { id: 'passants', name: 'Passants affolés', kind: 'Environnement', symbol: '☁', color: 'cyan', initiative: 0, departage: '', description: 'Obstacle possible si la course redescend dans la rue.', stats: [], statuses: [], trackers: [{ id: 'foule', type: 'clock', name: 'Panique', visible: true, current: 1, max: 5, auto: false }] },
        ],
        participants: [
          { id: 'coursiere', name: 'Coursière des toits', kind: 'PJ', symbol: '🗡', color: 'emerald', initiative: 23, departage: 2, description: 'Très rapide : agit en phase 1, 2 et 3.', stats: ['Agile'], statuses: [], trackers: [{ id: 'souffle-coursiere', type: 'dots', name: 'Souffle', visible: true, current: 1, max: 5 }] },
          { id: 'traqueur', name: 'Traqueur masqué', kind: 'Opposant', symbol: '🏹', color: 'red', initiative: 14, departage: 3, description: 'Reste dangereux en phase 2.', stats: ['Précis'], statuses: [], trackers: [{ id: 'pv-traqueur', type: 'bar', name: 'PV', visible: true, current: 18, min: 0, max: 25, step: 5, minAbsolute: true, maxAbsolute: false }] },
          { id: 'vigie', name: 'Vigie alliée', kind: 'Allié', symbol: '🔮', color: 'blue', initiative: 8, departage: 1, description: 'Agit seulement en première phase.', stats: ['Soutien'], statuses: [], trackers: [{ id: 'focus-vigie', type: 'number', name: 'Focus', visible: true, current: 2, step: 1, min: 0, max: 4, minAbsolute: true, maxAbsolute: true }] },
          { id: 'toits', name: 'Tuiles glissantes', kind: 'Environnement', symbol: '⚙', color: 'amber', initiative: 5, departage: '', description: 'Danger lent mais régulier.', stats: [], statuses: [], trackers: [{ id: 'chute-clock', type: 'clock', name: 'Chute', visible: true, current: 3, max: 6, auto: true }] },
        ],
      },
    ],
  };
}

function enrichDefaultCampaign(campaign) {
  return {
    ...campaign,
    version: '0.2.8',
    scenes: (campaign.scenes || []).map((scene) => {
      if (scene.id !== 'entrepot') return scene;
      return {
        ...scene,
        notes: 'Scene de demo chargee pour tester les 5 types de suivis : barre, puces, compteur, horloge et cases, avec leurs sous-options utiles en partie.',
        participants: (scene.participants || []).map((participant) => {
          if (participant.id === 'ombre') return {
            ...participant,
            trackers: [
              { id: 'ombre-equipement', type: 'boxes', boxMode: 'free', name: 'Equipement', visible: true, secret: false, fillLevels: 1, rows: [{ id: 'eq1', label: 'Fumigenes', marks: [1, 0] }, { id: 'eq2', label: 'Crochets', marks: [1, 1, 0] }, { id: 'eq3', label: 'Relique scellee', marks: [0] }] },
              { id: 'ombre-corruption', type: 'bar', name: 'Corruption', visible: true, secret: true, current: 2, initial: 0, min: -3, max: 10, step: 1, direction: 'progression', minAbsolute: true, maxAbsolute: true, thresholds: [{ value: 4, label: 'murmures', color: 'violet' }, { value: 8, label: 'possession proche', color: 'red' }] },
            ],
          };
          if (participant.id === 'vigile') return {
            ...participant,
            trackers: [
              { id: 'pv', type: 'bar', name: 'PV', visible: true, current: 32, initial: 50, min: 0, max: 50, step: 5, direction: 'countdown', thresholds: [{ value: 25, label: 'blesse', color: 'amber' }, { value: 10, label: 'critique', color: 'red' }, { value: 0, label: 'hors combat', color: 'red' }], minAbsolute: true, maxAbsolute: true },
              { id: 'munitions', type: 'points', name: 'Munitions', visible: true, current: 2, initial: 6, min: 0, max: 6, step: 1, direction: 'countdown', limitMode: 'loop', cycles: 1, cyclesInitial: 1, cyclesMin: 0, cyclesMax: 3, currentThresholds: [{ value: 1, label: 'dernier tir', color: 'amber' }, { value: 0, label: 'a sec', color: 'red' }], totalThresholds: [{ value: 8, label: 'chargeur entame', color: 'blue' }, { value: 14, label: 'reserve basse', color: 'amber' }] },
            ],
          };
          if (participant.id === 'mercenaire') return {
            ...participant,
            trackers: [
              { id: 'stress', type: 'points', name: 'Stress', visible: true, current: 2, initial: 0, min: 0, max: 5, step: 1, direction: 'progression', limitMode: 'clamp', currentThresholds: [{ value: 3, label: 'tendu', color: 'amber' }, { value: 5, label: 'craque', color: 'red' }], totalThresholds: [] },
              { id: 'focus', type: 'number', name: 'Ressources', visible: true, current: 1, initial: 1, step: 1, counters: [{ id: 'focus-main', label: 'Focus', current: 1, initial: 1, step: 1 }, { id: 'faveurs', label: 'Faveurs', current: 2, initial: 2, step: 1 }], thresholds: [{ value: 3, label: 'pret', color: 'green' }] },
            ],
          };
          if (participant.id === 'incendie') return {
            ...participant,
            trackers: [
              { id: 'fire-clock', type: 'clock', name: 'Propagation', visible: true, current: 4, initial: 0, min: 0, max: 6, step: 2, direction: 'progression', limitMode: 'manual', thresholds: [{ value: 3, label: 'fumee', color: 'amber' }, { value: 6, label: 'embrasement', color: 'red' }], auto: true },
              { id: 'degats-feu', type: 'boxes', boxMode: 'sorted', name: 'Degats du feu', visible: true, secret: false, fillLevels: 3, levelLabels: ['Leger', 'Normal', 'Grave'], levelPriorities: [1, 2, 3], rows: [{ id: 'feu-jauge', label: 'Flammes', marks: [3, 2, 1, 0, 0] }, { id: 'fumee-jauge', label: 'Fumee', marks: [2, 1, 0, 0] }] },
            ],
          };
          if (participant.id === 'renforts') return {
            ...participant,
            trackers: [
              { id: 'clock', type: 'clock', name: 'Arrivee', visible: true, current: 5, initial: 0, min: 0, max: 6, step: 1, cycles: 1, direction: 'progression', limitMode: 'increment', thresholds: [{ value: 2, label: 'rumeurs radio', color: 'blue' }, { value: 5, label: 'sirenes', color: 'amber' }, { value: 6, label: 'renforts', color: 'red' }], auto: true },
            ],
          };
          return participant;
        }),
      };
    }),
  };
}

export function makeDefaultCampaign() {
  return enrichDefaultCampaign(makeBaseDefaultCampaign());
}
