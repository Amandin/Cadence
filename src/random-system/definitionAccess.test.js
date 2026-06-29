import { describe, expect, it } from 'vitest';
import { directlyExposedDefinitions } from './definitionAccess.js';

describe('RandomSystem definition access', () => {
  it('keeps internal rolls available to configuration but out of direct use', () => {
    const definitions = [
      { id: 'direct', exposed: true },
      { id: 'legacy-default' },
      { id: 'internal', exposed: false },
    ];

    expect(directlyExposedDefinitions(definitions).map((definition) => definition.id))
      .toEqual(['direct', 'legacy-default']);
    expect(definitions).toHaveLength(3);
  });

  it('always exposes combined definitions', () => {
    const combination = {
      id: 'combined',
      name: 'Combiné',
      kind: 'combination',
      exposed: false,
      options: [],
      components: [],
      pipeline: [],
    };

    expect(directlyExposedDefinitions([combination])).toHaveLength(1);
  });
});
