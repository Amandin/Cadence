import { useEffect, useMemo, useState } from 'react';
import { t } from '../../i18n/index.js';
import { getCadenceLogo, uiGlyphs } from '../../uiAssets.js';

function PresetFamilySwitch({ family, onChange }) {
  return (
    <div className="grid2 onboarding-family-switch" role="tablist" aria-label={t('onboarding.familySwitchLabel')}>
      <button type="button" className={`choice ${family === 'generic' ? 'selected' : ''}`} aria-pressed={family === 'generic'} onClick={() => onChange('generic')}>
        {t('onboarding.family.generic')}
      </button>
      <button type="button" className={`choice ${family === 'system' ? 'selected' : ''}`} aria-pressed={family === 'system'} onClick={() => onChange('system')}>
        {t('onboarding.family.system')}
      </button>
    </div>
  );
}

function PresetCard({ preset, selected, onSelect }) {
  return (
    <button
      type="button"
      className={`choice onboarding-preset-card ${selected ? 'selected' : ''}`}
      onClick={() => onSelect(preset.id)}
      aria-pressed={selected}
    >
      <span className="onboarding-preset-name">{preset.name}</span>
      {preset.description ? <span className="onboarding-preset-description">{preset.description}</span> : null}
    </button>
  );
}

function PresetSection({ title, note, presets, selectedPresetId, onSelect }) {
  if (!presets.length) return null;
  return (
    <section className="onboarding-section">
      <h2>{title}</h2>
      {note ? <p className="onboarding-section-note">{note}</p> : null}
      <div className="stack onboarding-preset-list" role="list" aria-label={title}>
        {presets.map((preset) => (
          <PresetCard
            key={preset.id}
            preset={preset}
            selected={preset.id === selectedPresetId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}

export function FirstRunOnboarding({ dark, genericPresets = [], systemPresets = [], onToggleTheme, onStartPreset, onStartCustomRules }) {
  const allPresets = useMemo(() => [...genericPresets, ...systemPresets], [genericPresets, systemPresets]);
  const preferredSystemPresetId = useMemo(
    () => systemPresets.find((preset) => preset.catalogId === 'systemes/d20-tactique-dd-pathfinder')?.id || systemPresets[0]?.id || '',
    [systemPresets],
  );
  const [family, setFamily] = useState(() => (systemPresets.length ? 'system' : 'generic'));
  const [selectedPresetId, setSelectedPresetId] = useState(() => preferredSystemPresetId || genericPresets[0]?.id || allPresets[0]?.id || '');

  useEffect(() => {
    if (allPresets.some((preset) => preset.id === selectedPresetId)) return;
    setSelectedPresetId(preferredSystemPresetId || genericPresets[0]?.id || allPresets[0]?.id || '');
  }, [allPresets, genericPresets, preferredSystemPresetId, selectedPresetId]);

  const visiblePresets = family === 'system' ? systemPresets : genericPresets;

  useEffect(() => {
    if (visiblePresets.some((preset) => preset.id === selectedPresetId)) return;
    setSelectedPresetId(visiblePresets[0]?.id || '');
  }, [selectedPresetId, visiblePresets]);

  const selectedPreset = useMemo(
    () => allPresets.find((preset) => preset.id === selectedPresetId) || allPresets[0] || null,
    [allPresets, selectedPresetId],
  );

  return (
    <div className={`app welcome-app ${dark ? 'dark' : ''}`} data-skin="cadence" data-theme="cadence" data-mode={dark ? 'dark' : 'light'}>
      <main className="welcome-shell">
        <section className="panel welcome-panel">
          <div className="welcome-topbar">
            <div className="loading-mark welcome-mark">
              <img src={getCadenceLogo(dark)} alt="Cadence" />
            </div>
            <button className={`theme-toggle ${dark ? 'dark-on' : 'light-on'}`} onClick={() => onToggleTheme?.(!dark)} aria-label={t('onboarding.toggleTheme')}><span>{uiGlyphs.themeLight}</span><span>{uiGlyphs.themeDark}</span><i /></button>
          </div>
          <div className="welcome-copy">
            <strong className="brand-title">Cadence</strong>
            <h1>{t('onboarding.title')}</h1>
            <p>{t('onboarding.description')}</p>
          </div>

          <PresetFamilySwitch family={family} onChange={setFamily} />
          <PresetSection title={family === 'system' ? t('onboarding.presets.systemTitle') : t('onboarding.presets.genericTitle')} note={family === 'system' ? t('onboarding.presets.systemNote') : ''} presets={visiblePresets} selectedPresetId={selectedPreset?.id} onSelect={setSelectedPresetId} />

          <div className="welcome-actions">
            <button
              type="button"
              className="primary"
              onClick={() => selectedPreset && onStartPreset?.(selectedPreset)}
              disabled={!selectedPreset}
            >
              {t('onboarding.start')}
            </button>
            <button type="button" className="small-btn onboarding-custom-action" onClick={() => onStartCustomRules?.()}>
              <span className="onboarding-preset-name">{t('onboarding.customRules')}</span>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
