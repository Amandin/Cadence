import { describe, expect, it } from 'vitest';
import { createRulePresetSnapshot, normalizeRulePresetSnapshot, rulePresetCatalog } from './rulePresets.js';
import { normalizeTemplateStore } from './templates.js';

describe('rule preset catalog', () => {
  it('loads only the expected initiative preset catalog entries', () => {
    const ids = rulePresetCatalog.map((preset) => preset.catalogId);

    expect(ids).toEqual([
      'generiques/classique',
      'generiques/declaration-puis-resolution',
      'generiques/initiative-a-cout',
      'generiques/initiative-souple-ordonnee',
      'generiques/initiative-souple-sans-initiative',
      'generiques/phases-cochees',
      'generiques/phases-par-initiative',
      'systemes/appel-de-cthulhu-7e',
      'systemes/cosmere-rpg',
      'systemes/d20-tactique-dd-pathfinder',
      'systemes/d20-boss-mythique',
      'systemes/narratif-sans-initiative-pbta-vtm',
      'systemes/savage-worlds',
      'systemes/shadowrun-5',
    ]);

    expect(rulePresetCatalog.every((preset) => preset.readOnly)).toBe(true);
    expect(rulePresetCatalog.every((preset) => preset.path.endsWith('.cadence-rules'))).toBe(true);
  });

  it('keeps generic and system metadata aligned with the visible catalog', () => {
    const classic = rulePresetCatalog.find((preset) => preset.catalogId === 'generiques/classique');
    const d20 = rulePresetCatalog.find((preset) => preset.catalogId === 'systemes/d20-tactique-dd-pathfinder');
    const cosmere = rulePresetCatalog.find((preset) => preset.catalogId === 'systemes/cosmere-rpg');

    expect(classic).toMatchObject({
      family: 'generic',
      category: 'Générique',
      name: 'Classique',
    });
    expect(d20).toMatchObject({
      family: 'system',
      category: 'Système',
      system: 'D&D / Pathfinder',
    });
    expect(cosmere?.rules).toMatchObject({
      phaseRerollEachRound: true,
      initiativeOrder: 'desc',
      tiebreakerVisible: false,
      equalityRule: 'never',
    });
    expect(cosmere?.rules.initiativeTextOrder).toMatchObject({
      enabled: true,
      parts: [{ label: 'Vitesse', values: ['Rapide', 'Lent'] }],
    });
  });

  it('keeps built-in rule presets out of the campaign template store', () => {
    const store = normalizeTemplateStore(null);

    expect(store.ruleTemplates).toEqual([]);
    expect(store.templates).toEqual([]);
    expect(store.trackerTemplates).toEqual([]);
    expect(store.statusTemplates).toEqual([]);
    expect(store.sceneStatusTemplates).toEqual([]);
    expect(store.sceneCounterTemplates).toEqual([]);
  });

  it('keeps the selected system, edition and initiative profile in a preset snapshot', () => {
    const preset = rulePresetCatalog.find((item) => item.catalogId === 'systemes/shadowrun-5');
    const snapshot = createRulePresetSnapshot(preset, preset.rules, {
      systemProfileId: 'system/shadowrun',
      editionId: 'sr-5',
      initiativeProfileId: 'initiative/shadowrun-5-decrement',
      randomQuickRollProfileIds: ['quick-roll/d6-pool'],
    });

    expect(normalizeRulePresetSnapshot(snapshot, preset.rules)).toMatchObject({
      systemProfileId: 'system/shadowrun',
      editionId: 'sr-5',
      initiativeProfileId: 'initiative/shadowrun-5-decrement',
      randomQuickRollProfileIds: ['quick-roll/d6-pool'],
    });
  });
});
