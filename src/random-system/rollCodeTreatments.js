import { RollCodeError, comparisonOperators, numericFunctions } from './rollCodeLanguage.js';
import { randomKeepOrders } from './core/constants.js';
import { expressionValue, fixedValue, parameterValue } from './core/references.js';

export function modifierValue(label) {
  const token = this.current();
  if ((this.at('+') || this.at('-')) && this.current(1).type === 'number') {
    const sign = this.take().value === '-' ? -1 : 1;
    return fixedValue(sign * this.take().value);
  }
  if (token.type === 'number') { this.take(); return fixedValue(token.value); }
  if (this.at('[')) return this.numericReference();
  if (token.type === 'identifier' && numericFunctions.has(token.value)) {
    return expressionValue(this.numericFunction());
  }
  if (this.at('(')) {
    this.take();
    const node = this.expression();
    this.expect(')', 'Parenthese fermante attendue.');
    if (!this.isNumericExpression(node)) {
      throw new RollCodeError(`${label} attend un calcul sans jet.`, token.start);
    }
    return expressionValue(node);
  }
  throw new RollCodeError(`${label} attend un nombre, un calcul ou une variable numerique [nom].`, token.start);
}

export function condition(label) {
  if (this.at('(')) {
    this.take();
    const condition = this.conditionOr(label);
    this.expect(')', 'Parenthese fermante attendue dans la condition.');
    return condition;
  }
  return this.conditionAtom(label);
}

export function conditionOr(label) {
  let node = this.conditionAnd(label);
  while (this.at('ou') || this.at('|')) {
    this.take();
    const right = this.conditionAnd(label);
    node = node.type === 'any'
      ? { ...node, conditions: [...node.conditions, right] }
      : { type: 'any', conditions: [node, right] };
  }
  return node;
}

export function conditionAnd(label) {
  let node = this.conditionNot(label);
  while (this.at('et') || this.at('&')) {
    this.take();
    const right = this.conditionNot(label);
    node = node.type === 'all'
      ? { ...node, conditions: [...node.conditions, right] }
      : { type: 'all', conditions: [node, right] };
  }
  return node;
}

export function conditionNot(label) {
  if (this.at('non')) {
    this.take();
    return { type: 'not', condition: this.conditionNot(label) };
  }
  if (this.at('(')) {
    this.take();
    const node = this.conditionOr(label);
    this.expect(')', 'Parenthese fermante attendue dans la condition.');
    return node;
  }
  return this.conditionAtom(label);
}

export function conditionAtom(label) {
  let operator = '=';
  if (comparisonOperators.has(this.current().value)) operator = this.take().value;
  return { operator, value: this.modifierValue(label) };
}

export function occurrenceBonus() {
  const start = this.take();
  this.expect('(', '\u00ab ( \u00bb attendu apres bonus.occurrence.');
  let condition = null;
  let every = fixedValue(2);
  let amount = fixedValue(2);
  let targets = [];
  let counter = null;
  const seen = new Set();
  while (!this.at(')')) {
    const argument = this.expectIdentifier('Argument attendu dans bonus.occurrence.');
    if (seen.has(argument.value)) throw new RollCodeError(`Argument repete : ${argument.value}`, argument.start);
    seen.add(argument.value);
    if (argument.value === 'si') condition = this.condition('si');
    else if (argument.value === 'tous') {
      this.expect('=', '\u00ab = \u00bb attendu apres tous.');
      every = this.modifierValue('tous');
    } else if (argument.value === 'ajouter') {
      this.expect('=', '\u00ab = \u00bb attendu apres ajouter.');
      amount = this.modifierValue('ajouter');
    } else if (argument.value === 'sur') {
      this.expect('=', '\u00ab = \u00bb attendu apres sur.');
      targets = this.treatmentTargets();
    } else if (argument.value === 'compteur') {
      this.expect('=', '\u00ab = \u00bb attendu apres compteur.');
      if (this.current().type !== 'number' || !Number.isInteger(this.current().value) || this.current().value < 1) {
        throw new RollCodeError('compteur attend un numero positif.', this.current().start);
      }
      counter = this.take().value;
    } else {
      throw new RollCodeError(`Argument inconnu : ${argument.value}`, argument.start);
    }
    if (!this.at(',')) break;
    this.take();
  }
  this.expect(')', '\u00ab ) \u00bb attendu apres bonus.occurrence.');
  if (!condition) throw new RollCodeError('bonus.occurrence demande une condition si...', start.start);
  if (counter !== null && targets.length !== 1) {
    throw new RollCodeError('Un compteur cible demande exactement un groupe avec sur=...', start.start);
  }
  return { type: 'occurrence-bonus', condition, every, amount, targets, counter };
}

export function treatmentTargets() {
  const values = [];
  const readTarget = () => {
    if (this.current().type !== 'number' || !Number.isInteger(this.current().value) || this.current().value < 1) {
      throw new RollCodeError('sur attend un numero de groupe positif.', this.current().start);
    }
    values.push(this.take().value);
  };
  if (this.at('{')) {
    this.take();
    readTarget();
    while (this.at(';')) { this.take(); readTarget(); }
    this.expect('}', '\u00ab } \u00bb attendu apres les groupes.');
  } else readTarget();
  return values;
}

export function treatment() {
  if (this.at('bonus.occurrence')) return this.occurrenceBonus();
  if (this.at('valeur')) return this.valueMapping();
  if (this.at('marque')) return this.markerTreatment();
  return this.tableTreatment();
}

export function valueMapping() {
  const start = this.take();
  this.expect('(', '\u00ab ( \u00bb attendu apres valeur.');
  let condition = null;
  let value = null;
  let targets = [];
  while (!this.at(')')) {
    const argument = this.expectIdentifier('Argument attendu dans valeur.');
    if (argument.value === 'si') condition = this.condition('si');
    else if (argument.value === 'devient') {
      this.expect('=', '\u00ab = \u00bb attendu apres devient.');
      value = this.modifierValue('devient');
    } else if (argument.value === 'sur') {
      this.expect('=', '\u00ab = \u00bb attendu apres sur.');
      targets = this.treatmentTargets();
    } else throw new RollCodeError(`Argument inconnu : ${argument.value}`, argument.start);
    if (!this.at(',')) break;
    this.take();
  }
  this.expect(')', '\u00ab ) \u00bb attendu apres valeur.');
  if (!condition || !value) throw new RollCodeError('valeur demande si... et devient=...', start.start);
  return { type: 'map-value', condition, value, targets };
}

export function markerTreatment() {
  const start = this.take();
  this.expect('(', '\u00ab ( \u00bb attendu apres marque.');
  const marker = this.expectIdentifier('Nom de marqueur attendu.');
  this.expect(',', '\u00ab , \u00bb attendu apres le nom du marqueur.');
  const si = this.expectIdentifier('\u00ab si \u00bb attendu.');
  if (si.value !== 'si') throw new RollCodeError('\u00ab si \u00bb attendu.', si.start);
  const condition = this.condition('si');
  let targets = [];
  if (this.at(',')) {
    this.take();
    const sur = this.expectIdentifier('\u00ab sur \u00bb attendu.');
    if (sur.value !== 'sur') throw new RollCodeError('\u00ab sur \u00bb attendu.', sur.start);
    this.expect('=', '\u00ab = \u00bb attendu apres sur.');
    targets = this.treatmentTargets();
  }
  this.expect(')', '\u00ab ) \u00bb attendu apres marque.');
  return { type: 'marker', markerId: marker.value, condition, targets, position: start.start };
}

export function tableTreatment() {
  const start = this.take();
  this.expect('(', '\u00ab ( \u00bb attendu apres table.');
  const source = this.sourceReference(true);
  this.expect(')', '\u00ab ) \u00bb attendu apres table.');
  return { type: 'lookup-table', source, position: start.start };
}

export function roll(count, source, startToken) {
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
    if (token.value === '!') {
      this.take();
      const optional = this.at('?');
      if (optional) this.take();
      const trigger = comparisonOperators.has(this.current().value) || this.at('(')
        ? this.condition('!')
        : null;
      let collapse = null;
      let maxIterations = 100;
      while (this.current().type === 'identifier') {
        const suffix = this.current();
        const limit = suffix.value.match(/^n(\d+)$/);
        if (limit) {
          this.take();
          const numericLimit = Number(limit[1]);
          maxIterations = fixedValue(numericLimit);
          if (numericLimit < 1 || numericLimit > 100) {
            throw new RollCodeError('La limite d explosions doit etre comprise entre 1 et 100.', suffix.start);
          }
          continue;
        }
        if (suffix.value === 'n') {
          this.take();
          maxIterations = this.modifierValue('n');
          continue;
        }
        if (suffix.value === 'c') {
          this.take();
          collapse = this.condition('c');
          continue;
        }
        break;
      }
      roll.explode = {
        optional,
        trigger,
        collapse,
        maxIterations,
        question: this.at('option') ? this.optionQuestion() : null,
      };
      continue;
    }
    if (comparisonOperators.has(token.value)) {
      roll.successes.push(this.condition('succes'));
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
      roll.keep = {
        order: modifier === 'kl' ? randomKeepOrders.LOWEST : randomKeepOrders.HIGHEST,
        count: inline || this.modifierValue('k'),
        optional,
        question: this.at('option') ? this.optionQuestion() : null,
      };
    } else if (modifier === 'r' || modifier === 'rr') {
      roll.reroll = {
        ...(inline ? { operator: '=', value: inline } : this.condition(modifier)),
        recursive: modifier === 'rr',
        optional,
        question: this.at('option') ? this.optionQuestion() : null,
      };
    } else {
      if (optional) throw new RollCodeError('Un compteur de succes ne peut pas etre optionnel.', token.start);
      roll.successes.push(inline ? { operator: '>=', value: inline } : this.condition('s'));
    }
  }
  return { type: 'roll', rollId: roll.id };
}
