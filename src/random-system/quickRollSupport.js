export const QUICK_ROLL_MEMORY_KEY = 'cadence:quick-roll:last:v1';

export function readQuickRollMemory() {
  try {
    const value = JSON.parse(window.localStorage.getItem(QUICK_ROLL_MEMORY_KEY) || 'null');
    return value && typeof value === 'object' ? value : null;
  } catch {
    return null;
  }
}

export function writeQuickRollMemory(value) {
  try {
    window.localStorage.setItem(QUICK_ROLL_MEMORY_KEY, JSON.stringify(value));
  } catch {
    // La mémoire du lanceur reste facultative si le stockage est indisponible.
  }
}

export function modifierParameterIds(definition = {}) {
  return ((definition || {}).parameters || [])
    .filter((parameter) => parameter.id === 'modifier' || /modificateur/i.test(parameter.label || ''))
    .map((parameter) => parameter.id);
}

export function defaultQuickModifiers(definition, parameters = {}) {
  const nextParameters = { ...(parameters || {}) };
  modifierParameterIds(definition).forEach((id) => {
    if (nextParameters[id] === '' || nextParameters[id] === null || nextParameters[id] === undefined) nextParameters[id] = 0;
  });
  return nextParameters;
}

function quickParameterRank(parameter = {}) {
  const description = `${parameter.id || ''} ${parameter.label || ''}`.toLocaleLowerCase('fr');
  if (/keep.*count|count.*keep|résultats? gardés?|dés? gardés?/.test(description)) return 3;
  if (parameter.id === 'modifier' || /modificateur/.test(description)) return 4;
  if (parameter.type === 'source') return 2;
  if (/count|quantité|nombre|dés? lancés?/.test(description)) return 1;
  return 3;
}

export function quickParameterComparator(left, right) {
  return quickParameterRank(left) - quickParameterRank(right);
}

export function settleOptionalDecisions(initialResult, resolveDecision) {
  const decisions = [];
  let current = initialResult;
  while (current?.kind === 'random-decision') {
    decisions.push(current);
    const next = resolveDecision?.(current, false);
    if (!next || next === current) return current;
    current = next;
  }
  return decisions.length && current ? { ...current, optionalDecisions: decisions } : current;
}

export function newDrawAnimationIds(nextResult, previousResult) {
  const previousDrawIds = new Set((previousResult?.draws || []).map((draw) => draw.id));
  return (nextResult?.draws || []).flatMap((draw) => previousDrawIds.has(draw.id) ? [] : [draw.id]);
}
