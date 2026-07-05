import { memo, useEffect, useMemo, useState } from 'react';
import { t } from '../../i18n/index.js';
import { uiSymbols } from '../../uiAssets.js';

const DEFAULT_VISIBLE_DRAWS = 120;

function displayAggregateValue(value) {
  if (!Array.isArray(value)) return String(value ?? '—');
  return value.map((item) => item.symbol || item.label || item.value).join(', ');
}

const DrawChip = memo(function DrawChip({ draw }) {
  const classes = [
    'rs-draw-chip',
    draw.rerolled ? 'is-rerolled' : '',
    draw.kept === false ? 'is-discarded' : '',
    draw.success ? 'is-success' : '',
    draw.chainIndex > 0 ? 'is-extra' : '',
  ].filter(Boolean).join(' ');
  const visibleValue = draw.outcome.symbol || draw.outcome.label || draw.calculatedValue;
  return (
    <span className={classes} title={`${draw.sourceName} · ${draw.outcome.label}`}>
      <strong>
        {draw.outcome.image
          ? <img className="rs-draw-chip-image" src={draw.outcome.image} alt="" />
          : visibleValue}
      </strong>
      {draw.markers.length > 0 && <small>{draw.markers.map((marker) => marker.label).join(', ')}</small>}
    </span>
  );
});

function DrawGroups({ draws, resultId }) {
  const [showAll, setShowAll] = useState(false);
  useEffect(() => setShowAll(false), [resultId]);
  const groups = useMemo(() => {
    const grouped = new Map();
    draws.forEach((draw) => {
      const group = grouped.get(draw.componentId) || {
        id: draw.componentId,
        label: draw.componentLabel,
        color: draw.componentColor,
        draws: [],
      };
      group.draws.push(draw);
      grouped.set(draw.componentId, group);
    });
    return Array.from(grouped.values());
  }, [draws]);

  return (
    <div className="rs-result-draw-groups">
      {groups.map((group) => {
        const visible = showAll ? group.draws : group.draws.slice(0, DEFAULT_VISIBLE_DRAWS);
        const hiddenCount = group.draws.length - visible.length;
        const detailedDraws = Array.from(new Map(
          visible
            .filter((draw) => draw.outcome.text)
            .map((draw) => [`${draw.outcome.id}:${draw.outcome.text}`, draw]),
        ).values());
        return (
          <section
            className={`rs-result-draw-group ${group.label ? '' : 'unnamed'} ${group.color ? 'has-color' : ''}`}
            style={group.color ? { '--rs-group-color': group.color } : undefined}
            key={group.id}
          >
            {group.label && (
              <div className="rs-subhead">
                <h4>{group.label}</h4>
                <span>{group.draws.length}</span>
              </div>
            )}
            <div className="rs-draw-grid">
              {visible.map((draw) => <DrawChip draw={draw} key={draw.id} />)}
            </div>
            {detailedDraws.length > 0 && (
              <div className="rs-outcome-texts">
                {detailedDraws.map((draw) => (
                  <article key={`${draw.id}-text`}>
                    <strong>
                      {draw.outcome.image
                        ? <img className="rs-outcome-text-image" src={draw.outcome.image} alt="" />
                        : draw.outcome.symbol || draw.outcome.label}
                    </strong>
                    <p>{draw.outcome.text}</p>
                  </article>
                ))}
              </div>
            )}
            {hiddenCount > 0 && (
              <button type="button" className="small-btn" onClick={() => setShowAll(true)}>
                {t('random.result.showMore', { count: hiddenCount })}
              </button>
            )}
          </section>
        );
      })}
    </div>
  );
}

function RollResult({ result }) {
  const selectedGroup = result.combined
    ? { draws: result.draws }
    : result.groups[result.selectedGroupIndex] || result.groups[0];
  const keptDraws = selectedGroup.draws.filter((draw) => draw.kept !== false && !draw.rerolled);
  const namedDraw = keptDraws.length === 1
    && typeof keptDraws[0].outcome.value === 'number'
    && keptDraws[0].outcome.label
    && keptDraws[0].outcome.label !== String(keptDraws[0].outcome.value)
    && result.primaryAggregate?.value === keptDraws[0].calculatedValue
    ? keptDraws[0]
    : null;
  const primaryValue = namedDraw
    ? namedDraw.outcome.label
    : displayAggregateValue(result.primaryAggregate?.value);
  return (
    <>
      <div className="rs-primary-result">
        <span>{result.primaryAggregate?.label || t('random.result.title')}</span>
        <strong>{primaryValue}</strong>
      </div>
      {result.primaryAggregate?.outcome?.text && (
        <div className="rs-linked-outcome-note">
          <strong>
            {result.primaryAggregate.outcome.image
              ? <img className="rs-outcome-text-image" src={result.primaryAggregate.outcome.image} alt="" />
              : result.primaryAggregate.outcome.symbol || result.primaryAggregate.outcome.label}
          </strong>
          <p>{result.primaryAggregate.outcome.text}</p>
        </div>
      )}

      {result.groups.length > 1 && (
        <div className="rs-compared-groups">
          {result.groups.map((group, index) => (
            <span className={group.selected ? 'selected' : ''} key={group.index}>
              {t('random.result.series', { index: index + 1 })}
              <strong>{displayAggregateValue(group.aggregates[0]?.value)}</strong>
            </span>
          ))}
        </div>
      )}

      <DrawGroups
        draws={selectedGroup.draws}
        resultId={result.id}
      />

      <div className="rs-aggregate-list">
        {result.aggregates.map((aggregate) => (
          <div key={aggregate.id}>
            <span>{aggregate.label}</span>
            <strong>{displayAggregateValue(aggregate.value)}</strong>
            {(aggregate.adjustments || []).map((adjustment, index) => (
              <small key={`${aggregate.id}-${index}`}>
                {adjustment.label} {adjustment.value >= 0 ? '+' : ''}{adjustment.value}
              </small>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

function CardResult({ result }) {
  return (
    <>
      <div className="rs-primary-result">
        <span>{result.sourceName}</span>
        <strong>{result.cards.length}</strong>
        <small>{t('random.result.cardsRemaining', { count: result.remaining })}</small>
      </div>
      <div className="rs-card-result-grid">
        {result.cards.map((card) => (
          <div className="rs-card-result" key={card.id}>
            {card.image ? (
              <img src={card.image} alt="" />
            ) : card.symbol ? (
              <span className="rs-card-symbol" aria-hidden="true">{card.symbol}</span>
            ) : null}
            <strong>{card.label}</strong>
            {card.comment && <p>{card.comment}</p>}
            {card.markers?.length > 0 && <small>{card.markers.join(', ')}</small>}
          </div>
        ))}
        {!result.cards.length && <p className="muted">{t('random.result.deckEmpty')}</p>}
      </div>
    </>
  );
}

export const ResultView = memo(function ResultView({ result }) {
  return (
    <section className="rs-result-view" aria-live="polite">
      <div className="rs-section-head">
        <div>
          <span className="rs-section-kicker">{result?.kind === 'card-draw' ? t('random.resource.cards') : t('random.resource.rolls')}</span>
          <div className="rs-heading-with-mark">
            <span className="rs-heading-mark" aria-hidden="true">{result?.kind === 'card-draw' ? uiSymbols.cards : uiSymbols.draw}</span>
            <h3>{t('random.result.title')}</h3>
          </div>
          {result && <span>{result.definitionName || result.sourceName}</span>}
        </div>
        {result && (
          <time dateTime={new Date(result.rolledAt).toISOString()}>
            {new Date(result.rolledAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </time>
        )}
      </div>
      {!result && <div className="rs-empty-state">{t('random.result.empty')}</div>}
      {result?.kind === 'random-roll' && <RollResult result={result} />}
      {result?.kind === 'card-draw' && <CardResult result={result} />}
    </section>
  );
});
