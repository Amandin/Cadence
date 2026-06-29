export const THEME_STORAGE_KEY = 'cadence:interface:theme-override:v1';
export const LEGACY_THEME_STORAGE_KEY = 'cadence:interface:dark:v1';
export const themePreferenceModes = {
  SYSTEM: 'system',
  LIGHT: 'light',
  DARK: 'dark',
};

export function devicePrefersDark(targetWindow = typeof window !== 'undefined' ? window : null) {
  return !!targetWindow?.matchMedia?.('(prefers-color-scheme: dark)').matches;
}

export function normalizeThemePreferenceMode(value) {
  if (value === themePreferenceModes.LIGHT || value === false) return themePreferenceModes.LIGHT;
  if (value === themePreferenceModes.DARK || value === true) return themePreferenceModes.DARK;
  return themePreferenceModes.SYSTEM;
}

export function normalizeStoredThemePreference(value) {
  if (value === themePreferenceModes.DARK) return true;
  if (value === themePreferenceModes.LIGHT) return false;
  return null;
}

export function themeModeFromPreference(preference) {
  if (preference === true) return themePreferenceModes.DARK;
  if (preference === false) return themePreferenceModes.LIGHT;
  return themePreferenceModes.SYSTEM;
}

export function storedThemePreference(storage = typeof window !== 'undefined' ? window.localStorage : null) {
  try {
    return normalizeStoredThemePreference(storage?.getItem(THEME_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function initialThemePreference({
  storedPreference = storedThemePreference(),
  systemDark = devicePrefersDark(),
} = {}) {
  return storedPreference ?? systemDark;
}

export function persistThemePreference(dark, storage = typeof window !== 'undefined' ? window.localStorage : null) {
  try {
    storage?.setItem(THEME_STORAGE_KEY, dark ? themePreferenceModes.DARK : themePreferenceModes.LIGHT);
  } catch {
    // La preference visuelle reste optionnelle.
  }
}

export function clearThemePreference(storage = typeof window !== 'undefined' ? window.localStorage : null) {
  try {
    storage?.removeItem(THEME_STORAGE_KEY);
  } catch {
    // La preference visuelle reste optionnelle.
  }
}

export function removeLegacyThemePreference(storage = typeof window !== 'undefined' ? window.localStorage : null) {
  try {
    storage?.removeItem(LEGACY_THEME_STORAGE_KEY);
  } catch {
    // L'ancien stockage n'est qu'une optimisation cosmetique.
  }
}
