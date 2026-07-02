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
