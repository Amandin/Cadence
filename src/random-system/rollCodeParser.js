
import * as referenceMethods from './rollCodeReferences.js';
import * as treatmentMethods from './rollCodeTreatments.js';

export { RollCodeError } from './rollCodeLanguage.js';
import { expressionValue, fixedValue, parameterValue } from './core/references.js';
import { randomKeepOrders } from './core/constants.js';
import { RollCodeError, numericFunctions, tokenize, treatmentNames } from './rollCodeLanguage.js';

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
    const treatments = [];
    if (this.at(';') && treatmentNames.has(this.current(1).value)) this.take();
    while (treatmentNames.has(this.current().value)) {
      treatments.push(this.treatment());
      if (this.at(';')) this.take();
    }
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
      treatments,
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
      const endToken = this.expect(')', 'Parenthese fermante attendue.');
      if (this.at('@') && this.adjacent(endToken, this.current())) {
        if (!this.isNumericExpression(node)) throw new RollCodeError('Le nombre d appels doit etre un calcul sans jet.', endToken.start);
        return this.namedReference(expressionValue(node), endToken);
      }
      return this.diceFromComputedCount(node, endToken) || node;
    }
    const token = this.current();
    if (this.at('choice')) {
      return this.userChoice();
    }
    if (token.type === 'identifier' && numericFunctions.has(token.value)) {
      const node = this.numericFunction();
      const endToken = this.tokens[this.index - 1];
      if (this.at('@') && this.adjacent(endToken, this.current())) return this.namedReference(expressionValue(node), endToken);
      return this.diceFromComputedCount(node, endToken) || node;
    }
    if (this.at('si')) {
      const node = this.conditionalFunction();
      const endToken = this.tokens[this.index - 1];
      if (this.at('@') && this.adjacent(endToken, this.current())) return this.namedReference(expressionValue(node), endToken);
      return this.diceFromComputedCount(node, endToken) || node;
    }
    if (this.at('marqueurs')) return this.markerCount();
    if (this.at('[')) {
      const count = this.numericReference();
      if (this.at('@')) return this.namedReference(count, token);
      const sourceToken = this.current();
      if (sourceToken.value === 'c' && this.current(1).value === '@') {
        this.take();
        return this.cardRoll(count, token);
      }
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
    if (token.value === 'c' && this.current(1).value === '@') {
      this.take();
      return this.cardRoll(fixedValue(1), token);
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
      if (next.value === 'c' && this.current(2).value === '@') {
        this.take();
        this.take();
        return this.cardRoll(fixedValue(token.value), token);
      }
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


}

Object.assign(Parser.prototype, referenceMethods, treatmentMethods);

export function parseRollCode(code) {
  if (typeof code !== 'string') throw new RollCodeError('Le code du jet doit etre du texte.');
  return new Parser(code).parse();
}
