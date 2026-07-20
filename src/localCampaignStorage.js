export const CADENCE_STORAGE_PREFIX = 'cadence:';

function browserLocalStorage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function browserSessionStorage() {
  try {
    return globalThis.sessionStorage || null;
  } catch {
    return null;
  }
}

export function readLocalCampaignPayload(storageKey, storage = browserLocalStorage()) {
  try {
    const raw = storage?.getItem(storageKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeLocalCampaignPayload(storageKey, payload, storage = browserLocalStorage()) {
  try {
    if (!storage) throw new Error('localStorage indisponible');
    storage.setItem(storageKey, JSON.stringify(payload));
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

export function removeLocalCampaignPayload(storageKey, storage = browserLocalStorage()) {
  try {
    if (!storage) throw new Error('localStorage indisponible');
    storage.removeItem(storageKey);
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

function clearCadenceKeys(storage) {
  try {
    if (!storage) return 0;
    const keys = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith(CADENCE_STORAGE_PREFIX)) keys.push(key);
    }
    keys.forEach((key) => storage.removeItem(key));
    return keys.length;
  } catch {
    return 0;
  }
}

export function clearAllCadenceStorage({ localStorage = browserLocalStorage(), sessionStorage = browserSessionStorage() } = {}) {
  return {
    local: clearCadenceKeys(localStorage),
    session: clearCadenceKeys(sessionStorage),
  };
}
