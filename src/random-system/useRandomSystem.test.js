import { describe, expect, it } from 'vitest';
import { ensureRandomKitInState } from './rulePresetKits.js';
import { createDefaultRandomSystemState } from './state.js';
import { executeDefinitionFromState } from './useRandomSystem.js';

describe('RandomSystem transient execution', () => {
  it('returns a result without writing history or statistics', () => {
    const state = ensureRandomKitInState(createDefaultRandomSystemState(), 'kit-d20-generic');
    const historyBefore = state.history;
    const statisticsBefore = state.statistics;
    const result = executeDefinitionFromState(
      state,
      'kit-d20-check',
      { modifier: 3 },
      { mode: 'advantage' },
    );

    expect(result).toMatchObject({
      definitionId: 'kit-d20-check',
      parameters: { modifier: 3 },
    });
    expect(result.groups).toHaveLength(2);
    expect(state.history).toBe(historyBefore);
    expect(state.history).toEqual([]);
    expect(state.statistics).toBe(statisticsBefore);
    expect(state.statistics.totalUses).toBe(0);
  });
});
