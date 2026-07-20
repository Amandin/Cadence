function incrementRecord(record, key, amount = 1) {
  return { ...record, [key]: (Number(record[key]) || 0) + amount };
}

function statisticsForRoll(statistics, result) {
  const next = {
    ...statistics,
    totalUses: statistics.totalUses + 1,
    byDefinition: incrementRecord(statistics.byDefinition, result.definitionId),
    bySource: { ...statistics.bySource },
  };
  const draws = result.groups.flatMap((group) => group.draws);
  next.totalDraws += draws.length;
  const mutableSourceStats = new Map();
  for (const draw of draws) {
    if (!mutableSourceStats.has(draw.sourceId)) {
      const current = next.bySource[draw.sourceId] || { count: 0, outcomes: {} };
      const mutable = { count: current.count, outcomes: { ...current.outcomes } };
      mutableSourceStats.set(draw.sourceId, mutable);
      next.bySource[draw.sourceId] = mutable;
    }
    const sourceStats = mutableSourceStats.get(draw.sourceId);
    sourceStats.count += 1;
    sourceStats.outcomes[draw.outcome.id] = (sourceStats.outcomes[draw.outcome.id] || 0) + 1;
  }
  return next;
}

function statisticsForCards(statistics, result) {
  const current = statistics.bySource[result.sourceId] || { count: 0, outcomes: {} };
  const sourceStats = {
    count: current.count + result.cards.length,
    outcomes: { ...current.outcomes },
  };
  result.cards.forEach((card) => {
    sourceStats.outcomes[card.id] = (sourceStats.outcomes[card.id] || 0) + 1;
  });
  return {
    ...statistics,
    totalUses: statistics.totalUses + 1,
    totalDraws: statistics.totalDraws + result.cards.length,
    bySource: {
      ...statistics.bySource,
      [result.sourceId]: sourceStats,
    },
  };
}

function statisticsForTokens(statistics, result) {
  const current = statistics.bySource[result.sourceId] || { count: 0, outcomes: {} };
  const sourceStats = {
    count: current.count + result.tokens.length,
    outcomes: { ...current.outcomes },
  };
  result.tokens.forEach((token) => {
    sourceStats.outcomes[token.typeId] = (sourceStats.outcomes[token.typeId] || 0) + 1;
  });
  return {
    ...statistics,
    totalUses: statistics.totalUses + 1,
    totalDraws: statistics.totalDraws + result.tokens.length,
    bySource: {
      ...statistics.bySource,
      [result.sourceId]: sourceStats,
    },
  };
}

export function recordRandomResult(state, result, { schemaVersion, normalizeState, historyLimit }) {
  const current = state?.schemaVersion === schemaVersion
    ? state
    : normalizeState(state);
  const statistics = result.kind === 'card-draw'
    ? statisticsForCards(current.statistics, result)
    : result.kind === 'token-draw'
      ? statisticsForTokens(current.statistics, result)
      : statisticsForRoll(current.statistics, result);
  return {
    ...current,
    lastResult: result,
    history: [result, ...current.history.filter((item) => item.id !== result.id)].slice(0, historyLimit),
    statistics,
  };
}
