export const randomRuleIds = {
  EXPLOSIONS: 'explosions',
  REROLLS: 'rerolls',
  KEEPS: 'keeps',
  SUCCESS_THRESHOLDS: 'success-thresholds',
  CUSTOM_VALUES: 'custom-values',
  MARKERS: 'markers',
  OCCURRENCE_BONUSES: 'occurrence-bonuses',
  MODIFIERS: 'modifiers',
};

export const randomRuleCatalogue = [
  {
    id: randomRuleIds.MODIFIERS,
    labelKey: 'random.rules.modifiers',
    descriptionKey: 'random.rules.modifiers.help',
    group: 'calculation',
  },
  {
    id: randomRuleIds.KEEPS,
    labelKey: 'random.rules.keeps',
    descriptionKey: 'random.rules.keeps.help',
    group: 'calculation',
  },
  {
    id: randomRuleIds.SUCCESS_THRESHOLDS,
    labelKey: 'random.rules.thresholds',
    descriptionKey: 'random.rules.thresholds.help',
    group: 'calculation',
  },
  {
    id: randomRuleIds.EXPLOSIONS,
    labelKey: 'random.rules.explosions',
    descriptionKey: 'random.rules.explosions.help',
    group: 'draw',
  },
  {
    id: randomRuleIds.REROLLS,
    labelKey: 'random.rules.rerolls',
    descriptionKey: 'random.rules.rerolls.help',
    group: 'draw',
  },
  {
    id: randomRuleIds.CUSTOM_VALUES,
    labelKey: 'random.rules.customValues',
    descriptionKey: 'random.rules.customValues.help',
    group: 'draw',
  },
  {
    id: randomRuleIds.MARKERS,
    labelKey: 'random.rules.markers',
    descriptionKey: 'random.rules.markers.help',
    group: 'draw',
  },
  {
    id: randomRuleIds.OCCURRENCE_BONUSES,
    labelKey: 'random.rules.occurrenceBonuses',
    descriptionKey: 'random.rules.occurrenceBonuses.help',
    group: 'calculation',
  },
];

export const essentialRandomRuleIds = [
  randomRuleIds.MODIFIERS,
];

export function createDefaultRandomRulePool() {
  return { enabledRuleIds: randomRuleCatalogue.map((rule) => rule.id) };
}

export function normalizeRandomRulePool(pool) {
  if (!pool || typeof pool !== 'object') return createDefaultRandomRulePool();
  const knownIds = new Set(randomRuleCatalogue.map((rule) => rule.id));
  const enabledRuleIds = Array.isArray(pool.enabledRuleIds)
    ? pool.enabledRuleIds.map(String).filter((id) => knownIds.has(id))
    : randomRuleCatalogue.map((rule) => rule.id);
  return { enabledRuleIds: [...new Set(enabledRuleIds)] };
}

export function isRandomRuleEnabled(pool, ruleId) {
  const enabledRuleIds = Array.isArray(pool?.enabledRuleIds)
    ? pool.enabledRuleIds
    : createDefaultRandomRulePool().enabledRuleIds;
  return enabledRuleIds.includes(ruleId);
}

export function setRandomRuleEnabled(pool, ruleId, enabled) {
  const normalized = normalizeRandomRulePool(pool);
  const enabledRuleIds = new Set(normalized.enabledRuleIds);
  if (enabled) enabledRuleIds.add(ruleId);
  else enabledRuleIds.delete(ruleId);
  return normalizeRandomRulePool({ enabledRuleIds: [...enabledRuleIds] });
}
