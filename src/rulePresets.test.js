import { describe, expect, it } from 'vitest';
import { rulePresetCatalog } from './rulePresets.js';
import { normalizeTemplateStore } from './templates.js';

describe('rule preset catalog', () => {
  it('loads rule presets from .cadence-rules files in nested folders', () => {
    const ids = rulePresetCatalog.map((preset) => preset.catalogId);

    expect(ids).toContain('cadence/classique-numerique');
    expect(ids).toContain('phases/cochees');
    expect(ids).toContain('generiques/initiative-cartes');
    expect(rulePresetCatalog.every((preset) => preset.readOnly)).toBe(true);
    expect(rulePresetCatalog.every((preset) => preset.path.endsWith('.cadence-rules'))).toBe(true);
  });

  it('keeps built-in rule presets out of the campaign template store', () => {
    const store = normalizeTemplateStore(null);

    expect(store.ruleTemplates).toEqual([]);
  });
});
