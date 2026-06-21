import { describe, expect, it } from 'vitest';
import { instantiateTrackerCopy } from './templates.js';

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
