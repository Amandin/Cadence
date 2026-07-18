import { describe, expect, it } from 'vitest';
import {
  campaignRulesFromOnboardingAnswers,
  onboardingAnswersFromRules,
  onboardingDefaultRules,
} from './onboardingQuestionnaire.js';

describe('onboarding questionnaire', () => {
  it('starts from the usual D&D 5e initiative rules', () => {
    expect(onboardingAnswersFromRules(onboardingDefaultRules)).toMatchObject({
      organization: 'classique',
      surpriseRound: false,
      multipleActions: 'never',
      declarationMode: false,
      initiativeFormat: 'descending',
      tiebreakerVisible: true,
      tiebreakerLabel: 'Dextérité',
      initiativeSource: 'roll',
    });
  });

  it('builds an ordered numeric campaign with elite-only multiple actions', () => {
    expect(campaignRulesFromOnboardingAnswers({
      organization: 'classique',
      surpriseRound: true,
      multipleActions: 'elites',
      initiativeFormat: 'ascending',
      tiebreakerVisible: true,
      tiebreakerLabel: 'Agilité',
      initiativeSource: 'fixed',
    })).toMatchObject({
      temporalite: 'classique',
      surpriseDedicatedRound: true,
      multipleActionMode: 'manual',
      manualMultipleActionScope: 'elite-only',
      initiativeOrder: 'asc',
      tiebreakerVisible: true,
      tiebreakerLabel: 'Agilité',
      initiativeBonusEnabled: false,
    });
  });

  it('forces automatic phases to use descending numeric initiative', () => {
    expect(campaignRulesFromOnboardingAnswers({
      organization: 'phases',
      phaseType: 'automatic',
      phaseReroll: true,
      initiativeFormat: 'labels',
      labelPreset: 'cards',
      tiebreakerVisible: true,
      initiativeSource: 'roll',
    })).toMatchObject({
      temporalite: 'phases',
      phaseActionMode: 'automatic',
      phaseRerollEachRound: true,
      initiativeOrder: 'desc',
      initiativeValueType: 'numeric',
      multipleActionMode: 'none',
    });
  });

  it('builds label initiative presets and hides numeric rolling', () => {
    const rules = campaignRulesFromOnboardingAnswers({
      organization: 'classique',
      multipleActions: 'never',
      initiativeFormat: 'labels',
      labelPreset: 'fast-slow',
      tiebreakerVisible: false,
      initiativeSource: 'roll',
    });

    expect(rules.initiativeTextOrder).toMatchObject({
      enabled: true,
      parts: [{ label: 'Vitesse', values: ['Rapide', 'Lent'] }],
    });
    expect(rules).toMatchObject({
      initiativeValueType: 'label',
      initiativeBonusEnabled: false,
      equalityRule: 'strict',
    });
  });

  it('can reopen the questionnaire from existing rules', () => {
    expect(onboardingAnswersFromRules({
      temporalite: 'souple',
      flexibleUseInitiative: false,
      multipleActionMode: 'none',
      surpriseDedicatedRound: true,
    })).toMatchObject({
      organization: 'souple',
      flexibleInitiative: false,
      surpriseRound: true,
      multipleActions: 'never',
    });
  });

  it('keeps phase numbers and the documented surprise defaults', () => {
    expect(campaignRulesFromOnboardingAnswers({
      organization: 'phases',
      phaseType: 'checked',
      phaseCount: 5,
      phaseDecrement: 7,
      declarationMode: true,
      multipleActions: 'never',
    })).toMatchObject({
      phaseCount: 5,
      phaseDecrement: 7,
      declarationMode: true,
      surpriseImpact: 'limited',
      surpriseAdvanceOn: 'activation',
      equalityRule: 'strict',
    });

    expect(campaignRulesFromOnboardingAnswers({ organization: 'souple' })).toMatchObject({
      surpriseImpact: 'limited',
      surpriseAdvanceOn: 'round',
    });
  });

  it('does not combine initiative-cost actions with declaration mode', () => {
    expect(campaignRulesFromOnboardingAnswers({
      organization: 'classique',
      multipleActions: 'automatic',
      declarationMode: true,
    })).toMatchObject({
      multipleActionMode: 'initiative-cost',
      declarationMode: false,
      initiativeOrder: 'desc',
    });
  });

  it('keeps a dice-roll initiative choice when answers are rebuilt', () => {
    const rules = campaignRulesFromOnboardingAnswers({
      organization: 'classique',
      multipleActions: 'never',
      initiativeFormat: 'descending',
      tiebreakerVisible: true,
      initiativeSource: 'roll',
    }, onboardingDefaultRules);

    expect(onboardingAnswersFromRules(rules).initiativeSource).toBe('roll');
  });
});
