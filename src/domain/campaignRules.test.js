import { describe, expect, it } from 'vitest';
import { defaultTiebreakerLabel, multipleActionModes } from '../constants.js';
import { applyInitiativeRules, normalizeCampaignRules } from './campaignRules.js';
import { rulePresetCatalog } from '../rulePresets.js';

describe('campaign rules', () => {
  it('uses every standard participant type in the default priority order', () => {
    expect(normalizeCampaignRules({}).categoryOrder).toEqual([
      'PJ', 'Compagnon', 'Élite', 'Allié', 'Opposant', 'Environnement',
    ]);
  });

  it('does not enable multiple actions when the setting is absent', () => {
    expect(normalizeCampaignRules({})).toMatchObject({
      multipleActionMode: multipleActionModes.NONE,
      multipleActionSlots: false,
    });
  });

  it('migrates the retired untouched default order to include every standard type', () => {
    expect(normalizeCampaignRules({
      categoryOrder: ['PJ', 'Opposant', 'Allié', 'Environnement'],
    }).categoryOrder).toEqual([
      'PJ', 'Compagnon', 'Élite', 'Allié', 'Opposant', 'Environnement',
    ]);
  });

  it('migrates the superseded complete default order', () => {
    expect(normalizeCampaignRules({
      categoryOrder: ['PJ', 'Compagnon', 'Allié', 'Élite', 'Opposant', 'Environnement'],
    }).categoryOrder).toEqual([
      'PJ', 'Compagnon', 'Élite', 'Allié', 'Opposant', 'Environnement',
    ]);
  });

  it('keeps tiebreaker display settings and custom priority types', () => {
    expect(normalizeCampaignRules({
      tiebreakerVisible: false,
      tiebreakerLabel: 'Reflexes',
      categoryOrder: ['PJ', 'Rapide', 'Opposant'],
    })).toMatchObject({
      tiebreakerVisible: false,
      tiebreakerLabel: 'Reflexes',
      categoryOrder: ['PJ', 'Rapide', 'Opposant'],
    });
  });

  it('uses the default tiebreaker label when the custom label is empty', () => {
    expect(normalizeCampaignRules({ tiebreakerLabel: '   ' }).tiebreakerLabel).toBe(defaultTiebreakerLabel);
  });

  it('migrates the former default tiebreaker label to Dextérité', () => {
    expect(normalizeCampaignRules({ tiebreakerLabel: 'Départage' }).tiebreakerLabel).toBe('Dextérité');
  });

  it('applies tiebreaker display settings to a scene', () => {
    expect(applyInitiativeRules({ participants: [], reserve: [] }, {
      tiebreakerVisible: false,
      tiebreakerLabel: 'Vitesse',
    })).toMatchObject({
      tiebreakerVisible: false,
      tiebreakerLabel: 'Vitesse',
    });
  });

  it('clears active participant data while a scene is in preparation', () => {
    expect(applyInitiativeRules({
      round: -1,
      activeId: 'pj-1',
      activeSlotId: 'pj-1:slot-1',
      participants: [{ id: 'pj-1', name: 'Ariane', initiative: 18, statuses: [], trackers: [] }],
      reserve: [],
    }, {
      temporalite: 'classique',
    })).toMatchObject({
      round: -1,
      activeId: '',
      activeSlotId: '',
    });
  });

  it('keeps the initiative bonus rule setting', () => {
    expect(normalizeCampaignRules({ initiativeBonusEnabled: false }).initiativeBonusEnabled).toBe(false);
    expect(applyInitiativeRules({ participants: [], reserve: [] }, {
      initiativeBonusEnabled: false,
    })).toMatchObject({
      initiativeBonusEnabled: false,
    });
  });

  it('keeps the initiative bonus roll link', () => {
    expect(normalizeCampaignRules({ initiativeBonusRollDefinitionId: 'initiative-bonus' })).toMatchObject({
      initiativeBonusRollDefinitionId: 'initiative-bonus',
    });
    expect(applyInitiativeRules({ participants: [], reserve: [] }, {
      initiativeBonusRollDefinitionId: 'initiative-bonus',
    })).toMatchObject({
      initiativeBonusRollDefinitionId: 'initiative-bonus',
    });
  });

  it('keeps the Random System scene integration setting', () => {
    expect(applyInitiativeRules({ participants: [], reserve: [] }, {
      randomSystemMode: 'initiative',
    })).toMatchObject({
      randomSystemMode: 'initiative',
    });
  });

  it('keeps the flexible mode initiative display preference', () => {
    expect(applyInitiativeRules({ participants: [], reserve: [] }, {
      temporalite: 'souple',
      flexibleUseInitiative: false,
    })).toMatchObject({
      temporalite: 'souple',
      flexibleUseInitiative: false,
    });
  });

  it('normalizes the manual multiple-action scope', () => {
    expect(normalizeCampaignRules({ multipleActionMode: 'manual', manualMultipleActionScope: 'elite-only' }).manualMultipleActionScope).toBe('elite-only');
    expect(normalizeCampaignRules({ multipleActionMode: 'manual', manualMultipleActionScope: 'invalid' }).manualMultipleActionScope).toBe('all');
  });

  it('keeps the configured surprise impact', () => {
    expect(applyInitiativeRules({ participants: [], reserve: [] }, {
      surpriseImpact: 'inactive',
    })).toMatchObject({
      surpriseImpact: 'inactive',
    });
  });

  it('keeps the configured surprise advance event', () => {
    expect(applyInitiativeRules({ participants: [], reserve: [] }, {
      surpriseAdvanceOn: 'round',
    })).toMatchObject({
      surpriseAdvanceOn: 'round',
    });
  });

  it('forces surprise to end on round start in flexible mode', () => {
    expect(applyInitiativeRules({ participants: [], reserve: [] }, {
      temporalite: 'souple',
      surpriseAdvanceOn: 'activation',
    })).toMatchObject({
      temporalite: 'souple',
      surpriseAdvanceOn: 'round',
    });
  });

  it('updates existing surprised statuses when the campaign surprise rule changes', () => {
    expect(applyInitiativeRules({
      participants: [{ id: 'a', statuses: [{ id: 'surpris', name: 'Surpris', limited: true, inactive: false, advanceOn: 'activation' }] }],
      reserve: [],
    }, {
      surpriseImpact: 'inactive',
      surpriseAdvanceOn: 'round',
    }).participants[0].statuses[0]).toMatchObject({
      name: 'Surpris',
      limited: false,
      inactive: true,
      advanceOn: 'round',
    });
  });

  it('normalizes stale automatic phases out of flexible mode', () => {
    expect(normalizeCampaignRules({
      temporalite: 'souple',
      phaseActionMode: 'automatic',
    })).toMatchObject({
      temporalite: 'souple',
      phaseActionMode: '',
    });
  });

  it('does not add checked phase data while applying flexible rules', () => {
    expect(applyInitiativeRules({ participants: [{ id: 'a' }], reserve: [] }, {
      temporalite: 'souple',
      phaseActionMode: 'automatic',
    }).participants[0].phaseActions).toBeUndefined();
  });

  it('aligns a stale surprise round when direct round one is selected', () => {
    expect(applyInitiativeRules({ round: 0, participants: [], reserve: [] }, {
      startRound: 1,
    }).round).toBe(1);
  });

  it('does not invent a surprise round when surprise is selected during round one', () => {
    expect(applyInitiativeRules({ round: 1, participants: [], reserve: [] }, {
      startRound: 0,
    }).round).toBe(1);
  });

  it('retires the legacy surprise start rule', () => {
    expect(normalizeCampaignRules({ startRound: 0 }).startRound).toBe(1);
  });

  it('normalizes the retired adjustment before Next rule into initiative cost when compatible', () => {
    expect(normalizeCampaignRules({
      promptInitiativeOnNext: true,
      temporalite: 'classic',
      multipleActionSlots: false,
    })).toMatchObject({
      promptInitiativeOnNext: false,
      multipleActionMode: multipleActionModes.INITIATIVE_COST,
      multipleActionSlots: true,
    });
  });

  it('disables the retired adjustment before Next rule when legacy manual slots were active', () => {
    expect(normalizeCampaignRules({
      promptInitiativeOnNext: true,
      temporalite: 'classic',
      multipleActionSlots: true,
    })).toMatchObject({
      promptInitiativeOnNext: false,
      multipleActionMode: multipleActionModes.MANUAL,
      multipleActionSlots: true,
    });
  });

  it('keeps initiative cost preset options through normalization', () => {
    const preset = rulePresetCatalog.find((item) => item.catalogId === 'generiques/initiative-a-cout');

    expect(normalizeCampaignRules(preset?.rules)).toMatchObject({
      temporalite: 'classique',
      initiativeOrder: 'desc',
      tiebreakerVisible: true,
      equalityRule: 'strict',
      multipleActionMode: multipleActionModes.INITIATIVE_COST,
      multipleActionSlots: true,
      initiativeCostThreshold: 0,
      initiativeCostQuickCosts: [1, 2, 3, 5],
      initiativeCostLimitToCurrent: false,
      declarationMode: false,
    });
  });

  it('keeps initiative text presets through normalization', () => {
    const savage = rulePresetCatalog.find((item) => item.catalogId === 'systemes/savage-worlds');
    const cosmere = rulePresetCatalog.find((item) => item.catalogId === 'systemes/cosmere-rpg');

    expect(normalizeCampaignRules(savage?.rules)).toMatchObject({
      initiativeOrder: 'desc',
      tiebreakerVisible: false,
      equalityRule: 'never',
      initiativeValueType: 'label',
    });
    expect(normalizeCampaignRules(savage?.rules).initiativeTextOrder).toMatchObject({
      enabled: true,
      preset: 'cards',
      parts: [
        { label: 'Valeur' },
        { label: 'Couleur' },
      ],
    });

    expect(normalizeCampaignRules(cosmere?.rules)).toMatchObject({
      phaseRerollEachRound: true,
      initiativeValueType: 'label',
      tiebreakerVisible: false,
      equalityRule: 'never',
    });
    expect(normalizeCampaignRules(cosmere?.rules).initiativeTextOrder).toMatchObject({
      enabled: true,
      parts: [{ label: 'Vitesse', values: ['Rapide', 'Lent'] }],
    });
  });

  it('applies a preset without breaking an existing scene', () => {
    const preset = rulePresetCatalog.find((item) => item.catalogId === 'generiques/phases-par-initiative');
    const scene = applyInitiativeRules({
      round: 2,
      phase: 1,
      participants: [{ id: 'pj-1', name: 'Ariane', initiative: 18, statuses: [], trackers: [] }],
      reserve: [{ id: 'r-1', name: 'Renfort', initiative: 0, statuses: [], trackers: [] }],
    }, preset?.rules);

    expect(scene).toMatchObject({
      temporalite: 'phases',
      phaseActionMode: 'automatic',
      phaseDecrement: 10,
      initiativeOrder: 'desc',
      tiebreakerVisible: true,
      equalityRule: 'strict',
      multipleActionMode: multipleActionModes.NONE,
      multipleActionSlots: false,
      round: 2,
    });
    expect(scene.participants).toHaveLength(1);
    expect(scene.reserve).toHaveLength(1);
    expect(scene.participants[0]).toMatchObject({ id: 'pj-1', initiative: 18 });
  });
});
