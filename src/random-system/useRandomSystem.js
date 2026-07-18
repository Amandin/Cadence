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
  resolveRandomDecision,
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
import {
  activateRandomKitInState,
  deleteRandomKitFromState,
  ensureRandomKitInState,
  loadRandomKitInState,
  saveRandomKitToState,
} from './rulePresetKits.js';
import { importCadenceLibraryRandomKits } from '../cadLibrary.js';

const PERSISTENCE_DELAY_MS = 250;

function upsertById(items, item) {
  return [item, ...items.filter((current) => current.id !== item.id)];
}

function definitionUsesSource(definition, sourceId) {
  return definition.components.some((component) => (
    (component.source.kind === 'fixed' && component.source.value === sourceId)
    || definition.parameters.some((parameter) => (
      parameter.type === 'source'
      && (parameter.defaultValue === sourceId || parameter.choices?.includes(sourceId))
    ))
  )) || definition.pipeline.some((step) => (
    step.type === 'lookup-table'
    && (step.sourceId === sourceId
      || (step.source?.kind === 'fixed' && step.source.value === sourceId)
      || (step.source?.kind === 'parameter' && definition.parameters.some((parameter) => (
        parameter.id === step.source.parameterId
        && (parameter.defaultValue === sourceId || parameter.choices?.includes(sourceId))
      ))))
  ));
}

export function executeDefinitionFromState(state, definitionId, parameters, options, instances) {
  const definition = (state?.definitions || []).find((item) => item.id === definitionId);
  if (!definition) return null;
  const prepared = prepareCombinedDefinition(definition, state.definitions, options);
  return executeRandomDefinition({
    definition: prepared.definition,
    sources: state.sources,
    sourceStates: state.sourceStates,
    parameters,
    options,
    instances,
  });
}

export function executeAdHocDefinitionFromState(state, definition, parameters, options, instances) {
  if (!definition) return null;
  const normalized = normalizeRandomDefinition(definition);
  const prepared = prepareCombinedDefinition(normalized, state?.definitions || [], options);
  return executeRandomDefinition({
    definition: prepared.definition,
    sources: state?.sources || [],
    sourceStates: state?.sourceStates || {},
    parameters,
    options,
    instances,
  });
}

export function useRandomSystem(controlled = {}) {
  const controlledMode = controlled.state && controlled.setState;
  const [localState, setLocalState] = useState(loadRandomSystemState);
  const state = controlledMode ? normalizeRandomSystemState(controlled.state) : localState;
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const commitState = useCallback((nextOrUpdater) => {
    const next = typeof nextOrUpdater === 'function'
      ? nextOrUpdater(stateRef.current)
      : nextOrUpdater;
    const normalized = normalizeRandomSystemState(next);
    stateRef.current = normalized;
    if (controlledMode) controlled.setState(normalized);
    else setLocalState(normalized);
    return normalized;
  }, [controlled, controlledMode]);

  useEffect(() => {
    if (controlledMode) return undefined;
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
  }, [controlledMode, state]);

  const runDefinitionTransient = useCallback((definitionId, parameters, options, instances) => {
    return executeDefinitionFromState(stateRef.current, definitionId, parameters, options, instances);
  }, []);

  const runDefinition = useCallback((definitionId, parameters, options, instances) => {
    const result = runDefinitionTransient(definitionId, parameters, options, instances);
    if (!result) return null;
    if (result.kind === 'random-decision') return result;
    const current = stateRef.current;
    const { sourceStates: nextSourceStates, ...recordedResult } = result;
    const next = recordRandomResult({ ...current, sourceStates: nextSourceStates || current.sourceStates }, recordedResult);
    commitState(next);
    return recordedResult;
  }, [commitState, runDefinitionTransient]);

  const runAdHocDefinition = useCallback((definition, parameters, options, instances) => {
    const result = executeAdHocDefinitionFromState(stateRef.current, definition, parameters, options, instances);
    if (!result) return null;
    if (result.kind === 'random-decision') return result;
    const current = stateRef.current;
    const { sourceStates: nextSourceStates, ...recordedResult } = result;
    commitState(recordRandomResult({
      ...current,
      sourceStates: nextSourceStates || current.sourceStates,
    }, recordedResult));
    return recordedResult;
  }, [commitState]);

  const resolveDefinitionDecision = useCallback((pendingResult, accepted) => {
    const result = resolveRandomDecision(pendingResult, accepted);
    if (!result || result.kind === 'random-decision') return result;
    const current = stateRef.current;
    const { sourceStates: nextSourceStates, ...recordedResult } = result;
    commitState(recordRandomResult({ ...current, sourceStates: nextSourceStates || current.sourceStates }, recordedResult));
    return recordedResult;
  }, [commitState]);

  const saveDefinition = useCallback((definition) => {
    const normalized = normalizeRandomDefinition(definition);
    commitState((current) => ({
      ...current,
      definitions: upsertById(current.definitions, normalized),
    }));
    return normalized;
  }, [commitState]);

  const setDefinitionActive = useCallback((definitionId, active) => {
    commitState((current) => ({
      ...current,
      definitions: current.definitions.map((definition) => (
        definition.id === definitionId && definition.exposed !== false
          ? { ...definition, active: !!active }
          : definition
      )),
    }));
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

  const ensureRandomKit = useCallback((kitOrId) => {
    let nextState = null;
    commitState((current) => {
      nextState = ensureRandomKitInState(current, kitOrId);
      return nextState;
    });
    return nextState;
  }, [commitState]);

  const loadRandomKit = useCallback((kitOrId) => {
    let nextState = null;
    commitState((current) => {
      nextState = loadRandomKitInState(current, kitOrId);
      return nextState;
    });
    return nextState;
  }, [commitState]);

  const activateRandomKit = useCallback((kitOrId) => {
    let nextState = null;
    commitState((current) => {
      nextState = activateRandomKitInState(current, kitOrId);
      return nextState;
    });
    return nextState;
  }, [commitState]);

  const saveRandomKit = useCallback((kit) => {
    let saved = null;
    commitState((current) => {
      const next = saveRandomKitToState(current, kit);
      saved = next.randomKits[0] || null;
      return next;
    });
    return saved;
  }, [commitState]);

  const deleteRandomKit = useCallback((kitId) => {
    commitState((current) => deleteRandomKitFromState(current, kitId));
  }, [commitState]);

  const importRandomLibrary = useCallback((libraryPayload) => {
    let result = null;
    commitState((current) => {
      result = importCadenceLibraryRandomKits(current, libraryPayload);
      return result.state;
    });
    return result;
  }, [commitState]);

  const resetModule = useCallback(() => {
    commitState(normalizeRandomSystemState(null));
  }, [commitState]);

  const actions = useMemo(() => ({
    runDefinition,
    runDefinitionTransient,
    runAdHocDefinition,
    resolveDefinitionDecision,
    saveDefinition,
    setDefinitionActive,
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
    ensureRandomKit,
    loadRandomKit,
    activateRandomKit,
    saveRandomKit,
    deleteRandomKit,
    importRandomLibrary,
    resetModule,
  }), [
    clearHistory,
    activateRandomKit,
    deleteDefinition,
    deleteRandomKit,
    deleteSource,
    drawCards,
    enableAllRules,
    ensureRandomKit,
    importRandomLibrary,
    loadRandomKit,
    resetCardSource,
    resetModule,
    resetStatistics,
    returnCards,
    runDefinition,
    runDefinitionTransient,
    runAdHocDefinition,
    resolveDefinitionDecision,
    saveDefinition,
    setDefinitionActive,
    saveRandomKit,
    saveSource,
    selectResult,
    setRuleEnabled,
    useEssentialRules,
  ]);

  return { state, actions };
}
