import {
  RANDOM_SYSTEM_SCHEMA_VERSION,
  createDefaultRandomSystemState,
  normalizeRandomSystemState,
} from './state.js';

export const RANDOM_SYSTEM_STORAGE_KEY = 'cadence:random-system:v1';

export function loadRandomSystemState(storage = globalThis.localStorage) {
  if (!storage) return createDefaultRandomSystemState();
  try {
    const raw = storage.getItem(RANDOM_SYSTEM_STORAGE_KEY);
    return raw ? normalizeRandomSystemState(JSON.parse(raw)) : createDefaultRandomSystemState();
  } catch {
    return createDefaultRandomSystemState();
  }
}

export function saveRandomSystemState(state, storage = globalThis.localStorage) {
  if (!storage) return false;
  try {
    const normalized = state?.schemaVersion === RANDOM_SYSTEM_SCHEMA_VERSION
      ? state
      : normalizeRandomSystemState(state);
    const compactResult = (result) => {
      if (result?.kind !== 'random-roll') return result;
      const {
        draws,
        aggregates,
        primaryAggregate,
        ...stored
      } = result;
      return {
        ...stored,
        aggregates: result.combined ? aggregates : undefined,
        primaryAggregateId: primaryAggregate?.id || result.primaryAggregateId || '',
      };
    };
    storage.setItem(RANDOM_SYSTEM_STORAGE_KEY, JSON.stringify({
      ...normalized,
      // Le premier élément de l'historique restaure le dernier résultat sans le dupliquer en stockage.
      lastResult: null,
      history: normalized.history.map(compactResult),
    }));
    return true;
  } catch {
    return false;
  }
}
