import { describe, expect, it } from 'vitest';
import { applyTokenDraw, drawTokenTypes, moveTokenContents, normalizeTokenSystem, selectTokenIndex } from './tokens.js';

const types = [{ id: 'red', name: 'Rouge' }, { id: 'blue', name: 'Bleu' }];

describe('token containers', () => {
  it('stores only known token types and positive quantities', () => {
    const state = normalizeTokenSystem({ tokenTypes: types, tokenContainers: [{ id: 'bag', name: 'Sac', contents: { red: 2, blue: -3, unknown: 8 } }] });
    expect(state.tokenContainers[0].contents).toEqual({ red: 2 });
    expect(state.tokenContainers[0]).toMatchObject({ exposed: true, quickAccess: true });
  });

  it('never keeps quick access on a hidden container', () => {
    const state = normalizeTokenSystem({ tokenTypes: types, tokenContainers: [{ id: 'bag', exposed: false, quickAccess: true }] });
    expect(state.tokenContainers[0]).toMatchObject({ exposed: false, quickAccess: false });
  });

  it('draws without replacement', () => {
    expect(drawTokenTypes({ contents: { red: 1, blue: 2 } }, 5, () => 0)).toEqual(['red', 'blue', 'blue']);
  });

  it('moves the selected and other tokens to their destinations', () => {
    const draw = { sourceId: 'bag', count: 2, selectedDestinationId: 'player', otherDestinationId: 'bag' };
    const result = applyTokenDraw([
      { id: 'bag', contents: { red: 1, blue: 1 } },
      { id: 'player', contents: {} },
    ], draw, [0], types, Math.random, ['red', 'blue']);
    expect(result.containers.find((container) => container.id === 'bag').contents).toEqual({ blue: 1 });
    expect(result.containers.find((container) => container.id === 'player').contents).toEqual({ red: 1 });
  });

  it('replaces the oldest choice when the selection limit is reached', () => {
    expect(selectTokenIndex([0], 1, 1)).toEqual([1]);
    expect(selectTokenIndex([0, 1], 2, 2)).toEqual([1, 2]);
    expect(selectTokenIndex([1, 2], 1, 2)).toEqual([2]);
  });

  it('moves only the available quantity between containers', () => {
    const result = moveTokenContents([
      { id: 'bag', contents: { red: 2 } },
      { id: 'player', contents: { red: 1 } },
    ], 'bag', 'player', { red: 5 }, types);
    expect(result.find((container) => container.id === 'bag').contents).toEqual({});
    expect(result.find((container) => container.id === 'player').contents).toEqual({ red: 3 });
  });
});
