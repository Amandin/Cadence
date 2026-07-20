import { describe, expect, it } from 'vitest';
import { activeCardSources, activeDefinitions, definitionsForUse, directlyExposedDefinitions, exposedTokenContainers, quickDefinitions, quickTokenContainers } from './definitionAccess.js';

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

  it('requires exposed rolls to be active before direct use', () => {
    const definitions = [
      { id: 'ready', exposed: true, active: true },
      { id: 'candidate-only', exposed: true, active: false },
      { id: 'functional-only', exposed: false, active: true },
    ];

    expect(directlyExposedDefinitions(definitions).map((definition) => definition.id))
      .toEqual(['ready', 'candidate-only']);
    expect(activeDefinitions(definitions).map((definition) => definition.id))
      .toEqual(['ready']);
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

  it('keeps quick resources as a subset of exposed resources', () => {
    const definitions = [
      { id: 'quick', exposed: true, active: true, quickAccess: true },
      { id: 'catalogue', exposed: true, active: true, quickAccess: false },
      { id: 'hidden', exposed: true, active: false, quickAccess: true },
    ];
    const containers = [
      { id: 'quick-bag', exposed: true, quickAccess: true },
      { id: 'catalogue-bag', exposed: true, quickAccess: false },
      { id: 'hidden-bag', exposed: false, quickAccess: true },
    ];
    expect(quickDefinitions(definitions).map((item) => item.id)).toEqual(['quick']);
    expect(exposedTokenContainers(containers).map((item) => item.id)).toEqual(['quick-bag', 'catalogue-bag']);
    expect(quickTokenContainers(containers).map((item) => item.id)).toEqual(['quick-bag']);
  });

  it('only exposes card sources used by active or required rolls', () => {
    const definitions = [
      { id: 'active-cards', exposed: true, active: true, components: [{ source: { kind: 'fixed', value: 'deck-54' } }], parameters: [], pipeline: [] },
      { id: 'inactive-cards', exposed: true, active: false, components: [{ source: { kind: 'fixed', value: 'tarot' } }], parameters: [], pipeline: [] },
    ];
    const sources = [
      { id: 'deck-54', kind: 'cards' },
      { id: 'tarot', kind: 'cards' },
      { id: 'd20', kind: 'uniform' },
    ];

    expect(activeCardSources(sources, definitions).map((source) => source.id)).toEqual(['deck-54']);
    expect(definitionsForUse(definitions, ['inactive-cards']).map((definition) => definition.id)).toEqual(['active-cards', 'inactive-cards']);
    expect(activeCardSources(sources, definitions, { requiredDefinitionIds: ['inactive-cards'] }).map((source) => source.id)).toEqual(['deck-54', 'tarot']);
    expect(activeCardSources(sources, definitions, { requiredSourceIds: ['tarot'] }).map((source) => source.id)).toEqual(['deck-54', 'tarot']);
  });
});
