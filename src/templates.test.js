import { describe, expect, it } from 'vitest';
import { instantiateTrackerCopy, numberedCopyName } from './templates.js';

describe('numberedCopyName', () => {
  it('starts copied names at 1 and increments the next available suffix', () => {
    expect(numberedCopyName(['Astre'], 'Astre')).toBe('Astre 1');
    expect(numberedCopyName(['Astre', 'Astre 1', 'Astre 2'], 'Astre')).toBe('Astre 3');
  });

  it('continues the same series when duplicating an already numbered copy', () => {
    expect(numberedCopyName(['Astre', 'Astre 1'], 'Astre 1')).toBe('Astre 2');
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
