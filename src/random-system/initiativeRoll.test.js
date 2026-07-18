import { describe, expect, it } from 'vitest';
import { buildRandomDefinition } from './definitionBuilder.js';
import { createStandardSources } from './defaults.js';
import { initiativeApproachOption, initiativeRollInputs } from './initiativeRoll.js';
import { createNoCodeExampleDraft } from './noCodeExamples.js';

describe('initiative roll preparation', () => {
  it('detects the advantage selector exposed by the standard d20 roll', () => {
    const definition = buildRandomDefinition(createNoCodeExampleDraft('d20-advantage', createStandardSources()));

    expect(initiativeApproachOption(definition)).toMatchObject({
      id: 'approach',
      defaultValue: 'normal',
    });
  });

  it('injects the initiative bonus while preserving explicit roll options', () => {
    const definition = buildRandomDefinition(createNoCodeExampleDraft('d20-advantage', createStandardSources()));
    const prepared = initiativeRollInputs(definition, 4, { approach: 'advantage' });

    expect(prepared.parameters.modifier).toBe(4);
    expect(prepared.options.approach).toBe('advantage');
    expect(prepared).toMatchObject({ bonus: 4, bonusInjected: true });
  });
});
