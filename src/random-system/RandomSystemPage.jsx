import { lazy, Suspense, useState } from 'react';
import { t } from '../i18n/index.js';
import { defaultMechanicalSymbol, uiSymbols } from '../uiAssets.js';
import { UsePanel } from './ui/UsePanel.jsx';
import { useRandomSystem } from './useRandomSystem.js';
import './styles/base.css';
import './styles/choice-controls.css';
import './styles/results.css';

const loadConfigurationPanel = () => import('./ui/ConfigurationPanel.jsx');
const loadStatisticsPanel = () => import('./ui/StatisticsPanel.jsx');
const ConfigurationPanel = lazy(() => loadConfigurationPanel()
  .then((module) => ({ default: module.ConfigurationPanel })));
const StatisticsPanel = lazy(() => loadStatisticsPanel()
  .then((module) => ({ default: module.StatisticsPanel })));
const pageTabs = [
  { id: 'use', icon: uiSymbols.draw, labelKey: 'random.tabs.use' },
  { id: 'configure', icon: defaultMechanicalSymbol, labelKey: 'random.tabs.configure' },
  { id: 'statistics', icon: uiSymbols.statistics, labelKey: 'random.tabs.statistics' },
];

export function RandomSystemPage({ onBack }) {
  const { state, actions } = useRandomSystem();
  const [view, setView] = useState('use');

  return (
    <section className="random-system-page">
      <header className="rs-toolbar">
        <button type="button" className="small-btn rs-back" onClick={onBack}>
          <span aria-hidden="true">{uiSymbols.randomBack}</span>
          <span>{t('random.back')}</span>
        </button>
        <div className="rs-toolbar-title">
          <span className="rs-section-kicker">Cadence</span>
          <div className="rs-heading-with-mark">
            <span className="rs-heading-mark" aria-hidden="true">{uiSymbols.draw}</span>
            <div>
              <h1>{t('random.title')}</h1>
              <span>{t('random.subtitle')}</span>
            </div>
          </div>
        </div>
        <div className="rs-main-tabs rs-segmented">
          {pageTabs.map((tab) => (
            <button
              type="button"
              className={view === tab.id ? 'selected' : ''}
              onPointerEnter={tab.id === 'configure' ? loadConfigurationPanel : tab.id === 'statistics' ? loadStatisticsPanel : undefined}
              onFocus={tab.id === 'configure' ? loadConfigurationPanel : tab.id === 'statistics' ? loadStatisticsPanel : undefined}
              onClick={() => setView(tab.id)}
              key={tab.id}
            >
              <span aria-hidden="true">{tab.icon}</span>
              <span>{t(tab.labelKey)}</span>
            </button>
          ))}
        </div>
      </header>

      <div className="rs-view">
        {view === 'use' && <UsePanel state={state} actions={actions} />}
        <Suspense fallback={<div className="rs-empty-state">{t('random.loadingSection')}</div>}>
          {view === 'configure' && <ConfigurationPanel state={state} actions={actions} />}
          {view === 'statistics' && <StatisticsPanel state={state} onReset={actions.resetStatistics} />}
        </Suspense>
      </div>
    </section>
  );
}

export default RandomSystemPage;
