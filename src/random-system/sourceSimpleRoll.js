import { randomSourceKinds } from './engine.js';
import { buildRandomDefinition } from './definitionCompiler.js';
import { createDefinitionDraft } from './definitionDraft.js';
import { createResourceId } from './resourceIds.js';

export function createSimpleRollForSource(source, definitions = [], existingDefinition = null) {
  if (!source) return null;
  const draft = createDefinitionDraft([source], definitions);
  const component = draft.components[0];
  draft.id = existingDefinition?.id || createResourceId('definition', source.name);
  draft.name = source.name;
  draft.exposed = existingDefinition?.exposed !== false;
  draft.active = existingDefinition?.active !== false;
  draft.quickAccess = existingDefinition?.quickAccess !== false;
  draft.components = [{
    ...component,
    label: source.name,
    sourceId: source.id,
    sourceKind: source.kind === randomSourceKinds.CARDS ? 'cards' : 'random',
    cardMode: 'draw',
  }];
  return {
    ...buildRandomDefinition(draft),
    sourceId: source.id,
  };
}
