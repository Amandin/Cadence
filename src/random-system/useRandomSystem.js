import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  drawCards as executeCardDraw,
  normalizeCardSourceState,
  resetCardSource as createResetCardSource,
  returnCardsToSource,
} from './cardSources.js';
import { definitionIsReferenced, prepareCombinedDefinition } from './combinations.js';
import {
  executeRandomDefinition,
  normalizeRandomDefinition,
  normalizeRandomSource,
  randomSourceKinds,
} from './engine.js';
import { emptyRandomStatistics, normalizeRandomSystemState, recordRandomResult } from './state.js';
import { loadRandomSystemState, saveRandomSystemState } from './storage.js';
import {
  essentialRandomRuleIds,
  randomRuleCatalogue,
  setRandomRuleEnabled,
} from './rulePool.js';

const PERSISTENCE_DELAY_MS = 250;

function upsertById(items, item) {
  return [item, ...items.filter((current) => current.id !== item.id)];
}

function definitionUsesSource(definition, sourceId) {
  return definition.components.some((component) => (
    (component.source.kind === 'fixed' && component.source.value === sourceId)
    || definition.parameters.some((parameter) => parameter.type === 'source' && parameter.defaultValue === sourceId)
  )) || definition.pipeline.some((step) => step.type === 'lookup-table' && step.sourceId === sourceId);
}

export function useRandomSystem() {
  const [state, setState] = useState(loadRandomSystemState);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const commitState = useCallback((nextOrUpdater) => {
    const next = typeof nextOrUpdater === 'function'
      ? nextOrUpdater(stateRef.current)
      : nextOrUpdater;
    stateRef.current = next;
    setState(next);
    return next;
  }, []);

  useEffect(() => {
    let idleId = null;
    const timer = window.setTimeout(() => {
      if (window.requestIdleCallback) {
        idleId = window.requestIdleCallback(() => saveRandomSystemState(state), { timeout: 1200 });
      } else {
        saveRandomSystemState(state);
      }
    }, PERSISTENCE_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      if (idleId !== null) window.cancelIdleCallback?.(idleId);
    };
  }, [state]);

  const runDefinition = useCallback((definitionId, parameters, options) => {
    const current = stateRef.current;
    const definition = current.definitions.find((item) => item.id === definitionId);
    if (!definition) return null;
    const prepared = prepareCombinedDefinition(definition, current.definitions, options);
    const result = executeRandomDefinition({
      definition: prepared.definition,
      sources: current.sources.filter((source) => source.kind !== randomSourceKinds.CARDS),
      parameters,
      options,
    });
    const next = recordRandomResult(current, result);
    commitState(next);
    return result;
  }, [commitState]);

  const saveDefinition = useCallback((definition) => {
    const normalized = normalizeRandomDefinition(definition);
    commitState((current) => ({
      ...current,
      definitions: upsertById(current.definitions, normalized),
    }));
    return normalized;
  }, [commitState]);

  const deleteDefinition = useCallback((definitionId) => {
    if (definitionIsReferenced(stateRef.current.definitions, definitionId)) return false;
    const next = {
      ...stateRef.current,
      definitions: stateRef.current.definitions.filter((item) => item.id !== definitionId),
    };
    commitState(next);
    return true;
  }, [commitState]);

  const saveSource = useCallback((source) => {
    const normalized = normalizeRandomSource(source);
    commitState((current) => {
      if (normalized.kind !== randomSourceKinds.CARDS) {
        return {
          ...current,
          sources: upsertById(current.sources, normalized),
        };
      }
      const previous = current.sources.find((item) => item.id === normalized.id);
      const rulesChanged = !previous
        || previous.cards.length !== normalized.cards.length
        || previous.cards.some((card, index) => card.id !== normalized.cards[index]?.id);
      return {
        ...current,
        sources: upsertById(current.sources, normalized),
        sourceStates: {
          ...current.sourceStates,
          [normalized.id]: rulesChanged
            ? createResetCardSource(normalized)
            : normalizeCardSourceState(normalized, current.sourceStates[normalized.id]),
        },
      };
    });
    return normalized;
  }, [commitState]);

  const deleteSource = useCallback((sourceId) => {
    const current = stateRef.current;
    if (current.definitions.some((definition) => definitionUsesSource(definition, sourceId))) return false;
    const source = current.sources.find((item) => item.id === sourceId);
    const sourceStates = { ...current.sourceStates };
    if (source?.kind === randomSourceKinds.CARDS) delete sourceStates[sourceId];
    commitState({
      ...current,
      sources: current.sources.filter((item) => item.id !== sourceId),
      sourceStates,
    });
    return true;
  }, [commitState]);

  const drawCards = useCallback((sourceId, count = 1, drawMode = 'draw') => {
    const current = stateRef.current;
    const source = current.sources.find(
      (item) => item.id === sourceId && item.kind === randomSourceKinds.CARDS,
    );
    if (!source) return null;
    const draw = executeCardDraw(source, current.sourceStates[sourceId], count, {
      withReplacement: drawMode === 'replacement',
    });
    const next = recordRandomResult({
      ...current,
      sourceStates: { ...current.sourceStates, [sourceId]: draw.state },
    }, draw.result);
    commitState(next);
    return draw.result;
  }, [commitState]);

  const returnCards = useCallback((sourceId, cardIds) => {
    commitState((current) => {
      const source = current.sources.find(
        (item) => item.id === sourceId && item.kind === randomSourceKinds.CARDS,
      );
      if (!source) return current;
      return {
        ...current,
        sourceStates: {
          ...current.sourceStates,
          [sourceId]: returnCardsToSource(source, current.sourceStates[sourceId], cardIds),
        },
      };
    });
  }, [commitState]);

  const resetCardSource = useCallback((sourceId) => {
    commitState((current) => {
      const source = current.sources.find(
        (item) => item.id === sourceId && item.kind === randomSourceKinds.CARDS,
      );
      if (!source) return current;
      return {
        ...current,
        sourceStates: { ...current.sourceStates, [sourceId]: createResetCardSource(source) },
      };
    });
  }, [commitState]);

  const clearHistory = useCallback(() => {
    commitState((current) => ({ ...current, lastResult: null, history: [] }));
  }, [commitState]);

  const selectResult = useCallback((resultId) => {
    commitState((current) => ({
      ...current,
      lastResult: current.history.find((item) => item.id === resultId) || current.lastResult,
    }));
  }, [commitState]);

  const resetStatistics = useCallback(() => {
    commitState((current) => ({ ...current, statistics: emptyRandomStatistics() }));
  }, [commitState]);

  const setRuleEnabled = useCallback((ruleId, enabled) => {
    commitState((current) => ({
      ...current,
      rulePool: setRandomRuleEnabled(current.rulePool, ruleId, enabled),
    }));
  }, [commitState]);

  const enableAllRules = useCallback(() => {
    commitState((current) => ({
      ...current,
      rulePool: { enabledRuleIds: randomRuleCatalogue.map((rule) => rule.id) },
    }));
  }, [commitState]);

  const useEssentialRules = useCallback(() => {
    commitState((current) => ({
      ...current,
      rulePool: { enabledRuleIds: [...essentialRandomRuleIds] },
    }));
  }, [commitState]);

  const resetModule = useCallback(() => {
    commitState(normalizeRandomSystemState(null));
  }, [commitState]);

  const actions = useMemo(() => ({
    runDefinition,
    saveDefinition,
    deleteDefinition,
    saveSource,
    deleteSource,
    drawCards,
    returnCards,
    resetCardSource,
    clearHistory,
    selectResult,
    resetStatistics,
    setRuleEnabled,
    enableAllRules,
    useEssentialRules,
    resetModule,
  }), [
    clearHistory,
    deleteDefinition,
    deleteSource,
    drawCards,
    enableAllRules,
    resetCardSource,
    resetModule,
    resetStatistics,
    returnCards,
    runDefinition,
    saveDefinition,
    saveSource,
    selectResult,
    setRuleEnabled,
    useEssentialRules,
  ]);

  return { state, actions };
}
