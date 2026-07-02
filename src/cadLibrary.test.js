import { describe, expect, it } from 'vitest';
import {
  CADENCE_LIBRARY_FORMAT,
  CADENCE_LIBRARY_SCHEMA_VERSION,
  createCadenceLibraryPayload,
  importCadenceLibraryRandomKits,
  isValidCadenceLibrary,
  mergeCadenceLibraryTemplates,
  normalizeCadenceLibraryPayload,
  serializeCadenceLibrary,
} from './cadLibrary.js';
import { createDefaultRandomSystemState } from './random-system/state.js';
import { randomKitCatalog } from './random-system/rulePresetKits.js';
import { normalizeTemplateStore } from './templates.js';

const participantTemplate = {
  id: 'tpl-garde',
  name: 'Garde',
  category: 'PNJ',
  participant: {
    id: 'template-participant',
    name: 'Garde',
    kind: 'Opposant',
    initiative: 8,
    trackers: [],
    statuses: [],
  },
};

const rulePreset = {
  id: 'rtpl-maison',
  name: 'Regles maison',
  rules: { temporalite: 'classique', multipleActionSlots: false },
};

const initiativeTextPreset = {
  id: 'itpl-maison',
  name: 'Initiative maison',
  config: {
    enabled: true,
    separators: [' - '],
    parts: [
      { label: 'Posture', values: ['Rapide', 'Lente'] },
      { label: 'Priorite', values: ['Haute', 'Basse'] },
    ],
  },
};

describe('Cadence library files', () => {
  it('serializes and reloads .cadlib libraries with kits, rule presets and templates', () => {
    const content = serializeCadenceLibrary({
      name: 'Bibliotheque test',
      randomKits: [randomKitCatalog[0]],
      templates: { templates: [participantTemplate] },
      rulePresets: [rulePreset],
      initiativeTextPresets: [initiativeTextPreset],
    });

    const reloaded = normalizeCadenceLibraryPayload(JSON.parse(content));

    expect(reloaded).toMatchObject({
      format: CADENCE_LIBRARY_FORMAT,
      schemaVersion: CADENCE_LIBRARY_SCHEMA_VERSION,
      library: { name: 'Bibliotheque test' },
    });
    expect(reloaded.randomKits).toHaveLength(1);
    expect(reloaded.templates.templates[0]).toMatchObject({ name: 'Garde', category: 'PNJ' });
    expect(reloaded.templates.ruleTemplates[0]).toMatchObject({ name: 'Regles maison' });
    expect(reloaded.rulePresets).toEqual(reloaded.templates.ruleTemplates);
    expect(reloaded.initiativeTextPresets).toEqual(reloaded.templates.initiativeTextPresets);
    expect(reloaded.initiativeTextPresets[0]).toMatchObject({ name: 'Initiative maison' });
    expect(isValidCadenceLibrary(reloaded)).toBe(true);
  });

  it('can contain only campaign-level templates', () => {
    const library = createCadenceLibraryPayload({
      name: 'Modeles partageables',
      templates: { templates: [participantTemplate] },
    });

    expect(library.randomKits).toEqual([]);
    expect(library.templates.templates).toHaveLength(1);
    expect(isValidCadenceLibrary(library)).toBe(true);
  });

  it('accepts a library containing only custom initiative label presets', () => {
    const library = createCadenceLibraryPayload({
      name: 'Initiatives',
      initiativeTextPresets: [initiativeTextPreset],
    });

    expect(library.templates.initiativeTextPresets).toHaveLength(1);
    expect(library.initiativeTextPresets[0].config).toMatchObject({
      enabled: true,
      preset: '',
      cardSourceId: '',
    });
    expect(isValidCadenceLibrary(library)).toBe(true);
  });

  it('merges .cadlib templates and rule presets without applying campaign data', () => {
    const current = normalizeTemplateStore({ ruleTemplates: [rulePreset] });
    const library = createCadenceLibraryPayload({
      name: 'Import',
      templates: { templates: [participantTemplate] },
      rulePresets: [{ ...rulePreset, id: 'rtpl-autre', name: 'Regles autre' }],
    });

    const result = mergeCadenceLibraryTemplates(current, library);

    expect(result.added.map((item) => item.type)).toEqual(['participant', 'rules']);
    expect(result.store.templates).toHaveLength(1);
    expect(result.store.ruleTemplates.map((template) => template.name)).toEqual(['Regles maison', 'Regles autre']);
  });

  it('imports random kits into an initialized RandomSystem without activating scene integration', () => {
    const library = createCadenceLibraryPayload({
      name: 'Kits',
      randomKits: [randomKitCatalog[0]],
    });

    const result = importCadenceLibraryRandomKits(createDefaultRandomSystemState(), library);

    expect(result.added).toBe(1);
    expect(result.state.randomKits).toHaveLength(1);
    expect(result.state.definitions).toHaveLength(createDefaultRandomSystemState().definitions.length);
  });

  it('rejects invalid or empty library payloads', () => {
    expect(isValidCadenceLibrary({ format: CADENCE_LIBRARY_FORMAT, schemaVersion: CADENCE_LIBRARY_SCHEMA_VERSION })).toBe(false);
    expect(isValidCadenceLibrary({ format: 'cadence-campaign', schemaVersion: 2, randomKits: [randomKitCatalog[0]] })).toBe(false);
    expect(isValidCadenceLibrary(null)).toBe(false);
  });
});
