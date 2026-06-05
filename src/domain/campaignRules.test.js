import { describe, expect, it } from 'vitest';
import { defaultTiebreakerLabel, multipleActionModes } from '../constants.js';
import { applyInitiativeRules, normalizeCampaignRules } from './campaignRules.js';

describe('campaign rules', () => {
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

  it('applies tiebreaker display settings to a scene', () => {
    expect(applyInitiativeRules({ participants: [], reserve: [] }, {
      tiebreakerVisible: false,
      tiebreakerLabel: 'Vitesse',
    })).toMatchObject({
      tiebreakerVisible: false,
      tiebreakerLabel: 'Vitesse',
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
});
