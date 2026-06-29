import { describe, expect, it } from 'vitest';
import {
  randomInteger,
  randomWeightedIndex,
  secureRandomFloat,
  secureRandomInteger,
} from './random.js';

function cryptoSequence(values) {
  let index = 0;
  return {
    getRandomValues(buffer) {
      for (let position = 0; position < buffer.length; position += 1) {
        buffer[position] = values[Math.min(index++, values.length - 1)];
      }
      return buffer;
    },
  };
}

describe('RandomSystem secure random source', () => {
  it('uses rejection sampling for integer ranges', () => {
    const provider = cryptoSequence([0xffffffff, 17]);
    expect(secureRandomInteger(10, provider)).toBe(7);
  });

  it('builds a deterministic 53-bit unit float from platform entropy', () => {
    const provider = cryptoSequence([0, 0x80000000]);
    expect(secureRandomFloat(provider)).toBe(0.5 / 0x200000);
  });

  it('keeps deterministic injected functions available to unit tests', () => {
    expect(randomInteger(6, () => 0)).toBe(0);
    expect(randomInteger(6, () => 0.999)).toBe(5);
    expect(randomWeightedIndex([2, 1], () => 0.8)).toBe(1);
  });
});
