import { describe, expect, it } from 'vitest';
import { prepareCombinedDefinition } from './combinations.js';
import { executeRandomDefinition } from './engine.js';
import { recordRandomResult } from './state.js';
import { RANDOM_SYSTEM_STORAGE_KEY, loadRandomSystemState, saveRandomSystemState } from './storage.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

describe('RandomSystem storage', () => {
  it('uses a dedicated storage key and never depends on campaign payloads', () => {
    const storage = memoryStorage();
    const state = loadRandomSystemState(storage);
    state.definitions = state.definitions.slice(0, 1);
    expect(saveRandomSystemState(state, storage)).toBe(true);

    const raw = JSON.parse(storage.getItem(RANDOM_SYSTEM_STORAGE_KEY));
    expect(raw).toHaveProperty('definitions');
    expect(raw).toHaveProperty('rulePool');
    expect(raw).not.toHaveProperty('scenes');
    expect(loadRandomSystemState(storage).definitions).toHaveLength(1);
  });

  it('stores roll details once and restores their convenient aliases', () => {
    const storage = memoryStorage();
    const initial = loadRandomSystemState(storage);
    const definition = initial.definitions.find((item) => item.id === 'starter-d20');
    const prepared = prepareCombinedDefinition(definition, initial.definitions, { combination: 'normal' });
    const result = executeRandomDefinition({
      definition: prepared.definition,
      sources: initial.sources,
      parameters: { modifier: 0 },
      options: { combination: 'normal' },
      rng: () => 0,
    });
    saveRandomSystemState(recordRandomResult(initial, result), storage);

    const raw = JSON.parse(storage.getItem(RANDOM_SYSTEM_STORAGE_KEY));
    expect(raw.lastResult).toBeNull();
    expect(raw.history[0]).not.toHaveProperty('draws');
    expect(raw.history[0].groups[0].draws).toHaveLength(1);

    const restored = loadRandomSystemState(storage);
    expect(restored.lastResult.draws).toHaveLength(1);
    expect(restored.lastResult.primaryAggregate.value).toBe(1);
  });
});
