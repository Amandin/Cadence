export class RollCodeError extends Error {
  constructor(message, position = 0, code = 'invalid-roll-code') {
    super(message);
    this.name = 'RollCodeError';
    this.code = code;
    this.position = position;
  }
}

export const comparisonOperators = new Set(['=', '==', '!=', '<', '<=', '>', '>=']);
export const numericFunctions = new Map([
  ['min', { minimum: 1 }],
  ['max', { minimum: 1 }],
  ['arrondi.inf', { exact: 1 }],
  ['arrondi.sup', { exact: 1 }],
  ['abs', { exact: 1 }],
  ['signe', { exact: 1 }],
  ['puissance', { exact: 2 }],
]);
export const treatmentNames = new Set(['bonus.occurrence', 'valeur', 'marque', 'table']);

export function tokenize(input) {
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
        /^d\d+(?=$|[+\-*/%();:=@<>!\[\]?{},\s]|(?:kh|kl|k|rr|r|s)(?=\d|[=<>!?\[(]))/i,
      );
      const match = diceMatch?.[0] || input.slice(index).match(/^[\p{L}_][\p{L}\p{N}_-]*(?:\.[\p{L}_][\p{L}\p{N}_-]*)*/u)[0];
      tokens.push({ type: 'identifier', value: match, start, end: index + match.length });
      index += match.length;
      continue;
    }
    if ('+-*/%();,:=@<>![]?{}&|'.includes(input[index])) {
      tokens.push({ type: 'symbol', value: input[index], start, end: index + 1 });
      index += 1;
      continue;
    }
    throw new RollCodeError(`Caractere inattendu : ${input[index]}`, start);
  }
  tokens.push({ type: 'eof', value: '', start: input.length, end: input.length });
  return tokens;
}

