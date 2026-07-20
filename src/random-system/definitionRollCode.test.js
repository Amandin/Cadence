import { describe, expect, it } from 'vitest';
import { createStandardSources, standardSourceIds } from './defaults.js';
import { definitionToRollCode } from './definitionRollCode.js';
import { compileRollCode } from './rollCode.js';

const sources = createStandardSources();

describe('definitionToRollCode', () => {
  it('prefills a simple die roll with its actual source and count', () => {
    const code = definitionToRollCode({
      components: [{ source: { kind: 'fixed', value: standardSourceIds.D6 }, count: { kind: 'fixed', value: 2 } }],
      pipeline: [],
    });

    expect(code).toBe('2d6');
    expect(() => compileRollCode(code, { sources })).not.toThrow();
  });

  it('uses current parameters and the selected advantage mode', () => {
    const code = definitionToRollCode({
      parameters: [{ id: 'modifier', defaultValue: 0 }],
      options: [{ id: 'mode', defaultValue: 'normal' }],
      components: [{ source: { kind: 'fixed', value: standardSourceIds.D20 }, count: { kind: 'fixed', value: 1 } }],
      pipeline: [
        { type: 'repeat-select', optionId: 'mode', variants: { advantage: { repetitions: 2, select: 'highest' } } },
        { type: 'modifier', value: { kind: 'parameter', parameterId: 'modifier' } },
      ],
    }, { parameters: { modifier: 3 }, options: { mode: 'advantage' } });

    expect(code).toBe('2d20kh1 + 3');
    expect(() => compileRollCode(code, { sources })).not.toThrow();
  });

  it('keeps the original expert syntax when the definition has one', () => {
    expect(definitionToRollCode({ code: '3d10>6' })).toBe('3d10>6');
  });
});
