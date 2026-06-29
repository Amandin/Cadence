import { performancePreferences } from '../../performanceMode.js';
import { themePreferenceModes } from '../../themePreference.js';
import { t } from '../../i18n/index.js';
import { uiGlyphs } from '../../uiAssets.js';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';

function themeControlMode(themeState) {
  return themeState?.mode && themeState.mode !== themePreferenceModes.SYSTEM ? 'manual' : 'auto';
}

export function ThemeModeToggle({ themeState, onThemeModeChange, ariaLabel = t('menu.toggleTheme') }) {
  const dark = !!themeState?.dark;
  if (themeControlMode(themeState) !== 'manual') return null;

  const basculerThemeManuel = () => onThemeModeChange?.(dark ? themePreferenceModes.LIGHT : themePreferenceModes.DARK);

  return (
    <button className={`theme-toggle ${dark ? 'dark-on' : 'light-on'}`} onClick={basculerThemeManuel} aria-label={ariaLabel}>
      <span>{uiGlyphs.themeLight}</span>
      <span>{uiGlyphs.themeDark}</span>
      <i />
    </button>
  );
}

export function OptionsContent({ performanceState, themeState, onPerformancePreferenceChange, onThemeModeChange }) {
  const themeMode = themeControlMode(themeState);
  const dark = !!themeState?.dark;
  const choisirModeTheme = (value) => {
    if (value === 'manual') onThemeModeChange?.(dark ? themePreferenceModes.DARK : themePreferenceModes.LIGHT);
    else onThemeModeChange?.(themePreferenceModes.SYSTEM);
  };

  return (
    <div className="options-menu-content">
      <section className="scene-options compact-options options-section">
        <div className="compact-option-title">
          <h3>{t('options.theme.title')}</h3>
        </div>
        <label className="field">
          {t('options.theme.mode')}
          <select value={themeMode} onChange={(event) => choisirModeTheme(event.target.value)}>
            <option value="auto">{t('options.theme.auto')}</option>
            <option value="manual">{t('options.theme.manual')}</option>
          </select>
        </label>
      </section>

      <section className="scene-options compact-options options-section">
        <div className="compact-option-title">
          <h3>{t('performance.menu.title')}</h3>
          {performanceState?.automatic && <span className="chip hot">{t('performance.menu.autoActive')}</span>}
        </div>
        <label className="field">
          {t('performance.menu.label')}
          <select value={performanceState?.preference || performancePreferences.AUTO} onChange={(event) => onPerformancePreferenceChange?.(event.target.value)}>
            <option value={performancePreferences.AUTO}>{t('performance.preference.auto')}</option>
            <option value={performancePreferences.NORMAL}>{t('performance.preference.normal')}</option>
            <option value={performancePreferences.PERFORMANCE}>{t('performance.preference.performance')}</option>
          </select>
        </label>
      </section>
    </div>
  );
}

export function MenuOptions({ dark, performanceState, themeState, onClose, onPerformancePreferenceChange, onThemeModeChange }) {
  return (
    <Fenetre title={t('options.title')} onClose={onClose} className={`options-menu ${dark ? 'dark menu-dark' : ''}`}>
      <OptionsContent performanceState={performanceState} themeState={themeState} onPerformancePreferenceChange={onPerformancePreferenceChange} onThemeModeChange={onThemeModeChange} />
    </Fenetre>
  );
}
