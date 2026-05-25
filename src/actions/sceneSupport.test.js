import { describe, expect, it } from 'vitest';
import { pruneRestorePoints } from './sceneSupport.js';

function point(round) {
  return { id: `r${round}`, round, title: `R${round}`, scene: { id: 'scene', round } };
}

describe('restore point retention', () => {
  it('keeps pre-initiative and thins older rounds by half every four rounds', () => {
    const points = [
      { id: 'pre', kind: 'pre-initiative', round: -1, title: 'Avant initiative', scene: { round: -1 } },
      ...Array.from({ length: 16 }, (_, index) => point(index + 1)),
    ];

    expect(pruneRestorePoints(points).map((item) => item.round)).toEqual([-1, 8, 10, 12, 13, 14, 15, 16]);
  });
});
