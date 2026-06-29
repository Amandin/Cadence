import { RandomSystemError } from './core/errors.js';

const UINT32_RANGE = 0x100000000;
const UINT53_RANGE = 0x20000000000000;
const ENTROPY_BUFFER_SIZE = 1024;
let entropyBuffer = new Uint32Array(0);
let entropyCursor = 0;

function cryptoProvider(provider = globalThis.crypto) {
  if (!provider?.getRandomValues) {
    throw new RandomSystemError(
      'secure-random-unavailable',
      'La source aléatoire sécurisée de la plateforme est indisponible.',
    );
  }
  return provider;
}

function secureUint32(provider) {
  const crypto = cryptoProvider(provider);
  if (crypto !== globalThis.crypto) {
    const directBuffer = new Uint32Array(1);
    crypto.getRandomValues(directBuffer);
    return directBuffer[0];
  }
  if (entropyCursor >= entropyBuffer.length) {
    entropyBuffer = new Uint32Array(ENTROPY_BUFFER_SIZE);
    crypto.getRandomValues(entropyBuffer);
    entropyCursor = 0;
  }
  const value = entropyBuffer[entropyCursor];
  entropyCursor += 1;
  return value;
}

export function secureRandomInteger(maxExclusive, provider = globalThis.crypto) {
  const maximum = Math.trunc(Number(maxExclusive));
  if (!Number.isSafeInteger(maximum) || maximum < 1 || maximum > UINT32_RANGE) {
    throw new RandomSystemError(
      'invalid-random-range',
      'La plage aléatoire demandée est invalide.',
      { maxExclusive },
    );
  }
  const acceptedLimit = Math.floor(UINT32_RANGE / maximum) * maximum;
  let sampled;
  do {
    sampled = secureUint32(provider);
  } while (sampled >= acceptedLimit);
  return sampled % maximum;
}

export function secureRandomFloat(provider = globalThis.crypto) {
  const high21Bits = secureUint32(provider) & 0x001fffff;
  const low32Bits = secureUint32(provider);
  return ((high21Bits * UINT32_RANGE) + low32Bits) / UINT53_RANGE;
}

secureRandomFloat.integer = secureRandomInteger;

export function randomUnit(rng = secureRandomFloat) {
  const sampled = Number(rng());
  if (!Number.isFinite(sampled) || sampled < 0 || sampled >= 1) {
    throw new RandomSystemError(
      'invalid-random-sample',
      'La source de hasard injectée doit produire une valeur comprise entre 0 inclus et 1 exclu.',
      { sampled },
    );
  }
  return sampled;
}

export function randomInteger(maxExclusive, rng = secureRandomFloat) {
  if (typeof rng?.integer === 'function') return rng.integer(maxExclusive);
  return Math.floor(randomUnit(rng) * maxExclusive);
}

export function randomWeightedIndex(weights, rng = secureRandomFloat) {
  const normalized = weights.map((weight) => Math.max(0, Number(weight) || 0));
  const total = normalized.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) {
    throw new RandomSystemError('empty-random-distribution', 'La distribution aléatoire est vide.');
  }

  const integerDistribution = normalized.every(Number.isSafeInteger)
    && Number.isSafeInteger(total)
    && total <= UINT32_RANGE;
  let cursor = integerDistribution ? randomInteger(total, rng) : randomUnit(rng) * total;
  for (let index = 0; index < normalized.length; index += 1) {
    cursor -= normalized[index];
    if (cursor < 0) return index;
  }
  return normalized.length - 1;
}
