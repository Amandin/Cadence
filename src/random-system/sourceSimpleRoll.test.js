import { describe, expect, it } from 'vitest';
import { createUniformSource, executeRandomDefinition, fixedValue } from './engine.js';
import { createSimpleRollForSource } from './sourceSimpleRoll.js';
import { sourceDraft } from './ui/sourceManagerDraft.js';

describe('simple roll generated from a source', () => {
  it('creates an active, exposed one-draw roll associated with the source', () => {
    const source = createUniformSource({ id: 'omens', name: 'Présages', min: 1, max: 12 });
    const definition = createSimpleRollForSource(source);

    expect(definition).toMatchObject({
      name: 'Présages',
      sourceId: 'omens',
      exposed: true,
      active: true,
      quickAccess: true,
      components: [{ label: 'Présages', source: fixedValue('omens'), count: fixedValue(1) }],
    });
  });

  it('creates a card-draw definition for a card deck', () => {
    const deck = { id: 'deck', name: 'Tarot', kind: 'cards', cards: [{ id: 'sun', label: 'Soleil', value: 'Soleil' }] };
    const definition = createSimpleRollForSource(deck);

    expect(definition).toMatchObject({
      sourceId: 'deck',
      components: [{ source: fixedValue('deck'), sourceKind: 'cards', cardMode: 'draw' }],
    });
    expect(executeRandomDefinition({ definition, sources: [deck], rng: () => 0 }).draws[0].outcome.label).toBe('Soleil');
  });

  it('keeps the associated roll identity and availability when the source is saved again', () => {
    const source = createUniformSource({ id: 'omens', name: 'Présages', min: 1, max: 12 });
    const definition = createSimpleRollForSource(source, [], {
      id: 'omens-roll',
      active: false,
      exposed: true,
      quickAccess: false,
    });

    expect(definition).toMatchObject({
      id: 'omens-roll',
      name: 'Présages',
      sourceId: 'omens',
      active: false,
      exposed: true,
      quickAccess: false,
    });
  });

  it('keeps the source option enabled when the source is opened again', () => {
    const source = createUniformSource({ id: 'omens', name: 'Présages', min: 1, max: 12 });
    const definition = createSimpleRollForSource(source);

    expect(sourceDraft(source, [definition]).createSimpleRoll).toBe(true);
  });
});
