import { randomDefinitionKinds } from './engine.js';

export function directlyExposedDefinitions(definitions) {
  return (Array.isArray(definitions) ? definitions : [])
    .filter((definition) => (
      definition.kind === randomDefinitionKinds.COMBINATION
      || definition.exposed !== false
    ));
}
