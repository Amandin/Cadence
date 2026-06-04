import { describe, expect, it } from 'vitest';
import { initiativeOrders, multipleActionModes, phaseActionModes, temporalityModes } from '../constants.js';
import { activeRuleSummary, ruleCompatibilityIssues, ruleOptionAvailability, temporalityPatch } from './ruleCompatibility.js';

const labels = { enabled: true, parts: [{ label: 'Vitesse', values: ['Rapide', 'Lent'] }] };

describe('rule compatibility', () => {
  it('accepts a simple classic numeric configuration', () => {
    expect(ruleCompatibilityIssues({ temporalite: temporalityModes.CLASSIC, multipleActionSlots: false })).toEqual([]);
  });

  it('reports every incompatible option combined with adjustment before Next', () => {
    const issues = ruleCompatibilityIssues({
      temporalite: temporalityModes.PHASES,
      phaseActionMode: phaseActionModes.AUTOMATIC,
      multipleActionSlots: true,
      promptInitiativeOnNext: true,
      declarationMode: true,
      initiativeTextOrder: labels,
    });

    expect(issues.map((issue) => issue.id)).toEqual([
      'adjustment-phases',
      'adjustment-text-initiative',
      'adjustment-multiple-slots',
      'adjustment-declaration',
      'phases-multiple-slots',
      'automatic-phases-text-initiative',
    ]);
  });

  it('keeps label initiative available with checked phases', () => {
    const rules = {
      temporalite: temporalityModes.PHASES,
      phaseActionMode: phaseActionModes.CHECKED,
      multipleActionSlots: false,
      initiativeTextOrder: labels,
    };

    expect(ruleCompatibilityIssues(rules)).toEqual([]);
    expect(ruleOptionAvailability(rules).labelInitiative.disabled).toBe(false);
  });

  it('selects checked phases when entering phases with label initiative', () => {
    expect(temporalityPatch({ initiativeTextOrder: labels }, temporalityModes.PHASES)).toEqual({
      temporalite: temporalityModes.PHASES,
      phaseActionMode: phaseActionModes.CHECKED,
    });
  });

  it('cleans automatic phases when entering flexible mode', () => {
    expect(temporalityPatch({
      temporalite: temporalityModes.PHASES,
      phaseActionMode: phaseActionModes.AUTOMATIC,
    }, temporalityModes.FLEXIBLE)).toEqual({
      temporalite: temporalityModes.FLEXIBLE,
      phaseActionMode: '',
      surpriseAdvanceOn: 'round',
    });
  });

  it('selects checked phases when returning from flexible mode', () => {
    expect(temporalityPatch({
      temporalite: temporalityModes.FLEXIBLE,
      phaseActionMode: '',
    }, temporalityModes.PHASES)).toEqual({
      temporalite: temporalityModes.PHASES,
      phaseActionMode: phaseActionModes.CHECKED,
    });
  });

  it('disables options that would introduce an incompatible combination', () => {
    const availability = ruleOptionAvailability({
      temporalite: temporalityModes.FLEXIBLE,
      declarationMode: true,
      multipleActionSlots: false,
    });

    expect(availability.promptInitiativeOnNext.disabled).toBe(true);
    expect(availability.promptInitiativeOnNext.reason).toContain('mode souple');
  });

  it('builds a readable active rules summary', () => {
    expect(activeRuleSummary({
      temporalite: temporalityModes.CLASSIC,
      declarationMode: true,
      multipleActionSlots: true,
      initiativeTextOrder: labels,
    })).toEqual(['Classique', 'Initiative par labels', 'Creneaux manuels', 'Declaration puis resolution']);
  });

  it('explains that label initiative is dormant in flexible mode without initiative', () => {
    const rules = {
      temporalite: temporalityModes.FLEXIBLE,
      flexibleUseInitiative: false,
      multipleActionSlots: false,
    };

    expect(activeRuleSummary(rules)).toEqual(['Souple', 'Sans initiative', 'Une action par personnage']);
    expect(ruleOptionAvailability(rules).labelInitiative.reason).toContain('type puis par nom');
  });

  it('blocks surprise ending on activation in flexible mode', () => {
    const rules = {
      temporalite: temporalityModes.FLEXIBLE,
      surpriseAdvanceOn: 'activation',
      multipleActionSlots: false,
    };

    expect(ruleCompatibilityIssues(rules).map((issue) => issue.id)).toContain('surprise-activation-flexible');
    expect(ruleOptionAvailability(rules).surpriseAdvanceOn.activation.disabled).toBe(true);
  });

  it('keeps initiative cost exclusive and blocks incompatible combinations', () => {
    const rules = {
      temporalite: temporalityModes.CLASSIC,
      multipleActionMode: multipleActionModes.INITIATIVE_COST,
      multipleActionSlots: true,
      initiativeOrder: initiativeOrders.ASC,
      declarationMode: true,
    };

    expect(ruleCompatibilityIssues(rules).map((issue) => issue.id)).toEqual([
      'initiative-cost-declaration',
      'initiative-cost-ascending',
    ]);
    expect(ruleOptionAvailability({ ...rules, declarationMode: false }).initiativeCost.disabled).toBe(true);
  });
});
