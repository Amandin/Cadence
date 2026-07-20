import { randomDefinitionKinds } from './engine.js';

export function directlyExposedDefinitions(definitions) {
  return (Array.isArray(definitions) ? definitions : [])
    .filter((definition) => (
      definition.kind === randomDefinitionKinds.COMBINATION
      || definition.exposed !== false
    ));
}

export function activeDefinitions(definitions) {
  return directlyExposedDefinitions(definitions)
    .filter((definition) => definition.active !== false);
}

export function quickDefinitions(definitions) {
  return activeDefinitions(definitions).filter((definition) => definition.quickAccess !== false);
}

export function exposedTokenContainers(containers) {
  return (Array.isArray(containers) ? containers : []).filter((container) => container.exposed !== false);
}

export function quickTokenContainers(containers) {
  return exposedTokenContainers(containers).filter((container) => container.quickAccess !== false);
}

export function tokenContainerResourceId(containerId) {
  return `__tokens__:${containerId}`;
}

export function tokenContainerIdFromResourceId(resourceId) {
  return String(resourceId || '').startsWith('__tokens__:') ? String(resourceId).slice(11) : '';
}

export function definitionsForUse(definitions, requiredDefinitionIds = []) {
  const requiredIds = new Set(requiredDefinitionIds.filter(Boolean));
  return directlyExposedDefinitions(definitions)
    .filter((definition) => definition.active !== false || requiredIds.has(definition.id));
}

export function definitionSourceIds(definition = {}) {
  return [
    ...(definition.components || []).flatMap((component) => {
      if (component.source?.kind === 'fixed') return [component.source.value];
      const parameter = (definition.parameters || []).find((item) => item.id === component.source?.parameterId);
      return parameter?.type === 'source'
        ? [parameter.defaultValue, ...(parameter.choices || [])]
        : [];
    }),
    ...(definition.pipeline || []).flatMap((step) => {
      if (step.type !== 'lookup-table') return [];
      if (step.source?.kind === 'fixed') return [step.source.value];
      if (step.source?.kind === 'parameter') {
        const parameter = (definition.parameters || []).find((item) => item.id === step.source.parameterId);
        return parameter ? [parameter.defaultValue, ...(parameter.choices || [])] : [];
      }
      return [step.sourceId];
    }),
  ].filter(Boolean);
}

export function activeCardSources(sources, definitions, { requiredDefinitionIds = [], requiredSourceIds = [] } = {}) {
  const sourceIds = new Set([
    ...requiredSourceIds,
    ...definitionsForUse(definitions, requiredDefinitionIds).flatMap(definitionSourceIds),
  ]);
  return (Array.isArray(sources) ? sources : [])
    .filter((source) => source.kind === 'cards' && sourceIds.has(source.id));
}
