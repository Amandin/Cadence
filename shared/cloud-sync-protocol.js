const IGNORED_ROOT_KEYS = new Set(['savedAt', 'appVersion']);
const FORBIDDEN_PATH_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const encoder = new TextEncoder();

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function syncObject(value, depth = 0) {
  if (Array.isArray(value)) return value.map((entry) => syncObject(entry, depth + 1));
  if (!isPlainObject(value)) return value;
  const result = {};
  for (const key of Object.keys(value).sort()) {
    if (depth === 0 && IGNORED_ROOT_KEYS.has(key)) continue;
    result[key] = syncObject(value[key], depth + 1);
  }
  return result;
}

export function campaignSyncSignature(payload) {
  if (!payload || typeof payload !== 'object') return '';
  return JSON.stringify(syncObject(payload));
}

export async function campaignContentHash(payload) {
  const signature = campaignSyncSignature(payload);
  if (!signature) return '';
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(signature));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function sameScalar(left, right) {
  return Object.is(left, right);
}

export function createCampaignPatch(previous, next) {
  const operations = [];

  function compare(left, right, path) {
    if (sameScalar(left, right)) return;

    if (Array.isArray(left) && Array.isArray(right)) {
      if (left.length !== right.length) {
        operations.push({ op: 'set', path, value: right });
        return;
      }
      for (let index = 0; index < right.length; index += 1) compare(left[index], right[index], [...path, index]);
      return;
    }

    if (isPlainObject(left) && isPlainObject(right)) {
      const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
      for (const key of [...keys].sort()) {
        if (path.length === 0 && IGNORED_ROOT_KEYS.has(key)) continue;
        if (!(key in right)) operations.push({ op: 'remove', path: [...path, key] });
        else if (!(key in left)) operations.push({ op: 'set', path: [...path, key], value: right[key] });
        else compare(left[key], right[key], [...path, key]);
      }
      return;
    }

    operations.push({ op: 'set', path, value: right });
  }

  compare(previous, next, []);
  return { version: 1, operations };
}

function validPath(path) {
  return Array.isArray(path)
    && path.length <= 64
    && path.every((part) => (
      (typeof part === 'number' && Number.isInteger(part) && part >= 0)
      || (typeof part === 'string' && part.length <= 200 && !FORBIDDEN_PATH_KEYS.has(part))
    ));
}

export function validateCampaignPatch(patch) {
  if (!patch || patch.version !== 1 || !Array.isArray(patch.operations) || patch.operations.length > 10_000) return false;
  return patch.operations.every((operation) => (
    operation
    && (operation.op === 'set' || operation.op === 'remove')
    && validPath(operation.path)
    && (operation.op !== 'set' || Object.hasOwn(operation, 'value'))
  ));
}

export function applyCampaignPatch(payload, patch) {
  if (!validateCampaignPatch(patch)) throw new Error('INVALID_PATCH');
  let result = structuredClone(payload);

  for (const operation of patch.operations) {
    if (operation.path.length === 0) {
      if (operation.op === 'remove') throw new Error('INVALID_PATCH');
      result = structuredClone(operation.value);
      continue;
    }

    let target = result;
    for (let index = 0; index < operation.path.length - 1; index += 1) {
      const part = operation.path[index];
      if (target === null || typeof target !== 'object' || !(part in target)) throw new Error('INVALID_PATCH');
      target = target[part];
    }

    const key = operation.path.at(-1);
    if (target === null || typeof target !== 'object') throw new Error('INVALID_PATCH');
    if (operation.op === 'remove') {
      if (Array.isArray(target) && typeof key === 'number') target.splice(key, 1);
      else delete target[key];
    } else {
      target[key] = structuredClone(operation.value);
    }
  }
  return result;
}

export function serializedBytes(value) {
  return encoder.encode(JSON.stringify(value)).byteLength;
}
