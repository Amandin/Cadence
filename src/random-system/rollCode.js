import {
  randomAggregateOperations,
  randomKeepOrders,
  randomOptionTypes,
  randomParameterTypes,
  randomPipelineStepTypes,
  randomSourceKinds,
} from './core/constants.js';
import { normalizeRandomDefinition } from './core/definitions.js';
import { fixedValue, parameterValue } from './core/references.js';

export class RollCodeError extends Error {
  constructor(message, position = 0, code = 'invalid-roll-code') {
    super(message);
    this.name = 'RollCodeError';
    this.code = code;
    this.position = position;
  }
}

const comparisonOperators = new Set(['=', '==', '!=', '<', '<=', '>', '>=']);

function tokenize(input) {
  const tokens = [];
  let index = 0;
  while (index < input.length) {
    if (/\s/.test(input[index])) { index += 1; continue; }
    const start = index;
    const pair = input.slice(index, index + 2);
    if (['>=', '<=', '==', '!='].includes(pair)) {
      tokens.push({ type: 'symbol', value: pair, start, end: index + 2 });
      index += 2;
      continue;
    }
    if (/[0-9.]/.test(input[index])) {
      const match = input.slice(index).match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
      if (!match) throw new RollCodeError('Nombre invalide.', start);
      tokens.push({ type: 'number', value: Number(match[0]), raw: match[0], start, end: index + match[0].length });
      index += match[0].length;
      continue;
    }
    if (/[\p{L}_]/u.test(input[index])) {
      const diceMatch = input.slice(index).match(
        /^d\d+(?=$|[+\-*/%();:=@<>!\[\]?{},\s]|(?:kh|kl|k|rr|r|s)(?=\d|[=<>!?\[]))/i,
      );
      const match = diceMatch?.[0] || input.slice(index).match(/^[\p{L}_][\p{L}\p{N}_-]*/u)[0];
      tokens.push({ type: 'identifier', value: match, start, end: index + match.length });
      index += match.length;
      continue;
    }
    if ('+-*/%();:=@<>![]?{}'.includes(input[index])) {
      tokens.push({ type: 'symbol', value: input[index], start, end: index + 1 });
      index += 1;
      continue;
    }
    throw new RollCodeError(`Caractere inattendu : ${input[index]}`, start);
  }
  tokens.push({ type: 'eof', value: '', start: input.length, end: input.length });
  return tokens;
}

class Parser {
  constructor(code) {
    this.code = code;
    this.tokens = tokenize(code);
    this.index = 0;
    this.variables = new Map();
    this.declarations = [];
    this.inlineSources = new Map();
    this.rolls = [];
    this.choices = [];
    this.formulas = new Map();
  }

  current(offset = 0) { return this.tokens[this.index + offset] || this.tokens.at(-1); }
  take() { const token = this.current(); this.index += 1; return token; }
  at(value) { return this.current().value === value; }
  expect(value, message = `« ${value} » attendu.`) {
    if (!this.at(value)) throw new RollCodeError(message, this.current().start);
    return this.take();
  }
  expectIdentifier(message = 'Identifiant attendu.') {
    if (this.current().type !== 'identifier') throw new RollCodeError(message, this.current().start);
    return this.take();
  }
  adjacent(left, right) { return left.end === right.start; }

  atRecursiveSuffix() {
    return this.at('+')
      && this.current(1).value === '+'
      && this.adjacent(this.current(), this.current(1));
  }

  parse() {
    const declarations = this.declarations;
    while (this.at('number') || this.at('source')) declarations.push(this.declaration());
    if (this.current().type === 'eof') throw new RollCodeError('Une expression de jet est attendue.', this.current().start);
    let expression = null;
    let resultName = '';
    while (this.current().type === 'identifier' && this.current(1).value === '=') {
      const nameToken = this.take();
      this.take();
      if (this.formulas.has(nameToken.value)) {
        throw new RollCodeError(`Tirage deja defini : ${nameToken.value}`, nameToken.start);
      }
      expression = this.expression();
      resultName = nameToken.value;
      this.formulas.set(nameToken.value, expression);
      if (!this.at(';')) break;
      this.take();
    }
    if (!expression) expression = this.expression();
    let recursive = false;
    if (this.atRecursiveSuffix()) {
      this.take();
      this.take();
      recursive = true;
    }
    if (this.at(';')) this.take();
    if (this.current().type !== 'eof') throw new RollCodeError(`Element inattendu : ${this.current().value}`, this.current().start);
    return {
      type: 'program',
      declarations,
      expression,
      resultName,
      rolls: this.rolls,
      choices: this.choices,
      recursive,
    };
  }

  declaration() {
    const typeToken = this.take();
    const nameToken = this.expectIdentifier('Nom de variable attendu.');
    const name = nameToken.value;
    if (this.variables.has(name)) throw new RollCodeError(`Variable deja declaree : ${name}`, nameToken.start);
    this.expect('=', '« = » attendu apres la variable.');
    let defaultValue;
    if (typeToken.value === 'number') {
      let sign = 1;
      if (this.at('-')) { this.take(); sign = -1; }
      if (this.current().type !== 'number') throw new RollCodeError('Valeur numerique attendue.', this.current().start);
      defaultValue = sign * this.take().value;
    } else {
      if (this.at('{')) {
        this.take();
        const allowedSources = [this.sourceReference(false)];
        while (this.at(';')) {
          this.take();
          allowedSources.push(this.sourceReference(false));
        }
        this.expect('}', '« } » attendu apres la preselection de sources.');
        defaultValue = allowedSources[0];
        this.expect(';', '« ; » attendu apres la declaration.');
        const declaration = {
          type: typeToken.value,
          name,
          defaultValue,
          allowedSources,
          position: nameToken.start,
        };
        this.variables.set(name, declaration);
        return declaration;
      }
      defaultValue = this.sourceReference(false);
    }
    this.expect(';', '« ; » attendu apres la declaration.');
    const declaration = { type: typeToken.value, name, defaultValue, position: nameToken.start };
    this.variables.set(name, declaration);
    return declaration;
  }

  expression() {
    let node = this.product();
    while (this.at('+') || this.at('-')) {
      if (this.atRecursiveSuffix()) break;
      const operator = this.take().value;
      node = { type: 'binary', operator, left: node, right: this.product() };
    }
    return node;
  }

  product() {
    let node = this.unary();
    while (this.at('*') || this.at('/') || this.at('%')) {
      const operator = this.take().value;
      node = { type: 'binary', operator, left: node, right: this.unary() };
    }
    return node;
  }

  unary() {
    if (this.at('+') || this.at('-')) {
      const operator = this.take().value;
      return { type: 'unary', operator, value: this.unary() };
    }
    return this.primary();
  }

  primary() {
    if (this.at('(')) {
      this.take();
      const first = this.expression();
      if (this.at(';')) {
        const choices = [first];
        while (this.at(';')) {
          this.take();
          choices.push(this.expression());
        }
        this.expect(')', 'Parenthese fermante attendue.');
        const selector = this.current();
        const match = selector.type === 'identifier'
          ? selector.value.match(/^(kh|kl|k)(\d+(?:\.\d+)?)?$/)
          : null;
        if (!match) {
          throw new RollCodeError('Un groupe de candidats doit finir par kh, kl ou k.', selector.start);
        }
        this.take();
        const [, modifier, inlineValue] = match;
        return {
          type: 'select',
          order: modifier === 'kl' ? randomKeepOrders.LOWEST : randomKeepOrders.HIGHEST,
          count: inlineValue === undefined ? this.modifierValue(modifier) : fixedValue(Number(inlineValue)),
          choices,
        };
      }
      const node = first;
      this.expect(')', 'Parenthese fermante attendue.');
      return node;
    }
    const token = this.current();
    if (this.at('choice')) {
      return this.userChoice();
    }
    if (this.at('[')) {
      const count = this.numericReference();
      if (this.at('@')) return this.namedReference(count, token);
      const sourceToken = this.current();
      if (sourceToken.type === 'identifier' && (/^d\d+$/.test(sourceToken.value) || sourceToken.value === 'd')) {
        this.take();
        const source = /^d\d+$/.test(sourceToken.value)
          ? { kind: 'alias', value: sourceToken.value }
          : this.at('{') ? this.inlineSourceReference() : this.sourceReference(true);
        return this.roll(count, source, token);
      }
      return { type: 'parameter', parameterId: count.parameterId };
    }
    if (token.type === 'identifier' && /^d\d+$/.test(token.value)) {
      this.take();
      return this.roll(fixedValue(1), { kind: 'alias', value: token.value }, token);
    }
    if (token.value === 'd' && this.current(1).value === '@') {
      this.take();
      return this.roll(fixedValue(1), this.sourceReference(true), token);
    }
    if (token.value === 'd' && this.current(1).value === '{') {
      this.take();
      return this.roll(fixedValue(1), this.inlineSourceReference(), token);
    }
    if (token.value === 'none') {
      this.take();
      return { type: 'none' };
    }
    if (this.at('@')) return this.namedReference(fixedValue(1), token);
    if (token.type === 'number') {
      const next = this.current(1);
      if (next.value === '@') {
        this.take();
        return this.namedReference(fixedValue(token.value), token);
      }
      const diceStart = next.type === 'identifier' && (/^d\d+$/.test(next.value) || next.value === 'd');
      if (diceStart) {
        this.take();
        const count = fixedValue(token.value);
        const sourceToken = this.take();
        const source = /^d\d+$/.test(sourceToken.value)
          ? { kind: 'alias', value: sourceToken.value }
          : this.at('{') ? this.inlineSourceReference() : this.sourceReference(true);
        return this.roll(count, source, token);
      }
      this.take();
      return { type: 'number', value: token.value };
    }
    if (token.type === 'identifier') {
      throw new RollCodeError(`Une variable numerique s’ecrit [${token.value}].`, token.start);
    }
    throw new RollCodeError('Nombre, variable, jet ou parenthese attendu.', token.start);
  }

  cloneFormulaNode(node) {
    if (!node || typeof node !== 'object') return node;
    if (node.type === 'roll') {
      const original = this.rolls.find((roll) => roll.id === node.rollId);
      if (!original) throw new RollCodeError('Tirage nomme incomplet.', this.current().start);
      const clone = {
        ...original,
        id: `code-roll-${this.rolls.length + 1}`,
        reroll: original.reroll ? { ...original.reroll } : null,
        explode: original.explode ? { ...original.explode } : null,
        keep: original.keep ? { ...original.keep } : null,
        successes: original.successes.map((success) => ({ ...success })),
        enabledWhen: Array.isArray(original.enabledWhen)
          ? original.enabledWhen.map((condition) => ({ ...condition }))
          : original.enabledWhen ? { ...original.enabledWhen } : null,
      };
      this.rolls.push(clone);
      return { type: 'roll', rollId: clone.id };
    }
    if (node.type === 'binary') return {
      ...node,
      left: this.cloneFormulaNode(node.left),
      right: this.cloneFormulaNode(node.right),
    };
    if (node.type === 'unary') return { ...node, value: this.cloneFormulaNode(node.value) };
    if (node.type === 'select') return {
      ...node,
      choices: node.choices.map((choice) => this.cloneFormulaNode(choice)),
    };
    if (node.type === 'choice') return {
      ...node,
      choices: node.choices.map((choice) => ({
        ...choice,
        expression: this.cloneFormulaNode(choice.expression),
      })),
    };
    return { ...node };
  }

  namedReference(count, startToken) {
    this.expect('@', '« @ » attendu.');
    const nameToken = this.expectIdentifier('Nom de source ou de tirage attendu.');
    const formula = this.formulas.get(nameToken.value);
    if (formula) {
      if (count.kind !== 'fixed' || !Number.isInteger(Number(count.value))) {
        throw new RollCodeError('Le nombre d’appels d’un tirage nomme doit etre fixe.', startToken.start);
      }
      const repetitions = Number(count.value);
      if (repetitions < 0 || repetitions > 100) {
        throw new RollCodeError('Le nombre d’appels doit etre compris entre 0 et 100.', startToken.start);
      }
      if (repetitions === 0) return { type: 'none' };
      const calls = Array.from({ length: repetitions }, () => this.cloneFormulaNode(formula));
      return calls.slice(1).reduce((sum, call) => ({
        type: 'binary',
        operator: '+',
        left: sum,
        right: call,
      }), calls[0]);
    }
    const declaration = this.variables.get(nameToken.value);
    if (declaration && declaration.type !== 'source') {
      throw new RollCodeError(`${nameToken.value} est un nombre, pas une source.`, nameToken.start, 'roll-code-type-error');
    }
    const source = declaration
      ? { kind: 'parameter', parameterId: nameToken.value }
      : { kind: 'alias', value: nameToken.value };
    return this.roll(count, source, startToken);
  }

  userChoice() {
    const start = this.take();
    let requestedDefault = null;
    if (this.at('(')) {
      this.take();
      requestedDefault = this.expectIdentifier('Nom du choix par defaut attendu.');
      this.expect(')', '« ) » attendu apres le choix par defaut.');
    }
    this.expect('{', '« { » attendu avant les branches.');
    const optionId = `code-choice-${this.choices.length + 1}`;
    const choices = [];
    let unnamedChoice = null;
    while (!this.at('}')) {
      const labelStart = this.current();
      const labelParts = [];
      let lookahead = 0;
      while (this.current(lookahead).type === 'identifier') lookahead += 1;
      const hasLabel = lookahead > 0 && this.current(lookahead).value === ':';
      if (hasLabel) {
        while (!this.at(':')) labelParts.push(this.take().value);
        this.take();
      } else if (requestedDefault) {
        throw new RollCodeError('Une branche sans nom demande la forme choice { ... }.', labelStart.start);
      } else if (unnamedChoice) {
        throw new RollCodeError('Un choix ne peut contenir qu’une seule branche sans nom.', labelStart.start);
      }
      const label = hasLabel ? labelParts.join(' ') : 'Par défaut';
      const value = `choice-${choices.length + 1}`;
      const rollStart = this.rolls.length;
      const expression = this.expression();
      this.rolls.slice(rollStart).forEach((roll) => {
        const current = Array.isArray(roll.enabledWhen)
          ? roll.enabledWhen
          : roll.enabledWhen ? [roll.enabledWhen] : [];
        roll.enabledWhen = [...current, { optionId, equals: value }];
      });
      const choice = { value, label, expression };
      choices.push(choice);
      if (!hasLabel) unnamedChoice = choice;
      if (!this.at(';')) break;
      this.take();
      if (this.at('}')) throw new RollCodeError('Choix attendu apres « ; ».', this.current().start);
    }
    this.expect('}', '« } » attendu apres les choix.');
    const selectedDefault = requestedDefault
      ? choices.find((choice) => choice.label === requestedDefault.value)
      : unnamedChoice;
    if (requestedDefault && !selectedDefault) {
      throw new RollCodeError(`Choix par defaut inconnu : ${requestedDefault.value}`, requestedDefault.start);
    }
    if (!requestedDefault && !selectedDefault) {
      throw new RollCodeError('choice { ... } demande une branche sans nom servant de choix par defaut.', start.start);
    }
    const defaultValue = selectedDefault.value;
    if (choices.length < 2) throw new RollCodeError('Un choix utilisateur demande au moins deux branches.', start.start);
    const node = { type: 'choice', optionId, defaultValue, choices };
    this.choices.push(node);
    return node;
  }

  numericReference() {
    this.expect('[', '« [ » attendu.');
    const token = this.expectIdentifier('Nom de variable numerique attendu.');
    let hasDefault = false;
    let defaultValue;
    if (this.at('=')) {
      this.take();
      let sign = 1;
      if (this.at('-')) { this.take(); sign = -1; }
      if (this.current().type !== 'number') {
        throw new RollCodeError('Valeur numerique par defaut attendue.', this.current().start);
      }
      defaultValue = sign * this.take().value;
      hasDefault = true;
    }
    let declaration = this.variables.get(token.value);
    if (declaration && declaration.type !== 'number') {
      throw new RollCodeError(`${token.value} est une source, pas un nombre.`, token.start, 'roll-code-type-error');
    }
    if (!declaration) {
      declaration = {
        type: 'number',
        name: token.value,
        defaultValue: hasDefault ? defaultValue : '',
        prompt: !hasDefault,
        implicit: true,
        position: token.start,
      };
      this.variables.set(token.value, declaration);
      this.declarations.push(declaration);
    } else if (hasDefault) {
      if (!declaration.prompt && Number(declaration.defaultValue) !== Number(defaultValue)) {
        throw new RollCodeError(`Valeur par defaut contradictoire pour ${token.value}.`, token.start);
      }
      declaration.defaultValue = defaultValue;
      declaration.prompt = false;
    }
    const reference = parameterValue(token.value);
    this.expect(']', '« ] » attendu apres la variable numerique.');
    return reference;
  }

  inlineSourceReference() {
    const start = this.expect('{', '« { » attendu avant la preselection de sources.');
    const allowedSources = [this.sourceReference(false)];
    while (this.at(';')) {
      this.take();
      allowedSources.push(this.sourceReference(false));
    }
    this.expect('}', '« } » attendu apres la preselection de sources.');
    const key = allowedSources.map((source) => source.value).join(';');
    let declaration = this.inlineSources.get(key);
    if (!declaration) {
      const index = this.inlineSources.size + 1;
      const name = `inline-source-${index}`;
      declaration = {
        type: 'source',
        name,
        label: index === 1 ? 'Dé' : `Dé ${index}`,
        defaultValue: allowedSources[0],
        allowedSources,
        implicit: true,
        position: start.start,
      };
      this.inlineSources.set(key, declaration);
      this.variables.set(name, declaration);
      this.declarations.push(declaration);
    }
    return { kind: 'parameter', parameterId: declaration.name };
  }

  sourceReference(requireAt) {
    if (requireAt) this.expect('@', 'Une source variable s’ecrit d@nom.');
    const token = this.expectIdentifier('Nom de source attendu.');
    if (/^d\d+$/.test(token.value)) return { kind: 'alias', value: token.value };
    if (requireAt) {
      const declaration = this.variables.get(token.value);
      if (!declaration) throw new RollCodeError(`Variable inconnue : ${token.value}`, token.start);
      if (declaration.type !== 'source') throw new RollCodeError(`${token.value} est un nombre, pas une source.`, token.start, 'roll-code-type-error');
      return { kind: 'parameter', parameterId: token.value };
    }
    return { kind: 'alias', value: token.value };
  }

  modifierValue(label) {
    const token = this.current();
    if (token.type === 'number') { this.take(); return fixedValue(token.value); }
    if (this.at('[')) return this.numericReference();
    throw new RollCodeError(`${label} attend un nombre ou une variable numerique [nom].`, token.start);
  }

  condition(label) {
    let operator = '=';
    if (comparisonOperators.has(this.current().value)) operator = this.take().value;
    return { operator, value: this.modifierValue(label) };
  }

  roll(count, source, startToken) {
    const roll = {
      id: `code-roll-${this.rolls.length + 1}`,
      count,
      source,
      explode: null,
      keep: null,
      reroll: null,
      successes: [],
      position: startToken.start,
    };
    this.rolls.push(roll);
    while (this.current().type !== 'eof') {
      const token = this.current();
      const previous = this.tokens[this.index - 1];
      if (!this.adjacent(previous, token)) break;
      if (token.value === '!') {
        this.take();
        const optional = this.at('?');
        if (optional) this.take();
        const trigger = comparisonOperators.has(this.current().value)
          ? this.condition('!')
          : null;
        let collapse = null;
        const collapseToken = this.current();
        if (collapseToken.value === 'c') {
          this.take();
          collapse = this.condition('c');
        }
        roll.explode = { optional, trigger, collapse };
        continue;
      }
      if (token.type !== 'identifier') break;
      const match = token.value.match(/^(kh|kl|k|rr|r|s)(\d+(?:\.\d+)?)?$/);
      if (!match) break;
      this.take();
      const [, modifier, inlineValue] = match;
      const inline = inlineValue === undefined ? null : fixedValue(Number(inlineValue));
      const optional = this.at('?');
      if (optional) this.take();
      if (modifier === 'k' || modifier === 'kh' || modifier === 'kl') {
        if (optional) throw new RollCodeError('La conservation ne peut pas etre optionnelle.', token.start);
        roll.keep = { order: modifier === 'kl' ? randomKeepOrders.LOWEST : randomKeepOrders.HIGHEST, count: inline || this.modifierValue('k') };
      } else if (modifier === 'r' || modifier === 'rr') {
        roll.reroll = {
          ...(inline ? { operator: '=', value: inline } : this.condition(modifier)),
          recursive: modifier === 'rr',
          optional,
        };
      } else {
        if (optional) throw new RollCodeError('Un compteur de succes ne peut pas etre optionnel.', token.start);
        roll.successes.push(inline ? { operator: '>=', value: inline } : this.condition('s'));
      }
    }
    return { type: 'roll', rollId: roll.id };
  }
}

export function parseRollCode(code) {
  if (typeof code !== 'string') throw new RollCodeError('Le code du jet doit etre du texte.');
  return new Parser(code).parse();
}

function sourceIdForAlias(reference, sources, position) {
  const alias = String(reference.value || '');
  const standard = alias.match(/^d(\d+)$/)?.[1];
  const candidates = standard ? [`standard-d${standard}`, alias] : [alias];
  const source = sources.find((item) => candidates.includes(item.id))
    || sources.find((item) => item.name.toLocaleLowerCase('fr') === alias.toLocaleLowerCase('fr'));
  if (!source || source.kind === randomSourceKinds.CARDS) {
    throw new RollCodeError(`Source de tirage introuvable : ${alias}`, position, 'roll-code-source-not-found');
  }
  return source.id;
}

const conditionOperators = { '=': 'eq', '==': 'eq', '!=': 'neq', '<': 'lt', '<=': 'lte', '>': 'gt', '>=': 'gte' };

function referenceLabel(reference) {
  return reference?.kind === 'parameter'
    ? `[${reference.parameterId}]`
    : String(reference?.value ?? '');
}

function compileExpression(node, rollMap) {
  if (node.type === 'roll') {
    const roll = rollMap.get(node.rollId);
    return {
      type: 'roll',
      componentId: roll.id,
      condition: roll.successes[0]
        ? { type: 'compare', operator: conditionOperators[roll.successes[0].operator], value: roll.successes[0].value }
        : null,
      collapse: roll.explode?.collapse
        ? {
          condition: {
            type: 'compare',
            operator: conditionOperators[roll.explode.collapse.operator],
            value: roll.explode.collapse.value,
          },
          value: roll.explode.collapse.value,
        }
        : null,
    };
  }
  if (node.type === 'binary') return { ...node, left: compileExpression(node.left, rollMap), right: compileExpression(node.right, rollMap) };
  if (node.type === 'unary') return { ...node, value: compileExpression(node.value, rollMap) };
  if (node.type === 'select') return {
    ...node,
    choices: node.choices.map((choice) => compileExpression(choice, rollMap)),
  };
  if (node.type === 'choice') return {
    ...node,
    choices: node.choices.map((choice) => ({
      ...choice,
      expression: compileExpression(choice.expression, rollMap),
    })),
  };
  return node;
}

function collectExpressionReferences(node, references = { rollIds: new Set(), optionIds: new Set() }) {
  if (!node || typeof node !== 'object') return references;
  if (node.type === 'roll') references.rollIds.add(node.rollId);
  if (node.type === 'binary') {
    collectExpressionReferences(node.left, references);
    collectExpressionReferences(node.right, references);
  }
  if (node.type === 'unary') collectExpressionReferences(node.value, references);
  if (node.type === 'select') node.choices.forEach((choice) => collectExpressionReferences(choice, references));
  if (node.type === 'choice') {
    references.optionIds.add(node.optionId);
    node.choices.forEach((choice) => collectExpressionReferences(choice.expression, references));
  }
  return references;
}

function combineEnabledWhen(...values) {
  const conditions = values.flatMap((value) => (
    Array.isArray(value) ? value : value ? [value] : []
  ));
  if (!conditions.length) return null;
  return conditions.length === 1 ? conditions[0] : conditions;
}

export function compileRollCode(code, { id = 'coded-roll', name = 'Jet code', sources = [], exposed = true, active = true, visualId } = {}) {
  const program = parseRollCode(code);
  const references = collectExpressionReferences(program.expression);
  const activeRolls = program.rolls.filter((roll) => references.rollIds.has(roll.id));
  const parameters = program.declarations.map((declaration) => ({
    id: declaration.name,
    label: declaration.label || declaration.name,
    type: declaration.type === 'source' ? randomParameterTypes.SOURCE : randomParameterTypes.NUMBER,
    defaultValue: declaration.type === 'source'
      ? sourceIdForAlias(declaration.defaultValue, sources, declaration.position)
      : declaration.defaultValue,
    prompt: declaration.prompt === true,
    choices: declaration.type === 'source' && declaration.allowedSources
      ? [...new Set(declaration.allowedSources.map((source) => (
        sourceIdForAlias(source, sources, declaration.position)
      )))]
      : [],
    required: true,
  }));
  const components = activeRolls.map((roll) => ({
    id: roll.id,
    label: '',
    source: roll.source.kind === 'parameter'
      ? parameterValue(roll.source.parameterId)
      : fixedValue(sourceIdForAlias(roll.source, sources, roll.position)),
    count: roll.count,
    enabledWhen: roll.enabledWhen || null,
  }));
  const options = program.choices.filter((choice) => references.optionIds.has(choice.optionId)).map((choice) => ({
    id: choice.optionId,
    label: choice.choices.map((item) => item.label).join(' / '),
    type: randomOptionTypes.CHOICE,
    defaultValue: choice.defaultValue,
    choices: choice.choices.map((item) => ({ value: item.value, label: item.label })),
  }));
  const pipeline = [];
  activeRolls.forEach((roll, rollIndex) => {
    if (roll.reroll) pipeline.push({
      id: `reroll-${roll.id}`,
      type: randomPipelineStepTypes.REROLL,
      componentIds: [roll.id],
      condition: { type: 'compare', operator: conditionOperators[roll.reroll.operator], value: roll.reroll.value },
      maxIterations: roll.reroll.recursive ? 100 : 1,
      enabledWhen: combineEnabledWhen(
        roll.enabledWhen,
        roll.reroll.optional ? { optionId: `reroll-${roll.id}`, equals: true } : null,
      ),
    });
    if (roll.reroll?.optional) options.push({
      id: `reroll-${roll.id}`,
      label: `${roll.reroll.recursive ? 'Relances recursives' : 'Relance'}${activeRolls.length > 1 ? ` - jet ${rollIndex + 1}` : ''}`,
      type: randomOptionTypes.BOOLEAN,
      defaultValue: false,
    });
    if (roll.explode) pipeline.push({
      id: `explode-${roll.id}`,
      type: randomPipelineStepTypes.EXPLODE,
      componentIds: [roll.id],
      condition: roll.explode.trigger
        ? {
          type: 'compare',
          operator: conditionOperators[roll.explode.trigger.operator],
          value: roll.explode.trigger.value,
        }
        : { type: 'source-extreme', extreme: 'max' },
      maxIterations: 100,
      enabledWhen: combineEnabledWhen(
        roll.enabledWhen,
        roll.explode.optional ? { optionId: `explode-${roll.id}`, equals: true } : null,
      ),
    });
    if (roll.explode?.optional) options.push({
      id: `explode-${roll.id}`,
      label: `Explosion${activeRolls.length > 1 ? ` - jet ${rollIndex + 1}` : ''}`,
      type: randomOptionTypes.BOOLEAN,
      defaultValue: false,
    });
    if (roll.keep) pipeline.push({
      id: `keep-${roll.id}`,
      type: randomPipelineStepTypes.KEEP,
      componentIds: [roll.id],
      count: roll.keep.count,
      unit: 'chain',
      order: roll.keep.order,
      enabledWhen: roll.enabledWhen || null,
    });
    roll.successes.forEach((success, index) => pipeline.push({
      id: `success-${roll.id}-${index + 1}`,
      type: randomPipelineStepTypes.AGGREGATE,
      componentIds: [roll.id],
      operation: randomAggregateOperations.COUNT_MATCHES,
      condition: { type: 'compare', operator: conditionOperators[success.operator], value: success.value },
      outputId: `${roll.id}-success-${index + 1}`,
      label: `Compteur ${index + 1} (${success.operator}${referenceLabel(success.value)})`,
      enabledWhen: roll.enabledWhen || null,
    }));
  });
  pipeline.push({
    id: 'code-result',
    type: randomPipelineStepTypes.EXPRESSION,
    expression: compileExpression(program.expression, new Map(program.rolls.map((roll) => [roll.id, roll]))),
    outputId: 'result',
    label: 'Resultat',
    operation: randomAggregateOperations.SUM,
  });
  return normalizeRandomDefinition({
    id,
    name: program.resultName || name,
    visualId,
    exposed,
    active,
    recursive: program.recursive,
    parameters,
    options,
    components,
    pipeline,
    primaryAggregateId: 'result',
    code,
  });
}
