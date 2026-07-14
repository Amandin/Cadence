import { describe, expect, it } from 'vitest';
import { createBlankParticipant, instantiateTemplate, instantiateTrackerCopy, makeInitiativeTextPreset, makeTemplateFromParticipant, mergeTemplateStores, normalizeTemplateStore, numberedCopyInsertIndex, numberedCopyName } from './templates.js';

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

describe('participant tactical roles', () => {
  it('defaults blank and legacy template participants to the normal role', () => {
    expect(createBlankParticipant()).toMatchObject({ tacticalRole: 'normal' });

    const legacy = normalizeTemplateStore({
      templates: [{ name: 'Ancien modele', category: 'PNJ', participant: { name: 'Ancien modele', kind: 'Creature maison' } }],
    });
    expect(legacy.templates[0].participant).toMatchObject({ kind: 'Creature maison', tacticalRole: 'normal' });
    expect(instantiateTemplate(legacy.templates[0])).toMatchObject({ kind: 'Creature maison', tacticalRole: 'normal' });
  });

  it('keeps the tactical role independently from the participant kind in templates', () => {
    const template = makeTemplateFromParticipant({ name: 'Hydre', kind: 'Opposant personnalise', tacticalRole: 'boss' }, { name: 'Hydre', category: 'Creatures' });
    const restored = instantiateTemplate(template);

    expect(template.participant).toMatchObject({ kind: 'Opposant personnalise', tacticalRole: 'boss' });
    expect(restored).toMatchObject({ kind: 'Opposant personnalise', tacticalRole: 'boss' });
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

describe('initiative text presets', () => {
  it('normalizes saved presets as reusable custom label configurations', () => {
    const preset = makeInitiativeTextPreset({
      enabled: true,
      preset: 'cards',
      cardSourceId: 'deck-1',
      separators: [' puis '],
      parts: [
        { label: 'Vitesse', values: ['Rapide', 'Lent'] },
        { label: 'Priorite', values: ['Haute', 'Basse'] },
      ],
    }, { name: 'Ordre maison' });

    expect(preset).toMatchObject({
      name: 'Ordre maison',
      config: {
        enabled: true,
        preset: '',
        cardSourceId: '',
        separators: [' puis '],
      },
    });
  });

  it('merges imported initiative text presets by name', () => {
    const current = normalizeTemplateStore({
      initiativeTextPresets: [{
        id: 'itpl-current',
        name: 'Ordre maison',
        config: { enabled: true, parts: [{ label: 'Vitesse', values: ['Rapide', 'Lent'] }] },
      }],
    });
    const incoming = normalizeTemplateStore({
      initiativeTextPresets: [
        {
          id: 'itpl-duplicate',
          name: 'Ordre maison',
          config: { enabled: true, parts: [{ label: 'Vitesse', values: ['Vif', 'Lent'] }] },
        },
        {
          id: 'itpl-new',
          name: 'Ordre dramatique',
          config: { enabled: true, parts: [{ label: 'Tempo', values: ['Maintenant', 'Apres'] }] },
        },
      ],
    });

    const result = mergeTemplateStores(current, incoming);

    expect(result.store.initiativeTextPresets.map((preset) => preset.name)).toEqual(['Ordre maison', 'Ordre dramatique']);
    expect(result.added).toContainEqual(expect.objectContaining({ name: 'Ordre dramatique', type: 'initiative-text' }));
    expect(result.skipped).toContainEqual(expect.objectContaining({ name: 'Ordre maison', type: 'initiative-text' }));
  });
});
