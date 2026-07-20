import { describe, expect, it } from 'vitest';
import { createStandardSources } from '.././defaults.js';
import { executeRandomDefinition, resolveRandomDecision } from '.././engine.js';
import { compileRollCode, parseRollCode, RollCodeError } from '.././rollCode.js';
import { createDefaultRandomSystemState, exportRandomSystemStateForCampaign } from '.././state.js';
import { createCardSourceState } from '.././cardSources.js';

const sources = createStandardSources();

describe('roll code language', () => {
  it('parses the compact expert notation', () => {
    const program = parseRollCode('1d10!+5d6-3d4k2');
    expect(program.rolls).toHaveLength(3);
    expect(program.rolls[0].explode).toMatchObject({ optional: false });
    expect(program.rolls[2].keep).toMatchObject({ order: 'highest' });
    expect(program.rolls[2].keep.count.value).toBe(2);
  });

  it('uses ! for explosions and keeps * unambiguously for multiplication', () => {
    expect(parseRollCode('1d6!').rolls[0].explode).toMatchObject({ optional: false });
    const multiplied = parseRollCode('1d6*2');
    expect(multiplied.rolls[0].explode).toBeNull();
    expect(multiplied.expression.operator).toBe('*');
  });

  it('calculates dice counts from parameters and arithmetic', () => {
    const definition = compileRollCode(
      'max([pool]-[sang],0)d10s>6+[sang]d10s>6',
      { id: 'split-pool', sources },
    );
    let index = 0;
    const result = executeRandomDefinition({
      definition,
      sources,
      parameters: { pool: 5, sang: 2 },
      rng: () => [0.7, 0.8, 0.9, 0.6, 0][index++],
    });
    expect(result.draws).toHaveLength(5);
    expect(result.primaryAggregate.value).toBe(4);
  });

  it('supports min, max and explicit lower and upper rounding', () => {
    const definition = compileRollCode(
      'arrondi.inf([pool]/2)d6+arrondi.sup([pool]/2)d8+min(5,max(2,[bonus]))',
      { id: 'numeric-functions', sources },
    );
    const result = executeRandomDefinition({
      definition,
      sources,
      parameters: { pool: 3, bonus: 9 },
      rng: () => 0,
    });
    expect(result.draws).toHaveLength(3);
    expect(result.primaryAggregate.value).toBe(8);
  });

  it('uses numeric calculations in thresholds and keep counts', () => {
    const definition = compileRollCode(
      '4d10s>max([difficulte],6)+4d6kh(arrondi.sup([garde]/2))',
      { id: 'calculated-modifiers', sources },
    );
    let index = 0;
    const result = executeRandomDefinition({
      definition,
      sources,
      parameters: { difficulte: 7, garde: 3 },
      rng: () => [0.9, 0.7, 0.6, 0, 0, 0.2, 0.5, 0.9][index++],
    });
    expect(result.primaryAggregate.value).toBe(12);
  });

  it('combines success conditions with et, ou and non', () => {
    const definition = compileRollCode(
      '4d10s(>=6 et non =10)',
      { id: 'logical-success', sources },
    );
    let index = 0;
    const result = executeRandomDefinition({
      definition,
      sources,
      rng: () => [0.99, 0.8, 0.5, 0][index++],
    });
    expect(result.primaryAggregate.value).toBe(2);
  });

  it('branches calculations with si and supports the remaining numeric functions', () => {
    const definition = compileRollCode(
      'si([pool]>=5 et non [malus]>2,puissance(abs(-2),3),signe(-4))d6',
      { id: 'conditional-count', sources },
    );
    const result = executeRandomDefinition({
      definition,
      sources,
      parameters: { pool: 5, malus: 1 },
      rng: () => 0,
    });
    expect(result.draws).toHaveLength(8);
  });

  it('refuses an ambiguous decimal dice count until it is rounded explicitly', () => {
    const definition = compileRollCode('1.5d6', { id: 'decimal-count', sources });
    expect(() => executeRandomDefinition({ definition, sources }))
      .toThrow(/arrondi\.inf.*arrondi\.sup/i);
  });

  it('reports an invalid dice-count calculation such as division by zero', () => {
    const definition = compileRollCode('([pool]/[diviseur])d6', { id: 'invalid-count', sources });
    expect(() => executeRandomDefinition({
      definition,
      sources,
      parameters: { pool: 4, diviseur: 0 },
    })).toThrow(/division par zero/i);
  });

  it('compiles strictly typed number and source variables', () => {
    const definition = compileRollCode(`
      number pool = 3;
      number bonus = 2;
      source die = d6;
      [pool]d@die + [bonus]
    `, { id: 'typed', name: 'Jet type', sources });
    expect(definition.parameters.map(({ id, type }) => ({ id, type }))).toEqual([
      { id: 'pool', type: 'number' },
      { id: 'bonus', type: 'number' },
      { id: 'die', type: 'source' },
    ]);
    expect(definition.components[0].count).toEqual({ kind: 'parameter', parameterId: 'pool' });
    expect(definition.components[0].source).toEqual({ kind: 'parameter', parameterId: 'die' });
  });

  it('restricts a source variable to its declared preselection', () => {
    const definition = compileRollCode(
      'source die={d6; d8; d10}; 1d@die',
      { id: 'source-preselection', sources },
    );
    const parameter = definition.parameters.find((item) => item.id === 'die');
    expect(parameter.defaultValue).toBe('standard-d6');
    expect(parameter.choices).toEqual(['standard-d6', 'standard-d8', 'standard-d10']);

    expect(() => executeRandomDefinition({
      definition,
      sources,
      parameters: { die: 'standard-d20' },
      rng: () => 0,
    })).toThrow(/preselection/);

    const exported = exportRandomSystemStateForCampaign({
      ...createDefaultRandomSystemState(),
      definitions: [definition],
    });
    expect(exported.sources.map((source) => source.id).sort()).toEqual(
      createDefaultRandomSystemState().sources.map((source) => source.id).sort(),
    );
  });

  it('uses brackets to make numeric variables explicit', () => {
    const program = parseRollCode('number keep=2; number target=5; 6d6k[keep] + 4d6s>=[target]');
    expect(program.rolls[0].keep.count).toEqual({ kind: 'parameter', parameterId: 'keep' });
    expect(program.rolls[1].successes[0]).toMatchObject({
      operator: '>=',
      value: { kind: 'parameter', parameterId: 'target' },
    });
    expect(() => parseRollCode('number pool=3; pool d6')).toThrow(/\[pool\]/);
  });

  it('creates prompted numeric variables and inline source preselections', () => {
    const definition = compileRollCode(`
      choice {
        [nb]d{d4;d6;d8;d10;d12};
        explosion: [nb]d{d4;d6;d8;d10;d12}!;
        relance: [nb]d{d4;d6;d8;d10;d12}r<=[seuil=1]
      }++
    `, { id: 'short-damage-builder', sources });

    expect(definition.recursive).toBe(true);
    expect(definition.parameters).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'nb', defaultValue: '', prompt: true, type: 'number' }),
      expect.objectContaining({ id: 'seuil', defaultValue: 1, prompt: false, type: 'number' }),
      expect.objectContaining({
        id: 'inline-source-1',
        label: 'Dé',
        defaultValue: 'standard-d4',
        choices: ['standard-d4', 'standard-d6', 'standard-d8', 'standard-d10', 'standard-d12'],
        type: 'source',
      }),
    ]));
    expect(definition.parameters.filter((parameter) => parameter.type === 'source')).toHaveLength(1);
    expect(definition.components).toHaveLength(3);
    expect(new Set(definition.components.map((component) => component.source.parameterId)))
      .toEqual(new Set(['inline-source-1']));
    expect(() => executeRandomDefinition({ definition, sources, parameters: {} }))
      .toThrow(/valeur est demandee.*nb/i);

    let index = 0;
    const rerolled = executeRandomDefinition({
      definition,
      sources,
      parameters: { nb: 1, seuil: 2, 'inline-source-1': 'standard-d6' },
      options: { 'code-choice-1': 'choice-3' },
      rng: () => [0, 0.8][index++],
    });
    expect(rerolled.draws.map((draw) => draw.outcome.value)).toEqual([1, 5]);
    expect(rerolled.primaryAggregate.value).toBe(5);
  });

  it('marks a final ++ formula as recursively repeatable', () => {
    const program = parseRollCode('number mod=0; 1d6+[mod]++');
    expect(program.recursive).toBe(true);

    const definition = compileRollCode('number mod=0; 1d6+[mod]++', {
      id: 'repeatable-damage',
      sources,
    });
    expect(definition.recursive).toBe(true);
    expect(() => parseRollCode('(1d6++)+1d6')).toThrow();
  });

  it('adds recursive instances with independent number and source variables', () => {
    const definition = compileRollCode(`
      number mod=0;
      source die={d6;d10};
      1d@die+[mod]++
    `, { id: 'recursive-damage', sources });
    let index = 0;
    const result = executeRandomDefinition({
      definition,
      sources,
      instances: [
        { parameters: { die: 'standard-d6', mod: 2 }, options: {} },
        { parameters: { die: 'standard-d10', mod: -1 }, options: {} },
      ],
      rng: () => [0, 0.9][index++],
    });

    expect(result.combined).toBe(true);
    expect(result.groups).toHaveLength(2);
    expect(result.draws.map((draw) => draw.outcome.value)).toEqual([1, 10]);
    expect(result.primaryAggregate.value).toBe(12);
    expect(result.instances.map((instance) => instance.parameters)).toEqual([
      { mod: 2, die: 'standard-d6' },
      { mod: -1, die: 'standard-d10' },
    ]);
  });

  it('executes arithmetic, explosions and per-term keep rules', () => {
    const definition = compileRollCode('1d10!+5d6-3d4k2', { id: 'example', name: 'Exemple', sources });
    const sequence = [0.95, 0, 0.2, 0.4, 0.6, 0.8, 0, 0.4, 0.9, 0.1];
    let index = 0;
    const result = executeRandomDefinition({ definition, sources, rng: () => sequence[index++] ?? 0 });
    // d10 explosif: 10 + 2; 5d6: 1+2+3+4+5; 3d4 garde 2: 4+2.
    expect(result.primaryAggregate.value).toBe(21);
    expect(result.draws.filter((draw) => draw.kept === false)).toHaveLength(1);
  });

  it('can collapse an exploding chain when an explosion matches a value', () => {
    const definition = compileRollCode('2d10!c=1', { id: 'collapse', sources });
    // Première chaîne : 10 puis 1 => 1. Deuxième chaîne : 5 => 5.
    const sequence = [0.95, 0.45, 0];
    let index = 0;
    const result = executeRandomDefinition({ definition, sources, rng: () => sequence[index++] });
    expect(result.primaryAggregate.value).toBe(6);
  });

  it('limits the number of chained explosions with n', () => {
    const definition = compileRollCode('1d6!n2', { id: 'limited-explosion', sources });
    let calls = 0;
    const result = executeRandomDefinition({
      definition,
      sources,
      rng: () => { calls += 1; return 0.99; },
    });
    expect(calls).toBe(3);
    expect(result.primaryAggregate.value).toBe(18);
  });

  it('calculates an explosion limit from a parameter', () => {
    const definition = compileRollCode('number limite=2; 1d6!n[limite]', { id: 'parameter-explosion-limit', sources });
    let calls = 0;
    const result = executeRandomDefinition({ definition, sources, rng: () => { calls += 1; return 0.99; } });
    expect(calls).toBe(3);
    expect(result.primaryAggregate.value).toBe(18);
  });

  it('can explode below the source maximum with a comparison threshold', () => {
    const definition = compileRollCode('1d6!>=[explosion=5]', { id: 'low-explosion', sources });
    expect(definition.parameters).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'explosion', defaultValue: 5 }),
    ]));
    const explosionStep = definition.pipeline.find((step) => step.id === 'explode-code-roll-1');
    expect(explosionStep.condition).toEqual({
      type: 'compare',
      operator: 'gte',
      value: { kind: 'parameter', parameterId: 'explosion' },
    });

    let index = 0;
    const result = executeRandomDefinition({
      definition,
      sources,
      rng: () => [0.7, 0][index++],
    });
    expect(result.draws.map((draw) => draw.outcome.value)).toEqual([5, 1]);
    expect(result.primaryAggregate.value).toBe(6);
  });

  it('combines a custom explosion trigger with chain collapse', () => {
    const definition = compileRollCode('1d6!>=5c=1', { id: 'low-collapse', sources });
    let index = 0;
    const result = executeRandomDefinition({
      definition,
      sources,
      rng: () => [0.7, 0][index++],
    });
    expect(result.primaryAggregate.value).toBe(1);
  });

  it('selects candidates separated by semicolons with kh and kl', () => {
    const highest = compileRollCode('(1d6; 1d8)kh1', { id: 'highest-candidate', sources });
    let highIndex = 0;
    const highResult = executeRandomDefinition({ definition: highest, sources, rng: () => [0.1, 0.8][highIndex++] });
    expect(highResult.primaryAggregate.value).toBe(7);
    expect(highResult.draws.filter((draw) => draw.kept === false)).toHaveLength(1);

    const lowest = compileRollCode('(1d6; 1d8)kl1', { id: 'lowest-candidate', sources });
    let lowIndex = 0;
    const lowResult = executeRandomDefinition({ definition: lowest, sources, rng: () => [0.1, 0.8][lowIndex++] });
    expect(lowResult.primaryAggregate.value).toBe(1);
  });

  it('accepts the explicit mixed-source optional-explosion form', () => {
    const definition = compileRollCode(
      'source die=d6; (1d6!?c=1; 1d@die!?c=1)kh1',
      { id: 'mixed-candidates', sources },
    );
    expect(definition.components).toHaveLength(2);
    expect(definition.pipeline.filter((step) => step.decision === 'after-roll')).toHaveLength(2);
  });

  it('offers a named user choice and only rolls the selected D&D 5e branch', () => {
    const definition = compileRollCode(`
      number mod=2;
      choice(normal) {
        désavantage: 2d20kl1+[mod];
        normal: 1d20+[mod];
        avantage: 2d20kh1+[mod]
      }
    `, { id: 'dnd5-check', sources });
    const mode = definition.options.find((option) => option.id === 'code-choice-1');
    expect(mode.defaultValue).toBe('choice-2');
    expect(mode.choices.map((choice) => choice.label)).toEqual(['désavantage', 'normal', 'avantage']);

    let normalCalls = 0;
    const normal = executeRandomDefinition({
      definition,
      sources,
      rng: () => { normalCalls += 1; return 0.45; },
    });
    expect(normalCalls).toBe(1);
    expect(normal.primaryAggregate.value).toBe(12);

    let advantageIndex = 0;
    const advantage = executeRandomDefinition({
      definition,
      sources,
      options: { 'code-choice-1': 'choice-3' },
      rng: () => [0.1, 0.9][advantageIndex++],
    });
    expect(advantage.draws).toHaveLength(2);
    expect(advantage.primaryAggregate.value).toBe(21);
  });

  it('uses the unnamed branch as the default choice', () => {
    const definition = compileRollCode(`
      number mod=2;
      choice {
        désavantage: 2d20kl1+[mod];
        1d20+[mod];
        avantage: 2d20kh1+[mod]
      }
    `, { id: 'implicit-default-choice', sources });
    const mode = definition.options.find((option) => option.id === 'code-choice-1');
    expect(mode.defaultValue).toBe('choice-2');
    expect(mode.choices.map((choice) => choice.label)).toEqual(['désavantage', 'Par défaut', 'avantage']);

    let calls = 0;
    const result = executeRandomDefinition({
      definition,
      sources,
      rng: () => { calls += 1; return 0.45; },
    });
    expect(calls).toBe(1);
    expect(result.primaryAggregate.value).toBe(12);
  });

  it('accepts an unnamed none branch as a genuine default no-op', () => {
    const definition = compileRollCode(`
      1d20 + choice {
        bonus: 1d6;
        none
      }
    `, { id: 'implicit-none-choice', sources });
    const mode = definition.options.find((option) => option.id === 'code-choice-1');
    expect(mode.defaultValue).toBe('choice-2');
    expect(mode.choices[1]).toEqual(expect.objectContaining({ label: 'Par défaut' }));

    let calls = 0;
    const result = executeRandomDefinition({
      definition,
      sources,
      rng: () => { calls += 1; return 0.45; },
    });
    expect(calls).toBe(1);
    expect(result.draws).toHaveLength(1);
    expect(result.primaryAggregate.value).toBe(10);
  });

  it('rejects ambiguous choices with more than one unnamed branch', () => {
    expect(() => compileRollCode('choice { 1d6; 1d8 }', { sources }))
      .toThrow(/une seule branche sans nom/);
  });

  it('composes independent named choices and accepts multiword labels', () => {
    const definition = compileRollCode(`
      number mod=2;
      source intrigue=d6;
      choice(normal) {
        désavantage: 2d20kl1+[mod];
        normal: 1d20+[mod];
        avantage: 2d20kh1+[mod]
      } + choice(non) {
        monter les enjeux: 1d@intrigue;
        non: none
      }
    `, { id: 'cosmere-check', sources });
    expect(definition.options).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'code-choice-1', defaultValue: 'choice-2' }),
      expect.objectContaining({
        id: 'code-choice-2',
        defaultValue: 'choice-2',
        choices: expect.arrayContaining([expect.objectContaining({ label: 'monter les enjeux' })]),
      }),
    ]));

    let index = 0;
    const result = executeRandomDefinition({
      definition,
      sources,
      options: { 'code-choice-1': 'choice-3', 'code-choice-2': 'choice-1' },
      rng: () => [0.1, 0.9, 0.5][index++],
    });
    // Avantage : 19 + 2. Enjeux : d6 = 4.
    expect(result.primaryAggregate.value).toBe(25);
    expect(result.draws).toHaveLength(3);
  });

  it('uses none as a genuine no-op branch', () => {
    const definition = compileRollCode(`
      1d20 + choice(non) {
        bonus: 1d6;
        non: none
      }
    `, { id: 'no-op-choice', sources });
    let calls = 0;
    const result = executeRandomDefinition({
      definition,
      sources,
      rng: () => { calls += 1; return 0.45; },
    });
    expect(calls).toBe(1);
    expect(result.draws).toHaveLength(1);
    expect(result.primaryAggregate.value).toBe(10);
    const choiceNode = definition.pipeline.find((step) => step.type === 'expression').expression.right;
    expect(choiceNode.choices.find((choice) => choice.label === 'non').expression).toEqual({ type: 'none' });
  });

  it('defines and calls a reusable named roll with a dice-like name', () => {
    const definition = compileRollCode(`
      number mod=2;
      source intrigue=d6;
      d20a = choice(normal) {
        désavantage: 2d20kl1+[mod];
        normal: 1d20+[mod];
        avantage: 2d20kh1+[mod]
      };
      cosmere = @d20a + choice(non) {
        monter les enjeux: d@intrigue;
        non: none
      }
    `, { id: 'named-cosmere', sources });
    expect(definition.name).toBe('cosmere');
    expect(definition.options).toHaveLength(2);
    // Les composants du modèle d20a ne doivent pas être exécutés en plus de son appel.
    expect(definition.components).toHaveLength(4);

    let calls = 0;
    const result = executeRandomDefinition({
      definition,
      sources,
      rng: () => { calls += 1; return 0.45; },
    });
    expect(calls).toBe(1);
    expect(result.primaryAggregate.value).toBe(12);
  });

  it('executes a named roll repeatedly with independent random draws', () => {
    const definition = compileRollCode('simple=1d6; double=2@simple', { id: 'double-call', sources });
    const sequence = [0, 0.9];
    let index = 0;
    const result = executeRandomDefinition({ definition, sources, rng: () => sequence[index++] });
    expect(result.draws).toHaveLength(2);
    expect(result.primaryAggregate.value).toBe(7);
  });

});
