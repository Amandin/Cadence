export const SCENE_STREAM_SCHEMA_VERSION = 1;
export const SCENE_STREAM_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
export const SCENE_STREAM_INACTIVITY_TTL_MS = 2 * 60 * 60_000;
export const SCENE_STREAM_MAX_BATCH_CHANGES = 32;
export const SCENE_STREAM_MAX_WRITE_BYTES = 64_000;
export const SCENE_STREAM_TARGET_BATCH_BYTES = 56_000;

const SUPPORTED_INDICATOR_TYPES = new Set(['bar', 'number', 'clock', 'points', 'dots', 'boxes']);
const MAX_ABSOLUTE_VALUE = 1_000_000_000;

function isObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function text(value, fallback = '', maximumLength = 2_000) {
  return typeof value === 'string' ? value.slice(0, maximumLength) : fallback;
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && Math.abs(number) <= MAX_ABSOLUTE_VALUE ? number : fallback;
}

function optionalFiniteNumber(value) {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && Math.abs(number) <= MAX_ABSOLUTE_VALUE ? number : null;
}

function stableId(value) {
  return typeof value === 'string'
    && value.length > 0
    && value.length <= 160
    && !value.includes('\u0000');
}

function publicInitiative(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return text(value, '', 120);
}

function publicStatus(status) {
  if (!isObject(status) || status.secret === true) return null;
  return {
    id: text(status.id, '', 160),
    name: text(status.name, 'État', 240),
    duration: status.duration == null ? null : Math.max(0, finiteNumber(status.duration, 0)),
    remaining: status.remaining == null ? null : Math.max(0, finiteNumber(status.remaining, 0)),
    inactive: status.inactive === true,
    limited: status.limited === true,
    expired: status.expired === true,
    color: text(status.color, '', 40),
  };
}

function publicQuickStat(stat) {
  if (isObject(stat)) {
    const label = text(stat.label || stat.titre, '', 240);
    const value = text(stat.value || stat.valeur, '', 240);
    return label || value ? { label, value } : null;
  }
  const label = text(stat, '', 480).trim();
  return label ? { label, value: '' } : null;
}

function participantIsPlayer(scene, participant) {
  const kind = text(participant?.kind, '', 160);
  if (kind === 'PJ') return true;
  const definition = Array.isArray(scene?.participantTypes)
    ? scene.participantTypes.find((entry) => isObject(entry) && entry.name === kind)
    : null;
  return definition?.behaviorType === 'PJ' || definition?.baseType === 'PJ';
}

function indicatorIsCalculated(indicator) {
  return indicator?.calculated === true
    || indicator?.computed === true
    || indicator?.readOnly === true
    || (typeof indicator?.formula === 'string' && indicator.formula.trim() !== '');
}

function publicCounter(counter) {
  if (!isObject(counter) || !text(counter.id, '', 160)) return null;
  return {
    id: text(counter.id, '', 160),
    label: text(counter.label, 'Compteur', 240),
    min: optionalFiniteNumber(counter.min),
    max: optionalFiniteNumber(counter.max),
    step: Math.max(0.000001, Math.abs(finiteNumber(counter.step, 1))),
    size: ['compact', 'normal', 'wide'].includes(counter.size) ? counter.size : 'compact',
  };
}

function publicBoxConfiguration(indicator) {
  return (Array.isArray(indicator.blocks) ? indicator.blocks : []).flatMap((block) => {
    if (!isObject(block) || !text(block.id, '', 160)) return [];
    const lines = (Array.isArray(block.lines) ? block.lines : []).flatMap((line) => {
      if (!isObject(line) || !text(line.id, '', 160)) return [];
      const boxes = (Array.isArray(line.boxes) ? line.boxes : []).flatMap((box, index) => {
        if (!isObject(box) || !text(box.id, '', 160)) return [];
        return [{
          id: text(box.id, '', 160),
          position: Number.isInteger(Number(box.position)) ? Number(box.position) : index,
        }];
      });
      return [{
        id: text(line.id, '', 160),
        label: text(line.label, '', 240),
        boxes,
      }];
    });
    return [{
      id: text(block.id, '', 160),
      label: text(block.label, '', 240),
      lines,
    }];
  });
}

export function streamIndicatorValue(indicator) {
  const type = indicator?.type === 'dots' ? 'points' : indicator?.type;
  if (type === 'boxes') {
    return {
      boxes: (Array.isArray(indicator.blocks) ? indicator.blocks : []).flatMap((block) => (
        (Array.isArray(block?.lines) ? block.lines : []).flatMap((line) => (
          (Array.isArray(line?.boxes) ? line.boxes : []).flatMap((box) => (
            text(box?.id, '', 160)
              ? [{ id: text(box.id, '', 160), mark: Math.max(0, Math.trunc(finiteNumber(box.mark, 0))) }]
              : []
          ))
        ))
      )),
    };
  }
  if (type === 'number') {
    return {
      current: finiteNumber(indicator?.current, 0),
      counters: (Array.isArray(indicator?.counters) ? indicator.counters : []).flatMap((counter) => (
        text(counter?.id, '', 160)
          ? [{ id: text(counter.id, '', 160), current: finiteNumber(counter.current, 0) }]
          : []
      )),
    };
  }
  return {
    current: finiteNumber(indicator?.current, 0),
    ...(['clock', 'points'].includes(type) ? { cycles: finiteNumber(indicator?.cycles, 0) } : {}),
  };
}

function publicIndicator(indicator, { player }) {
  if (!isObject(indicator)
    || !SUPPORTED_INDICATOR_TYPES.has(indicator.type)
    || indicator.visible === false
    || indicator.secret === true
    || !text(indicator.id, '', 160)) return null;

  const type = indicator.type === 'dots' ? 'points' : indicator.type;
  const base = {
    id: text(indicator.id, '', 160),
    type,
    name: text(indicator.name, 'Indicateur', 240),
    writable: player && indicator.streamEditable === true && !indicatorIsCalculated(indicator),
    version: 0,
    value: streamIndicatorValue(indicator),
  };

  if (type === 'boxes') {
    return {
      ...base,
      fillLevels: Math.max(1, Math.min(5, Math.trunc(finiteNumber(indicator.fillLevels, 1)))),
      emptyLevelActive: indicator.emptyLevelActive !== false,
      levelLabels: (Array.isArray(indicator.levelLabels) ? indicator.levelLabels : []).slice(0, 5).map((label) => text(label, '', 120)),
      levelVisuals: (Array.isArray(indicator.levelVisuals) ? indicator.levelVisuals : []).slice(0, 5).map((rank) => Math.max(1, Math.min(5, Math.trunc(finiteNumber(rank, 1))))),
      blocks: publicBoxConfiguration(indicator),
    };
  }

  if (type === 'number') {
    return {
      ...base,
      min: optionalFiniteNumber(indicator.min),
      max: optionalFiniteNumber(indicator.max),
      step: Math.max(0.000001, Math.abs(finiteNumber(indicator.step, 1))),
      counterSize: ['compact', 'normal', 'wide'].includes(indicator.counterSize) ? indicator.counterSize : 'compact',
      counters: (Array.isArray(indicator.counters) ? indicator.counters : []).map(publicCounter).filter(Boolean),
    };
  }

  return {
    ...base,
    min: optionalFiniteNumber(indicator.min) ?? 0,
    max: optionalFiniteNumber(indicator.max) ?? (type === 'clock' ? 6 : type === 'points' ? 5 : 20),
    step: Math.max(0.000001, Math.abs(finiteNumber(indicator.step, 1))),
    direction: indicator.direction === 'countdown' ? 'countdown' : 'progression',
    limitMode: text(indicator.limitMode, '', 40),
    ...(['clock', 'points'].includes(type) ? {
      cyclesMin: optionalFiniteNumber(indicator.cyclesMin),
      cyclesMax: optionalFiniteNumber(indicator.cyclesMax),
    } : {}),
    ...(type === 'bar' ? {
      minAbsolute: indicator.minAbsolute !== false,
      maxAbsolute: indicator.maxAbsolute !== false,
    } : {}),
  };
}

function publicParticipant(scene, participant, placement) {
  if (!isObject(participant) || participant.secret === true || !text(participant.id, '', 160)) return null;
  const player = participantIsPlayer(scene, participant);
  return {
    id: text(participant.id, '', 160),
    name: text(participant.name, 'Personnage', 240),
    kind: text(participant.kind, '', 160),
    player,
    placement,
    symbol: text(participant.symbol, '', 40),
    color: text(participant.color, 'slate', 40),
    description: text(participant.description, '', 2_000),
    initiative: placement === 'reserve' ? '' : publicInitiative(participant.initiative),
    stats: (Array.isArray(participant.stats) ? participant.stats : []).map(publicQuickStat).filter(Boolean),
    statuses: (Array.isArray(participant.statuses) ? participant.statuses : []).map(publicStatus).filter(Boolean),
    indicators: (Array.isArray(participant.trackers) ? participant.trackers : [])
      .map((indicator) => publicIndicator(indicator, { player }))
      .filter(Boolean),
  };
}

function publicGlobalIndicator(indicator) {
  if (!isObject(indicator) || indicator.enabled !== true || indicator.secret === true) return null;
  const mode = ['clock', 'counter', 'timer', 'stopwatch'].includes(indicator.mode) ? indicator.mode : 'counter';
  return {
    name: text(indicator.name, 'Indicateur de scène', 240),
    mode,
    current: finiteNumber(indicator.current, 0),
    total: finiteNumber(indicator.total, finiteNumber(indicator.current, 0)),
    max: Math.max(1, finiteNumber(indicator.max, 1)),
    direction: indicator.direction === 'countdown' ? 'countdown' : 'progression',
    running: ['timer', 'stopwatch'].includes(mode) && indicator.running === true,
  };
}

/**
 * The only server-authoritative projection allowed to cross the public stream API.
 * It is deliberately assembled from allowlists: no source object is spread.
 */
export function buildSharedSceneView(scene) {
  if (!isObject(scene) || !text(scene.id, '', 160)) return null;
  const participants = (Array.isArray(scene.participants) ? scene.participants : [])
    .map((participant) => publicParticipant(scene, participant, 'scene'))
    .filter(Boolean);
  const reserve = (Array.isArray(scene.reserve) ? scene.reserve : [])
    .map((participant) => publicParticipant(scene, participant, 'reserve'))
    .filter(Boolean);
  const visibleParticipantIds = new Set([...participants, ...reserve].map((participant) => participant.id));
  return {
    schemaVersion: SCENE_STREAM_SCHEMA_VERSION,
    scene: {
      id: text(scene.id, '', 160),
      title: text(scene.title, 'Scène', 240),
      type: text(scene.type, '', 240),
      round: Math.max(-1, Math.trunc(finiteNumber(scene.round, -1))),
      phase: Math.max(1, Math.trunc(finiteNumber(scene.phase, 1))),
      activeId: visibleParticipantIds.has(scene.activeId) ? text(scene.activeId, '', 160) : '',
      statuses: (Array.isArray(scene.statuses) ? scene.statuses : []).map(publicStatus).filter(Boolean),
      globalIndicator: publicGlobalIndicator(scene.globalTracker),
      participants,
      reserve,
    },
  };
}

export function validateStreamSceneIdentities(scene) {
  if (!isObject(scene) || !stableId(scene.id)) {
    return { ok: false, code: 'SCENE_ID_REQUIRED' };
  }
  const participantIds = new Set();
  const participants = Array.isArray(scene.participants) ? scene.participants : [];
  const reserve = Array.isArray(scene.reserve) ? scene.reserve : [];
  for (const participant of [...participants, ...reserve]) {
    const participantId = participant?.id;
    if (!stableId(participantId)) return { ok: false, code: 'PARTICIPANT_ID_REQUIRED' };
    if (participantIds.has(participantId)) return { ok: false, code: 'PARTICIPANT_ID_DUPLICATE' };
    participantIds.add(participantId);
    const indicatorIds = new Set();
    for (const indicator of Array.isArray(participant?.trackers) ? participant.trackers : []) {
      const indicatorId = indicator?.id;
      if (!stableId(indicatorId)) return { ok: false, code: 'INDICATOR_ID_REQUIRED' };
      if (indicatorIds.has(indicatorId)) return { ok: false, code: 'INDICATOR_ID_DUPLICATE' };
      indicatorIds.add(indicatorId);
      if (indicator?.type === 'number') {
        const counterIds = new Set();
        for (const counter of Array.isArray(indicator.counters) ? indicator.counters : []) {
          const counterId = counter?.id;
          if (!stableId(counterId) || counterIds.has(counterId)) return { ok: false, code: 'COUNTER_ID_INVALID' };
          counterIds.add(counterId);
        }
      }
      if (indicator?.type === 'boxes') {
        const boxIds = new Set();
        for (const block of Array.isArray(indicator.blocks) ? indicator.blocks : []) {
          for (const line of Array.isArray(block?.lines) ? block.lines : []) {
            for (const box of Array.isArray(line?.boxes) ? line.boxes : []) {
              const boxId = box?.id;
              if (!stableId(boxId) || boxIds.has(boxId)) return { ok: false, code: 'BOX_ID_INVALID' };
              boxIds.add(boxId);
            }
          }
        }
      }
    }
  }
  return { ok: true };
}

export function streamIndicatorKey(participantId, indicatorId) {
  return JSON.stringify([String(participantId), String(indicatorId)]);
}

export function sharedViewIndicators(view) {
  const scene = view?.scene;
  if (!scene) return [];
  return [...(scene.participants || []), ...(scene.reserve || [])].flatMap((participant) => (
    (participant.indicators || []).map((indicator) => ({
      participantId: participant.id,
      participant,
      indicator,
      key: streamIndicatorKey(participant.id, indicator.id),
    }))
  ));
}

export function findSharedIndicator(view, participantId, indicatorId) {
  return sharedViewIndicators(view).find((entry) => (
    entry.participantId === participantId && entry.indicator.id === indicatorId
  )) || null;
}

export function streamViewConfiguration(view) {
  if (!view?.scene) return view;
  const stripParticipant = (participant) => ({
    ...participant,
    indicators: (participant.indicators || []).map(({ value, version, ...indicator }) => indicator),
  });
  return {
    ...view,
    scene: {
      ...view.scene,
      participants: (view.scene.participants || []).map(stripParticipant),
      reserve: (view.scene.reserve || []).map(stripParticipant),
    },
  };
}

export function hydrateSharedView(view, states = []) {
  if (!view?.scene) return view;
  const byKey = new Map(states.map((state) => [
    streamIndicatorKey(state.participantId, state.indicatorId),
    state,
  ]));
  const hydrateParticipant = (participant) => ({
    ...participant,
    indicators: (participant.indicators || []).map((indicator) => {
      const state = byKey.get(streamIndicatorKey(participant.id, indicator.id));
      if (!state) return indicator;
      return {
        ...indicator,
        writable: state.writable === true || state.writable === 1,
        version: Number(state.version || 0),
        value: isObject(state.value) ? state.value : indicator.value,
      };
    }),
  });
  return {
    ...view,
    scene: {
      ...view.scene,
      participants: (view.scene.participants || []).map(hydrateParticipant),
      reserve: (view.scene.reserve || []).map(hydrateParticipant),
    },
  };
}

function normalizedNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && Math.abs(number) <= MAX_ABSOLUTE_VALUE ? number : null;
}

function withinConfiguredBounds(value, minimum, maximum) {
  if (minimum != null && value < Number(minimum)) return false;
  if (maximum != null && value > Number(maximum)) return false;
  return true;
}

function exactValueList(source, expectedIds, valueKey, normalizeValue) {
  if (!Array.isArray(source) || source.length !== expectedIds.length) return null;
  const byId = new Map();
  for (const item of source) {
    if (!isObject(item) || typeof item.id !== 'string' || byId.has(item.id)) return null;
    const normalized = normalizeValue(item[valueKey]);
    if (normalized == null) return null;
    byId.set(item.id, normalized);
  }
  if (expectedIds.some((id) => !byId.has(id))) return null;
  return expectedIds.map((id) => ({ id, [valueKey]: byId.get(id) }));
}

/**
 * Validates a guest value against the already-filtered indicator definition.
 * Only value slots are accepted; structure and configuration cannot be changed.
 */
export function normalizeStreamIndicatorValue(indicator, value) {
  if (!isObject(indicator) || !isObject(value)) return null;
  if (indicator.type === 'boxes') {
    const expectedIds = (indicator.blocks || []).flatMap((block) => (
      (block.lines || []).flatMap((line) => (line.boxes || []).map((box) => box.id))
    ));
    const maximum = Math.max(1, Number(indicator.fillLevels || 1));
    const boxes = exactValueList(value.boxes, expectedIds, 'mark', (mark) => {
      const number = Number(mark);
      return Number.isInteger(number) && number >= 0 && number <= maximum ? number : null;
    });
    return boxes ? { boxes } : null;
  }

  const current = normalizedNumber(value.current);
  if (current == null) return null;
  if (indicator.type === 'number') {
    if (!withinConfiguredBounds(current, indicator.min, indicator.max)) return null;
    const counterIds = (indicator.counters || []).map((counter) => counter.id);
    const counters = exactValueList(value.counters, counterIds, 'current', normalizedNumber);
    if (counters && counters.some((counter) => {
      const definition = (indicator.counters || []).find((entry) => entry.id === counter.id);
      return !withinConfiguredBounds(counter.current, definition?.min, definition?.max);
    })) return null;
    return counters ? { current, counters } : null;
  }
  if (indicator.type === 'clock' || indicator.type === 'points') {
    const cycles = normalizedNumber(value.cycles);
    if (cycles == null) return null;
    if (indicator.type === 'points'
      && !withinConfiguredBounds(current, indicator.min, indicator.max)) return null;
    if (indicator.type === 'clock'
      && indicator.limitMode !== 'overflow'
      && !withinConfiguredBounds(current, indicator.min, indicator.max)) return null;
    if (!withinConfiguredBounds(cycles, indicator.cyclesMin, indicator.cyclesMax)) return null;
    return { current, cycles };
  }
  if (indicator.type === 'bar') {
    if (indicator.minAbsolute !== false && !withinConfiguredBounds(current, indicator.min, null)) return null;
    if (indicator.maxAbsolute !== false && !withinConfiguredBounds(current, null, indicator.max)) return null;
  }
  return { current };
}

export function applyStreamValueToTracker(tracker, value) {
  if (!isObject(tracker) || !isObject(value)) return tracker;
  const type = tracker.type === 'dots' ? 'points' : tracker.type;
  if (type === 'boxes') {
    const marks = new Map((value.boxes || []).map((box) => [box.id, box.mark]));
    return {
      ...tracker,
      blocks: (tracker.blocks || []).map((block) => ({
        ...block,
        lines: (block.lines || []).map((line) => ({
          ...line,
          boxes: (line.boxes || []).map((box) => (
            marks.has(box.id) ? { ...box, mark: marks.get(box.id) } : box
          )),
        })),
      })),
    };
  }
  if (type === 'number') {
    const counters = new Map((value.counters || []).map((counter) => [counter.id, counter.current]));
    return {
      ...tracker,
      current: value.current,
      counters: (tracker.counters || []).map((counter) => (
        counters.has(counter.id) ? { ...counter, current: counters.get(counter.id) } : counter
      )),
    };
  }
  return {
    ...tracker,
    current: value.current,
    ...(['clock', 'points'].includes(type) ? { cycles: value.cycles } : {}),
  };
}

export function sceneStreamSignature(scene) {
  return JSON.stringify(buildSharedSceneView(scene));
}
