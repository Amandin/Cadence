import { describe, expect, it } from 'vitest';
import {
  createDefaultRandomRulePool,
  essentialRandomRuleIds,
  isRandomRuleEnabled,
  normalizeRandomRulePool,
  randomRuleCatalogue,
  randomRuleIds,
  setRandomRuleEnabled,
} from './rulePool.js';

describe('RandomSystem rule pool', () => {
  it('enables the complete generic catalogue by default', () => {
    const pool = createDefaultRandomRulePool();
    expect(pool.enabledRuleIds).toEqual(randomRuleCatalogue.map((rule) => rule.id));
    expect(pool.enabledRuleIds).not.toContain('decks');
    expect(pool.enabledRuleIds).not.toContain('combinations');
  });

  it('toggles rules without accepting unknown mechanisms', () => {
    const withoutThresholds = setRandomRuleEnabled(
      createDefaultRandomRulePool(),
      randomRuleIds.SUCCESS_THRESHOLDS,
      false,
    );
    expect(isRandomRuleEnabled(withoutThresholds, randomRuleIds.SUCCESS_THRESHOLDS)).toBe(false);
    expect(normalizeRandomRulePool({ enabledRuleIds: [...essentialRandomRuleIds, 'script'] }))
      .toEqual({ enabledRuleIds: essentialRandomRuleIds });
  });
});
