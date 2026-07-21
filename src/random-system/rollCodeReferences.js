import { expressionValue, fixedValue, parameterValue } from './core/references.js';
import { RollCodeError, comparisonOperators, numericFunctions } from './rollCodeLanguage.js';

export function numericFunction() {
  const nameToken = this.take();
  const rule = numericFunctions.get(nameToken.value);
  this.expect('(', `\u00ab ( \u00bb attendu apres ${nameToken.value}.`);
  const args = [];
  if (!this.at(')')) {
    args.push(this.expression());
    while (this.at(',')) {
      this.take();
      args.push(this.expression());
    }
  }
  this.expect(')', `\u00ab ) \u00bb attendu apres ${nameToken.value}.`);
  if ((rule.exact !== undefined && args.length !== rule.exact)
    || (rule.minimum !== undefined && args.length < rule.minimum)) {
    throw new RollCodeError(`${nameToken.value} ne recoit pas le bon nombre d'arguments.`, nameToken.start);
  }
  return { type: 'function', name: nameToken.value, arguments: args };
}

export function cardRoll(count, startToken) {
  const source = this.sourceReference(true);
  let withReplacement = false;
  if (this.at('(')) {
    this.take();
    const mode = this.expectIdentifier('Mode de tirage de cartes attendu.');
    if (mode.value !== 'remise') throw new RollCodeError('Le mode de cartes attendu est remise.', mode.start);
    this.expect(')', '\u00ab ) \u00bb attendu apres remise.');
    withReplacement = true;
  }
  const node = this.roll(count, source, startToken);
  this.rolls.find((roll) => roll.id === node.rollId).cardMode = withReplacement ? 'replacement' : 'draw';
  return node;
}

export function markerCount() {
  const start = this.take();
  this.expect('(', '\u00ab ( \u00bb attendu apres marqueurs.');
  const expression = this.expression();
  this.expect(',', '\u00ab , \u00bb attendu avant le nom du marqueur.');
  const marker = this.expectIdentifier('Nom de marqueur attendu.');
  this.expect(')', '\u00ab ) \u00bb attendu apres marqueurs.');
  return { type: 'marker-count', expression, markerId: marker.value, position: start.start };
}

export function conditionalFunction() {
  const start = this.take();
  this.expect('(', '\u00ab ( \u00bb attendu apres si.');
  const condition = this.numericCondition();
  this.expect(',', '\u00ab , \u00bb attendu apres la condition.');
  const whenTrue = this.expression();
  this.expect(',', '\u00ab , \u00bb attendu avant la valeur alternative.');
  const whenFalse = this.expression();
  this.expect(')', '\u00ab ) \u00bb attendu apres si.');
  return { type: 'conditional', condition, whenTrue, whenFalse, position: start.start };
}

export function numericCondition() {
  let node = this.numericConditionAnd();
  while (this.at('ou') || this.at('|')) {
    this.take();
    node = { type: 'any', conditions: [node, this.numericConditionAnd()] };
  }
  return node;
}

export function numericConditionAnd() {
  let node = this.numericConditionAtom();
  while (this.at('et') || this.at('&')) {
    this.take();
    node = { type: 'all', conditions: [node, this.numericConditionAtom()] };
  }
  return node;
}

export function numericConditionAtom() {
  if (this.at('non')) {
    this.take();
    return { type: 'not', condition: this.numericConditionAtom() };
  }
  if (this.at('(')) {
    this.take();
    const condition = this.numericCondition();
    this.expect(')', 'Parenthese fermante attendue dans la condition.');
    return condition;
  }
  const left = this.expression();
  if (!comparisonOperators.has(this.current().value)) {
    throw new RollCodeError('Comparaison attendue dans si(...).', this.current().start);
  }
  const operator = this.take().value;
  const right = this.expression();
  return { type: 'compare-values', operator, left, right };
}

export function isNumericExpression(node) {
  if (!node || typeof node !== 'object') return false;
  if (node.type === 'number' || node.type === 'parameter') return true;
  if (node.type === 'unary') return this.isNumericExpression(node.value);
  if (node.type === 'binary') {
    return this.isNumericExpression(node.left) && this.isNumericExpression(node.right);
  }
  if (node.type === 'function') return node.arguments.every((argument) => this.isNumericExpression(argument));
  if (node.type === 'conditional') {
    return this.isNumericCondition(node.condition)
      && this.isNumericExpression(node.whenTrue)
      && this.isNumericExpression(node.whenFalse);
  }
  return false;
}

export function isNumericCondition(condition) {
  if (condition.type === 'compare-values') {
    return this.isNumericExpression(condition.left) && this.isNumericExpression(condition.right);
  }
  if (condition.type === 'not') return this.isNumericCondition(condition.condition);
  return (condition.conditions || []).every((item) => this.isNumericCondition(item));
}

export function diceFromComputedCount(node, endToken) {
  const sourceToken = this.current();
  if (sourceToken.value === 'c' && this.current(1).value === '@' && this.adjacent(endToken, sourceToken)) {
    if (!this.isNumericExpression(node)) {
      throw new RollCodeError('Le nombre de cartes ne peut pas contenir un tirage ou un choix.', sourceToken.start);
    }
    this.take();
    return this.cardRoll(expressionValue(node), sourceToken);
  }
  const diceStart = sourceToken.type === 'identifier'
    && (/^d\d+$/.test(sourceToken.value) || sourceToken.value === 'd')
    && this.adjacent(endToken, sourceToken);
  if (!diceStart) return null;
  if (!this.isNumericExpression(node)) {
    throw new RollCodeError('Le nombre de des ne peut pas contenir un jet ou un choix.', sourceToken.start);
  }
  this.take();
  const source = /^d\d+$/.test(sourceToken.value)
    ? { kind: 'alias', value: sourceToken.value }
    : this.at('{') ? this.inlineSourceReference() : this.sourceReference(true);
  return this.roll(expressionValue(node), source, sourceToken);
}

export function cloneFormulaNode(node) {
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
  if (node.type === 'function') return {
    ...node,
    arguments: node.arguments.map((argument) => this.cloneFormulaNode(argument)),
  };
  if (node.type === 'conditional') return {
    ...node,
    condition: this.cloneNumericCondition(node.condition),
    whenTrue: this.cloneFormulaNode(node.whenTrue),
    whenFalse: this.cloneFormulaNode(node.whenFalse),
  };
  if (node.type === 'repeat') return { ...node, expression: this.cloneFormulaNode(node.expression) };
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

export function cloneNumericCondition(condition) {
  if (condition.type === 'compare-values') return {
    ...condition,
    left: this.cloneFormulaNode(condition.left),
    right: this.cloneFormulaNode(condition.right),
  };
  if (condition.type === 'not') return { ...condition, condition: this.cloneNumericCondition(condition.condition) };
  return { ...condition, conditions: condition.conditions.map((item) => this.cloneNumericCondition(item)) };
}

export function namedReference(count, startToken) {
  this.expect('@', '« @ » attendu.');
  const nameToken = this.expectIdentifier('Nom de source ou de tirage attendu.');
  const formula = this.formulas.get(nameToken.value);
  if (formula) {
    if (count.kind !== 'fixed') {
      const rollStart = this.rolls.length;
      const repeatedExpression = this.cloneFormulaNode(formula);
      this.rolls.slice(rollStart).forEach((roll) => {
        roll.repeatBaseCount = roll.count;
        roll.count = expressionValue({
          type: 'binary',
          operator: '*',
          left: this.referenceNode(roll.count),
          right: this.referenceNode(count),
        });
        roll.perRepeat = true;
      });
      return { type: 'repeat', count, expression: repeatedExpression };
    }
    if (!Number.isInteger(Number(count.value))) {
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

export function referenceNode(reference) {
  if (reference.kind === 'parameter') return { type: 'parameter', parameterId: reference.parameterId };
  if (reference.kind === 'expression') return reference.expression;
  return { type: 'number', value: Number(reference.value) };
}

export function userChoice() {
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

export function optionQuestion() {
  const start = this.take();
  this.expect('(', 'Â« ( Â» attendu apres option.');
  const name = this.expectIdentifier('Nom de l’option attendu.');
  const parts = [];
  let defaultValue = false;
  while (this.at(',')) {
    this.take();
    const part = this.expectIdentifier('Libellé ou valeur par defaut attendu.');
    parts.push(part);
  }
  this.expect(')', 'Â« ) Â» attendu apres option.');
  const lastPart = parts.at(-1);
  if (lastPart && ['oui', 'non'].includes(lastPart.value.toLocaleLowerCase('fr'))) {
    defaultValue = lastPart.value.toLocaleLowerCase('fr') === 'oui';
    parts.pop();
  }
  const label = (parts.length ? parts : [name]).map((part) => part.value.replaceAll('-', ' ')).join(' ');
  const existing = this.questionsByName.get(name.value);
  if (existing) {
    if (existing.label !== label || existing.defaultValue !== defaultValue) {
      throw new RollCodeError(`Option contradictoire : ${name.value}`, start.start);
    }
    return existing;
  }
  const question = {
    optionId: `code-question-${this.questions.length + 1}`,
    name: name.value,
    label,
    defaultValue,
  };
  this.questions.push(question);
  this.questionsByName.set(name.value, question);
  return question;
}

export function numericReference() {
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

export function inlineSourceReference() {
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

export function sourceReference(requireAt) {
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
