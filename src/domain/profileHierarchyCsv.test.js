import { describe, expect, it } from 'vitest';
import { profileHierarchyCsvFilename, profileHierarchyToCsv } from './profileHierarchyCsv.js';

describe('profile hierarchy CSV export', () => {
  it('exports the hierarchy, shared links and editable resource settings', () => {
    const tree = {
      id: 'root', type: 'root', label: 'Parcours', data: {}, children: [{
        id: 'initiative-a', type: 'initiative', label: 'Initiative; spéciale', refId: 'initiative/shared', data: { rulePresetId: 'rules/classic' }, children: [{
          id: 'quick-a', type: 'quickRoll', label: 'Jet rapide', refId: 'quick/shared', data: { kitId: 'kit-d20', definitionIds: ['roll/a', 'roll/b'] }, children: [],
        }],
      }],
    };

    const csv = profileHierarchyToCsv(tree);
    expect(csv).toContain('chemin;profondeur;id_etage;id_parent;type');
    expect(csv).toContain('"1. Parcours > 1. Initiative; spéciale";1;initiative-a;root;initiative;"Initiative; spéciale";initiative/shared');
    expect(csv).toContain('quick/shared');
    expect(csv).toContain('roll/a, roll/b');
  });

  it('uses a dated, transferable CSV filename', () => {
    expect(profileHierarchyCsvFilename(new Date('2026-07-14T12:00:00.000Z'))).toBe('cadence-parcours-accueil-2026-07-14.csv');
  });
});
