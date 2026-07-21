import { describe, expect, it } from 'vitest';
import { createStandardSources } from '.././defaults.js';
import { executeRandomDefinition, resolveRandomDecision } from '.././engine.js';
import { compileRollCode, parseRollCode, RollCodeError } from '.././rollCode.js';
import { createDefaultRandomSystemState, exportRandomSystemStateForCampaign } from '.././state.js';
import { createCardSourceState } from '.././cardSources.js';

const sources = createStandardSources();

describe('roll code language', () => {
  it('offers independent boolean questions for roll operations', () => {
    const definition = compileRollCode(
      '1d6! option(explosion, Explosion, oui) r=1 option(relance, Relance)',
      { id: 'independent-questions', sources },
    );
    expect(definition.options).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Explosion', type: 'boolean', defaultValue: true }),
      expect.objectContaining({ label: 'Relance', type: 'boolean', defaultValue: false }),
    ]));
    const explosionOption = definition.options.find((option) => option.label === 'Explosion');
    const rerollOption = definition.options.find((option) => option.label === 'Relance');
    expect(definition.pipeline).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'explode', enabledWhen: { optionId: explosionOption.id, equals: true } }),
      expect.objectContaining({ type: 'reroll', enabledWhen: { optionId: rerollOption.id, equals: true } }),
    ]));

    let index = 0;
    const result = executeRandomDefinition({
      definition,
      sources,
      options: { [explosionOption.id]: false, [rerollOption.id]: true },
      rng: () => [0, 0.5][index++],
    });
    expect(result.draws).toHaveLength(2);
    expect(result.primaryAggregate.value).toBe(4);
  });

  it('repeats a named formula a calculated number of times without pooling its calls', () => {
    const definition = compileRollCode(
      'simple=2d6kh1; total=[nombre]@simple',
      { id: 'dynamic-named-calls', sources },
    );
    let index = 0;
    const result = executeRandomDefinition({
      definition,
      sources,
      parameters: { nombre: 2 },
      rng: () => [0.99, 0, 0.2, 0.8][index++],
    });
    expect(result.draws).toHaveLength(4);
    expect(result.primaryAggregate.value).toBe(11);
  });

  it('shares a named roll choice across repeated independent calls', () => {
    const definition = compileRollCode(`
      d20a=choice(normal) {
        désavantage: 2d20kl1;
        normal: 1d20;
        avantage: 2d20kh1
      };
      double=2@d20a
    `, { id: 'double-choice-call', sources });
    expect(definition.options).toHaveLength(1);
    expect(definition.components).toHaveLength(6);
    let index = 0;
    const result = executeRandomDefinition({
      definition,
      sources,
      options: { 'code-choice-1': 'choice-3' },
      rng: () => [0, 0.9, 0.45, 0.5][index++],
    });
    expect(result.draws).toHaveLength(4);
    expect(result.primaryAggregate.value).toBe(30);
  });

  it('combines the conditions of nested named and outer choices', () => {
    const definition = compileRollCode(`
      inner=choice(d6) {
        d6: 1d6;
        d8: 1d8
      };
      outer=choice(non) {
        oui: @inner;
        non: none
      }
    `, { id: 'nested-named-choice', sources });
    let defaultCalls = 0;
    const disabled = executeRandomDefinition({
      definition,
      sources,
      rng: () => { defaultCalls += 1; return 0; },
    });
    expect(defaultCalls).toBe(0);
    expect(disabled.draws).toHaveLength(0);

    const enabled = executeRandomDefinition({
      definition,
      sources,
      options: { 'code-choice-1': 'choice-2', 'code-choice-2': 'choice-1' },
      rng: () => 0.9,
    });
    expect(enabled.draws).toHaveLength(1);
    expect(enabled.draws[0].sourceId).toBe('standard-d8');
  });

  it('falls back to a source for @name and lets d@name force the source namespace', () => {
    const fallback = compileRollCode('source intrigue=d6; total=2@intrigue', { id: 'source-fallback', sources });
    expect(fallback.components).toHaveLength(1);
    expect(fallback.components[0].count).toEqual({ kind: 'fixed', value: 2 });

    const collision = compileRollCode(`
      source intrigue=d6;
      intrigue=1d20;
      total=@intrigue+d@intrigue
    `, { id: 'name-collision', sources });
    let index = 0;
    const result = executeRandomDefinition({
      definition: collision,
      sources,
      rng: () => [0.45, 0.45][index++],
    });
    expect(result.primaryAggregate.value).toBe(13);
    expect(result.draws.map((draw) => draw.sourceId)).toEqual(['standard-d20', 'standard-d6']);
  });

  it('counts successes with s and supports rerolls with r', () => {
    const definition = compileRollCode('4d6r=1s>=5', { id: 'successes', sources });
    const sequence = [0, 0.7, 0.9, 0.2, 0.8];
    let index = 0;
    const result = executeRandomDefinition({ definition, sources, rng: () => sequence[index++] });
    expect(result.primaryAggregate.value).toBe(3);
  });

  it('accepts a direct comparison as a success shorthand', () => {
    const definition = compileRollCode('3d10>6', { id: 'success-shorthand', sources });
    let index = 0;
    const result = executeRandomDefinition({
      definition,
      sources,
      rng: () => [0.9, 0.6, 0][index++],
    });
    expect(result.primaryAggregate.value).toBe(2);
  });

  it('rerolls once with r and recursively with rr', () => {
    const once = compileRollCode('1d6r=1', { id: 'once', sources });
    let onceIndex = 0;
    const onceResult = executeRandomDefinition({ definition: once, sources, rng: () => [0, 0][onceIndex++] });
    expect(onceResult.primaryAggregate.value).toBe(1);
    expect(onceResult.draws).toHaveLength(2);

    const recursive = compileRollCode('1d6rr=1', { id: 'recursive', sources });
    let recursiveIndex = 0;
    const recursiveResult = executeRandomDefinition({ definition: recursive, sources, rng: () => [0, 0, 0.9][recursiveIndex++] });
    expect(recursiveResult.primaryAggregate.value).toBe(6);
    expect(recursiveResult.draws).toHaveLength(3);
  });

  it('turns !? and r? into decisions made after seeing a matching result', () => {
    const definition = compileRollCode('1d6!?+1d6r?=1', { id: 'optional', sources });
    expect(definition.options).toEqual([]);
    expect(definition.pipeline).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'explode-code-roll-1', decision: 'after-roll' }),
      expect.objectContaining({ id: 'reroll-code-roll-2', decision: 'after-roll' }),
    ]));

    const explosion = compileRollCode('1d6!?', { id: 'optional-explosion', sources });
    let index = 0;
    const pending = executeRandomDefinition({
      definition: explosion,
      sources,
      rng: () => [0.9, 0][index++],
    });
    expect(pending.kind).toBe('random-decision');
    expect(pending.draws[0].outcome.value).toBe(6);
    const disabled = resolveRandomDecision(pending, false, () => 0);
    expect(disabled.primaryAggregate.value).toBe(6);
    const enabled = resolveRandomDecision(pending, true, () => 0);
    expect(enabled.primaryAggregate.value).toBe(7);
  });

  it('can decide whether to keep the highest result after seeing the dice', () => {
    const definition = compileRollCode('2d20kh1?', { id: 'optional-keep', sources });
    let index = 0;
    const pending = executeRandomDefinition({
      definition,
      sources,
      rng: () => [0, 0.99][index++],
    });
    expect(pending.kind).toBe('random-decision');
    expect(resolveRandomDecision(pending, true).primaryAggregate.value).toBe(20);
    expect(resolveRandomDecision(pending, false).primaryAggregate.value).toBe(21);
  });

  it('chains several after-roll decisions while replaying the original dice', () => {
    const definition = compileRollCode('2d6!?kh1?', { id: 'sequential-decisions', sources });
    let index = 0;
    const explosionDecision = executeRandomDefinition({
      definition,
      sources,
      rng: () => [0.99, 0][index++],
    });
    const keepDecision = resolveRandomDecision(explosionDecision, false);
    expect(keepDecision.kind).toBe('random-decision');
    expect(keepDecision.draws.map((draw) => draw.outcome.value)).toEqual([6, 1]);
    expect(resolveRandomDecision(keepDecision, true).primaryAggregate.value).toBe(6);
  });

  it('exposes every success condition as a separate counter', () => {
    const definition = compileRollCode('8d6s>=5s=1', { id: 'two-counters', sources });
    const sequence = [0, 0.2, 0.4, 0.6, 0.7, 0.8, 0.9, 0.1];
    let index = 0;
    const result = executeRandomDefinition({ definition, sources, rng: () => sequence[index++] });
    expect(result.primaryAggregate.value).toBe(3);
    expect(result.aggregates.find((item) => item.id === 'code-roll-1-success-1').value).toBe(3);
    expect(result.aggregates.find((item) => item.id === 'code-roll-1-success-2').value).toBe(2);
  });

  it('adds a success bonus for repeated matching faces', () => {
    const definition = compileRollCode(
      '4d10s>6; bonus.occurrence(si=10,tous=2,ajouter=2)',
      { id: 'occurrence-bonus', sources },
    );
    let index = 0;
    const result = executeRandomDefinition({
      definition,
      sources,
      rng: () => [0.99, 0.99, 0.65, 0][index++],
    });
    expect(result.primaryAggregate.value).toBe(5);
    expect(result.primaryAggregate.adjustments).toEqual([
      expect.objectContaining({ occurrences: 2, every: 2, amount: 2, value: 2 }),
    ]);
  });

  it('can apply an occurrence bonus to a selected success counter', () => {
    const definition = compileRollCode(
      '4d10s>=6s=10; bonus.occurrence(si=10,tous=2,ajouter=1,sur=1,compteur=2)',
      { id: 'counter-occurrence', sources },
    );
    let index = 0;
    const result = executeRandomDefinition({
      definition,
      sources,
      rng: () => [0.99, 0.99, 0.7, 0][index++],
    });
    expect(result.aggregates.find((aggregate) => aggregate.id === 'code-roll-1-success-2').value).toBe(3);
  });

  it('scopes occurrence bonuses and face mappings to selected roll groups', () => {
    const definition = compileRollCode(
      '2d6s>=5+2d6s>=5; valeur(si=1,devient=6,sur=1); bonus.occurrence(si=6,tous=2,ajouter=3,sur=2)',
      { id: 'scoped-treatments', sources },
    );
    let index = 0;
    const result = executeRandomDefinition({
      definition,
      sources,
      rng: () => [0, 0, 0.99, 0.99][index++],
    });
    expect(result.primaryAggregate.value).toBe(7);
    expect(result.primaryAggregate.adjustments[0]).toEqual(expect.objectContaining({ occurrences: 2, value: 3 }));
  });

  it('creates and counts named markers in an expression', () => {
    const definition = compileRollCode(
      'marqueurs(4d6,echec); marque(echec,si=1)',
      { id: 'marker-language', sources },
    );
    let index = 0;
    const result = executeRandomDefinition({
      definition,
      sources,
      rng: () => [0, 0.2, 0, 0.9][index++],
    });
    expect(result.primaryAggregate.value).toBe(2);
  });

  it('looks the final numeric result up in a weighted table', () => {
    const table = {
      id: 'critique',
      name: 'Critique',
      kind: 'weighted',
      outcomes: [
        { id: 'one', value: 1, label: 'Complication', weight: 1 },
        { id: 'two', value: 2, label: 'Avantage', weight: 1 },
      ],
    };
    const definition = compileRollCode(
      'source effets=critique; 1d6; table(@effets)',
      { id: 'table-language', sources: [...sources, table] },
    );
    const result = executeRandomDefinition({
      definition,
      sources: [...sources, table],
      rng: () => 0,
    });
    expect(result.primaryAggregate.value).toBe('Complication');
  });

  it('draws cards without replacement and supports an explicit replacement mode', () => {
    const deck = {
      id: 'test-deck',
      name: 'Paquet test',
      kind: 'cards',
      cards: [
        { id: 'one', label: 'Un', value: 1 },
        { id: 'two', label: 'Deux', value: 2 },
        { id: 'three', label: 'Trois', value: 3 },
      ],
    };
    const deckState = createCardSourceState(deck, () => 0.99);
    const definition = compileRollCode(
      'source paquet=test-deck; 2c@paquet',
      { id: 'card-language', sources: [...sources, deck] },
    );
    const result = executeRandomDefinition({
      definition,
      sources: [...sources, deck],
      sourceStates: { [deck.id]: deckState },
    });
    expect(result.draws).toHaveLength(2);
    expect(result.sourceStates[deck.id].drawPile).toHaveLength(1);

    const replacement = compileRollCode(
      'source paquet=test-deck; 4c@paquet(remise)',
      { id: 'card-replacement-language', sources: [...sources, deck] },
    );
    const replacementResult = executeRandomDefinition({
      definition: replacement,
      sources: [...sources, deck],
      sourceStates: { [deck.id]: deckState },
      rng: () => 0,
    });
    expect(replacementResult.draws).toHaveLength(4);
    expect(replacementResult.sourceStates[deck.id].drawPile).toHaveLength(3);
  });

  it('rejects variable type confusion at parse time', () => {
    expect(() => parseRollCode('source die=d6; [die]+1')).toThrow(RollCodeError);
    expect(() => parseRollCode('number pool=3; 1d@pool')).toThrow(/pas une source/);
  });

  it('reports an unavailable source while compiling', () => {
    expect(() => compileRollCode('1d42', { sources })).toThrow(/introuvable/);
  });
});
