import { describe, expect, it } from 'vitest';
import { clearAllCadenceStorage, readLocalCampaignPayload, writeLocalCampaignPayload } from './localCampaignStorage.js';

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    get length() { return values.size; },
    key(index) { return [...values.keys()][index] ?? null; },
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}

describe('local campaign storage', () => {
  it('returns a failure instead of throwing when localStorage cannot write', () => {
    const unavailableStorage = {
      getItem() { throw new Error('blocked'); },
      setItem() { throw new Error('quota exceeded'); },
    };

    expect(writeLocalCampaignPayload('cadence:campaign:v1', { name: 'Test' }, unavailableStorage)).toMatchObject({ ok: false });
    expect(readLocalCampaignPayload('cadence:campaign:v1', unavailableStorage)).toBeNull();
  });

  it('clears every Cadence key in local and session storage, without touching other sites', () => {
    const localStorage = memoryStorage({
      'cadence:campaign:v1': 'campaign',
      'cadence:random-system:v1': 'random',
      'other-app:setting': 'keep',
    });
    const sessionStorage = memoryStorage({
      'cadence:interface:view:v1': 'scene',
      'cadence:interface:hub-tab:v1': 'rules',
      'other-app:session': 'keep',
    });

    expect(clearAllCadenceStorage({ localStorage, sessionStorage })).toEqual({ local: 2, session: 2 });
    expect(localStorage.getItem('cadence:campaign:v1')).toBeNull();
    expect(localStorage.getItem('cadence:random-system:v1')).toBeNull();
    expect(localStorage.getItem('other-app:setting')).toBe('keep');
    expect(sessionStorage.getItem('cadence:interface:view:v1')).toBeNull();
    expect(sessionStorage.getItem('other-app:session')).toBe('keep');
  });
});
