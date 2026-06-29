import { describe, expect, it, vi } from 'vitest';
import {
  LEGACY_THEME_STORAGE_KEY,
  THEME_STORAGE_KEY,
  clearThemePreference,
  initialThemePreference,
  normalizeStoredThemePreference,
  normalizeThemePreferenceMode,
  persistThemePreference,
  removeLegacyThemePreference,
  storedThemePreference,
  themePreferenceModes,
} from './themePreference.js';

function memoryStorage(values = {}) {
  const store = new Map(Object.entries(values));
  return {
    getItem: vi.fn((key) => store.get(key) ?? null),
    setItem: vi.fn((key, value) => store.set(key, value)),
    removeItem: vi.fn((key) => store.delete(key)),
    value(key) {
      return store.get(key) ?? null;
    },
  };
}

describe('theme preference', () => {
  it('uses the system theme when no manual preference exists', () => {
    expect(initialThemePreference({ storedPreference: null, systemDark: true })).toBe(true);
    expect(initialThemePreference({ storedPreference: null, systemDark: false })).toBe(false);
  });

  it('keeps manual theme preferences over the system default', () => {
    expect(initialThemePreference({ storedPreference: true, systemDark: false })).toBe(true);
    expect(initialThemePreference({ storedPreference: false, systemDark: true })).toBe(false);
  });

  it('stores manual preferences in the explicit override key only', () => {
    const storage = memoryStorage();

    persistThemePreference(true, storage);
    expect(storage.value(THEME_STORAGE_KEY)).toBe('dark');

    persistThemePreference(false, storage);
    expect(storage.value(THEME_STORAGE_KEY)).toBe('light');
  });

  it('ignores legacy auto-written boolean theme values', () => {
    const storage = memoryStorage({ [LEGACY_THEME_STORAGE_KEY]: 'true' });

    expect(storedThemePreference(storage)).toBeNull();
  });

  it('normalizes stored manual values', () => {
    expect(normalizeStoredThemePreference('dark')).toBe(true);
    expect(normalizeStoredThemePreference('light')).toBe(false);
    expect(normalizeStoredThemePreference('true')).toBeNull();
  });

  it('normalizes option menu theme modes', () => {
    expect(normalizeThemePreferenceMode('dark')).toBe(themePreferenceModes.DARK);
    expect(normalizeThemePreferenceMode('light')).toBe(themePreferenceModes.LIGHT);
    expect(normalizeThemePreferenceMode('system')).toBe(themePreferenceModes.SYSTEM);
    expect(normalizeThemePreferenceMode('unknown')).toBe(themePreferenceModes.SYSTEM);
  });

  it('can remove the legacy auto-written theme value', () => {
    const storage = memoryStorage({ [LEGACY_THEME_STORAGE_KEY]: 'false' });

    removeLegacyThemePreference(storage);

    expect(storage.removeItem).toHaveBeenCalledWith(LEGACY_THEME_STORAGE_KEY);
    expect(storage.value(LEGACY_THEME_STORAGE_KEY)).toBeNull();
  });

  it('can clear the manual override to return to the system theme', () => {
    const storage = memoryStorage({ [THEME_STORAGE_KEY]: 'dark' });

    clearThemePreference(storage);

    expect(storage.removeItem).toHaveBeenCalledWith(THEME_STORAGE_KEY);
    expect(storage.value(THEME_STORAGE_KEY)).toBeNull();
  });
});
