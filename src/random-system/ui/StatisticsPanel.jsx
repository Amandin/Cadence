import { useEffect, useMemo, useState } from 'react';
import { t } from '../../i18n/index.js';
import { randomSourceKinds, sourceOutcomes } from '../engine.js';
import { RandomIcon } from './RandomIcons.jsx';
import '../styles/base.css';
import '../styles/results.css';

const MAX_HISTOGRAM_ROWS = 200;

function UsageBars({ items }) {
  const maximum = Math.max(1, ...items.map((item) => item.count));
  return (
    <div className="rs-stat-bars">
      {items.map((item) => (
        <div className="rs-stat-row" key={item.id}>
          <span>{item.label}</span>
          <div><i style={{ width: `${(item.count / maximum) * 100}%` }} /></div>
          <strong>{item.count}</strong>{item.detail && <small>{item.detail}</small>}
        </div>
      ))}
    </div>
  );
}

export function StatisticsPanel({ state, onReset }) {
  const statisticalSources = useMemo(
    () => state.sources.filter((source) => source.kind !== randomSourceKinds.CARDS),
    [state.sources],
  );
  const cardSources = useMemo(
    () => state.sources.filter((source) => source.kind === randomSourceKinds.CARDS),
    [state.sources],
  );
  const [sourceId, setSourceId] = useState(() => (
    statisticalSources.find((source) => state.statistics.bySource[source.id]?.count > 0)?.id
    || statisticalSources[0]?.id
    || ''
  ));
  const [contextId, setContextId] = useState('global');
  const contextOptions = useMemo(() => [
    { id: 'global', label: t('random.stats.global') },
    ...Object.entries(state.statistics.byContext || {}).map(([id, context]) => ({ id, label: context.label || id })),
  ], [state.statistics.byContext]);
  const selectedContext = contextId === 'global' ? null : state.statistics.byContext?.[contextId];
  const statistics = selectedContext
    ? {
      totalUses: Number(selectedContext.uses) || 0,
      totalDraws: Number(selectedContext.draws) || 0,
      byDefinition: selectedContext.byDefinition || {},
      bySource: selectedContext.bySource || {},
    }
    : state.statistics;
  const selectedSource = statisticalSources.find((source) => source.id === sourceId)
    || statisticalSources[0];
  useEffect(() => {
    if (!selectedSource && statisticalSources[0]) setSourceId(statisticalSources[0].id);
  }, [selectedSource, statisticalSources]);

  const definitionStats = useMemo(() => state.definitions
    .map((definition) => ({
      id: definition.id,
      label: definition.name,
      count: Number(statistics.byDefinition[definition.id]) || 0,
    }))
    .filter((item) => item.count > 0), [state.definitions, statistics.byDefinition]);

  const sourceStats = useMemo(() => {
    if (!selectedSource) return [];
    const observed = statistics.bySource[selectedSource.id]?.outcomes || {};
    const rows = sourceOutcomes(selectedSource).map((outcome) => ({
      id: outcome.id,
      label: outcome.symbol || outcome.label,
      count: Number(observed[outcome.id]) || 0,
    }));
    if (rows.length <= MAX_HISTOGRAM_ROWS) return rows;
    return rows
      .filter((row) => row.count > 0)
      .sort((left, right) => right.count - left.count)
      .slice(0, MAX_HISTOGRAM_ROWS);
  }, [selectedSource, statistics.bySource]);

  const cardStats = useMemo(() => cardSources
    .map((source) => ({
      id: source.id,
      label: source.name,
      count: Number(statistics.bySource[source.id]?.count) || 0,
    }))
    .filter((item) => item.count > 0), [cardSources, statistics.bySource]);

  const tokenStats = useMemo(() => (state.tokenContainers || [])
    .map((container) => ({
      id: container.id,
      label: container.name,
      count: Number(statistics.bySource[container.id]?.count) || 0,
    }))
    .filter((item) => item.count > 0), [statistics.bySource, state.tokenContainers]);

  return (
    <div className="rs-statistics">
      <section className="rs-stat-summary">
        <label><span>{t('random.stats.scope')}</span><select value={contextId} onChange={(event) => setContextId(event.target.value)}>{contextOptions.map((context) => <option value={context.id} key={context.id}>{context.label}</option>)}</select></label>
        <div><span>{t('random.stats.uses')}</span><strong><RandomIcon name="roll" /> {statistics.totalUses}</strong></div>
        <div><span>{t('random.stats.draws')}</span><strong><RandomIcon name="table" /> {statistics.totalDraws}</strong></div>
        <button type="button" className="small-btn" onClick={onReset}>{t('random.stats.reset')}</button>
      </section>

      <div className="rs-stat-grid">
        <section>
          <div className="rs-section-head"><div className="rs-heading-with-mark"><span className="rs-heading-mark" aria-hidden="true"><RandomIcon name="roll" /></span><h3>{t('random.stats.definitions')}</h3></div></div>
          {definitionStats.length ? <UsageBars items={definitionStats} /> : <p className="muted">{t('random.stats.empty')}</p>}
        </section>
        <section>
          <div className="rs-section-head">
            <div className="rs-heading-with-mark"><span className="rs-heading-mark" aria-hidden="true"><RandomIcon name="table" /></span><h3>{t('random.stats.distribution')}</h3></div>
            <select value={selectedSource?.id || ''} onChange={(event) => setSourceId(event.target.value)}>
              {statisticalSources.map((source) => <option value={source.id} key={source.id}>{source.name}</option>)}
            </select>
          </div>
          {sourceStats.length ? <UsageBars items={sourceStats} /> : <p className="muted">{t('random.stats.empty')}</p>}
        </section>
        {cardSources.length > 0 && (
          <section>
            <div className="rs-section-head"><div className="rs-heading-with-mark"><span className="rs-heading-mark" aria-hidden="true"><RandomIcon name="cards" /></span><h3>{t('random.stats.cards')}</h3></div></div>
            {cardStats.length ? <UsageBars items={cardStats} /> : <p className="muted">{t('random.stats.empty')}</p>}
          </section>
        )}
        {(state.tokenContainers || []).length > 0 && (
          <section>
            <div className="rs-section-head"><div className="rs-heading-with-mark"><span className="rs-heading-mark" aria-hidden="true"><RandomIcon name="roll" /></span><h3>{t('random.stats.tokens')}</h3></div></div>
            {tokenStats.length ? <UsageBars items={tokenStats} /> : <p className="muted">{t('random.stats.empty')}</p>}
          </section>
        )}
      </div>
    </div>
  );
}
