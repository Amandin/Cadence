import { useEffect, useState } from 'react';
import { performancePreferences } from '../../performanceMode.js';
import { themePreferenceModes } from '../../themePreference.js';
import { t } from '../../i18n/index.js';
import { uiGlyphs } from '../../uiAssets.js';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';

function selectedThemeMode(themeState) {
  return themeState?.mode && themeState.mode !== themePreferenceModes.SYSTEM ? themeState.mode : 'auto';
}

function OptionsSection({ title, help, actions, className = '', children }) {
  return (
    <section className={`scene-options compact-options options-section ${className}`.trim()}>
      <div className="options-section-head">
        <div className="options-section-title">
          <h3>{title}</h3>
          {help && <p className="muted compact-help">{help}</p>}
        </div>
        {actions && <div className="options-section-actions">{actions}</div>}
      </div>
      <div className="options-section-body">{children}</div>
    </section>
  );
}

export function ThemeModeToggle({ themeState, onThemeModeChange, ariaLabel = t('menu.toggleTheme') }) {
  const dark = !!themeState?.dark;
  if (selectedThemeMode(themeState) === 'auto') return null;

  const basculerThemeManuel = () => onThemeModeChange?.(dark ? themePreferenceModes.LIGHT : themePreferenceModes.DARK);

  return (
    <button className={`theme-toggle ${dark ? 'dark-on' : 'light-on'}`} onClick={basculerThemeManuel} aria-label={ariaLabel}>
      <span>{uiGlyphs.themeLight}</span>
      <span>{uiGlyphs.themeDark}</span>
      <i />
    </button>
  );
}

export function OptionsContent({ performanceState, themeState, onPerformancePreferenceChange, onThemeModeChange, onReplayTutorial, onResetCadence }) {
  const actualThemeMode = selectedThemeMode(themeState);
  const [themeMode, setThemeMode] = useState(actualThemeMode);
  const dark = !!themeState?.dark;

  useEffect(() => {
    if (themeMode !== 'manual') setThemeMode(actualThemeMode);
  }, [actualThemeMode, themeMode]);

  const choisirModeTheme = (value) => {
    setThemeMode(value);
    if (value === 'manual') onThemeModeChange?.(dark ? themePreferenceModes.DARK : themePreferenceModes.LIGHT);
    else if (value === 'auto') onThemeModeChange?.(themePreferenceModes.SYSTEM);
    else onThemeModeChange?.(value);
  };

  return (
    <div className="options-menu-content">
      <OptionsSection title={t('options.theme.title')}>
        <label className="field">
          {t('options.theme.mode')}
          <select value={themeMode} onChange={(event) => choisirModeTheme(event.target.value)}>
            <option value="auto">{t('options.theme.auto')}</option>
            <option value="manual">{t('options.theme.manual')}</option>
            <option value={themePreferenceModes.LIGHT}>{t('options.theme.light')}</option>
            <option value={themePreferenceModes.DARK}>{t('options.theme.dark')}</option>
          </select>
        </label>
      </OptionsSection>

      <OptionsSection
        title={t('performance.menu.title')}
        actions={performanceState?.automatic && <span className="chip hot">{t('performance.menu.autoActive')}</span>}
      >
        <label className="field">
          {t('performance.menu.label')}
          <select value={performanceState?.preference || performancePreferences.AUTO} onChange={(event) => onPerformancePreferenceChange?.(event.target.value)}>
            <option value={performancePreferences.AUTO}>{t('performance.preference.auto')}</option>
            <option value={performancePreferences.NORMAL}>{t('performance.preference.normal')}</option>
            <option value={performancePreferences.PERFORMANCE}>{t('performance.preference.performance')}</option>
          </select>
        </label>
      </OptionsSection>

      {(onReplayTutorial || onResetCadence) && (
        <OptionsSection title={t('options.guidance.title')} help={t('options.guidance.help')}>
          <div className="options-guidance-actions">
            {onReplayTutorial && <button type="button" className="primary" onClick={onReplayTutorial}>{t('options.guidance.replayTutorial')}</button>}
            {onResetCadence && <button type="button" className="danger-btn" onClick={onResetCadence}>{t('hub.campaigns.reset')}</button>}
          </div>
        </OptionsSection>
      )}
    </div>
  );
}

export function MenuOptions({ dark, performanceState, themeState, onClose, onPerformancePreferenceChange, onThemeModeChange, onReplayTutorial, onResetCadence }) {
  return (
    <Fenetre title={t('options.title')} onClose={onClose} className={`options-menu ${dark ? 'dark menu-dark' : ''}`}>
      <OptionsContent performanceState={performanceState} themeState={themeState} onPerformancePreferenceChange={onPerformancePreferenceChange} onThemeModeChange={onThemeModeChange} onReplayTutorial={onReplayTutorial} onResetCadence={onResetCadence} />
    </Fenetre>
  );
}
