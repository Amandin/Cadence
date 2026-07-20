import { describe, expect, it } from 'vitest';
import { ensureRandomKitInState } from './rulePresetKits.js';
import { compileRollCode } from './rollCode.js';
import { createDefaultRandomSystemState } from './state.js';
import { executeAdHocDefinitionFromState, executeDefinitionFromState } from './useRandomSystem.js';

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

  it('executes an unsaved expert definition against the current sources', () => {
    const state = createDefaultRandomSystemState();
    const definition = compileRollCode('2d20kh1 + [mod]', {
      id: 'expert-free-roll',
      name: 'Tirage libre',
      sources: state.sources,
    });
    const definitionsBefore = state.definitions;
    const result = executeAdHocDefinitionFromState(state, definition, { mod: 2 }, {});

    expect(result).toMatchObject({
      definitionId: 'expert-free-roll',
      definitionName: 'Tirage libre',
      parameters: { mod: 2 },
    });
    expect(result.draws).toHaveLength(2);
    expect(state.definitions).toBe(definitionsBefore);
    expect(state.definitions.some((item) => item.id === definition.id)).toBe(false);
  });
});
