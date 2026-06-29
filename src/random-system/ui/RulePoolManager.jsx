import { t } from '../../i18n/index.js';
import { randomRuleCatalogue } from '../rulePool.js';

const ruleGroups = [
  { id: 'draw', labelKey: 'random.rules.group.draw' },
  { id: 'calculation', labelKey: 'random.rules.group.calculation' },
];

export function RulePoolManager({ rulePool, actions }) {
  const enabled = new Set(rulePool.enabledRuleIds);
  return (
    <section className="rs-rule-pool">
      <div className="rs-section-head">
        <div>
          <span className="rs-section-kicker">{t('random.config.rules')}</span>
          <div className="rs-heading-with-mark">
            <span className="rs-heading-mark" aria-hidden="true">◌</span>
            <h2>{t('random.rules.title')}</h2>
          </div>
          <span>{t('random.rules.enabledCount', { count: enabled.size })}</span>
        </div>
        <div>
          <button type="button" className="small-btn" onClick={actions.useEssentialRules}>{t('random.rules.essential')}</button>
          <button type="button" className="small-btn" onClick={actions.enableAllRules}>{t('random.rules.enableAll')}</button>
        </div>
      </div>
      <div className="rs-rule-groups">
        {ruleGroups.map((group) => (
          <section key={group.id}>
            <h3>{t(group.labelKey)}</h3>
            <div>
              {randomRuleCatalogue.filter((rule) => rule.group === group.id).map((rule) => (
                <label className={`global-switch rs-rule-toggle ${enabled.has(rule.id) ? 'active' : ''}`} key={rule.id}>
                  <span>
                    <strong>{t(rule.labelKey)}</strong>
                    <small>{t(rule.descriptionKey)}</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={enabled.has(rule.id)}
                    onChange={(event) => actions.setRuleEnabled(rule.id, event.target.checked)}
                  />
                </label>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
