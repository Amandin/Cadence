import { describe, expect, it } from 'vitest';
import { instantiateTrackerCopy, numberedCopyInsertIndex, numberedCopyName } from './templates.js';

describe('numberedCopyName', () => {
  it('starts copied names at 1 and increments the suffix', () => {
    expect(numberedCopyName(['Astre'], 'Astre')).toBe('Astre 1');
    expect(numberedCopyName(['Astre', 'Astre 1', 'Astre 2'], 'Astre')).toBe('Astre 3');
  });

  it('continues the same series when duplicating an already numbered copy', () => {
    expect(numberedCopyName(['Astre', 'Astre 1'], 'Astre 1')).toBe('Astre 2');
  });

  it('continues after the largest existing suffix instead of filling old gaps', () => {
    expect(numberedCopyName(['Astre', 'Astre 2'], 'Astre')).toBe('Astre 3');
  });
});

describe('numberedCopyInsertIndex', () => {
  it('places repeated copies after the existing numbered series', () => {
    const names = ['Astre', 'Blessure'];
    for (let count = 0; count < 3; count += 1) {
      const source = names[0];
      const copyName = numberedCopyName(names, source);
      names.splice(numberedCopyInsertIndex(names, source), 0, copyName);
    }

    expect(names).toEqual(['Astre', 'Astre 1', 'Astre 2', 'Astre 3', 'Blessure']);
  });
});

describe('instantiateTrackerCopy', () => {
  it('regenerates nested ids for box trackers', () => {
    const source = {
      id: 'tracker-source',
      type: 'boxes',
      name: 'Armure',
      blocks: [{
        id: 'block-source',
        label: 'Bloc',
        lines: [{
          id: 'line-source',
          label: 'Ligne',
          boxes: [{ id: 'box-source', mark: 1 }],
        }],
      }],
    };

    const copy = instantiateTrackerCopy(source);

    expect(copy).toMatchObject({ type: 'boxes', name: 'Armure' });
    expect(copy.id).not.toBe(source.id);
    expect(copy.blocks[0].id).not.toBe(source.blocks[0].id);
    expect(copy.blocks[0].lines[0].id).not.toBe(source.blocks[0].lines[0].id);
    expect(copy.blocks[0].lines[0].boxes[0].id).not.toBe(source.blocks[0].lines[0].boxes[0].id);
  });
});
