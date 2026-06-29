import { lazy, Suspense, useMemo, useState } from 'react';
import { t } from '../../i18n/index.js';
import { RulePoolManager } from './RulePoolManager.jsx';
import '../styles/configuration.css';

const loadDefinitionEditor = () => import('./DefinitionEditor.jsx');
const loadSourceManager = () => import('./SourceManager.jsx');
const DefinitionEditor = lazy(() => loadDefinitionEditor()
  .then((module) => ({ default: module.DefinitionEditor })));
const SourceManager = lazy(() => loadSourceManager()
  .then((module) => ({ default: module.SourceManager })));

const configSections = [
  { id: 'rules', icon: '◌', labelKey: 'random.config.rules' },
  { id: 'definitions', icon: '✦', labelKey: 'random.config.definitions' },
  { id: 'sources', icon: '◈', labelKey: 'random.config.sources' },
];

export function ConfigurationPanel({ state, actions }) {
  const [section, setSection] = useState('rules');
  const rollSources = useMemo(
    () => state.sources.filter((source) => source.kind !== 'cards'),
    [state.sources],
  );
  return (
    <div className="rs-configuration">
      <div className="rs-segmented rs-config-tabs">
        {configSections.map((entry) => (
          <button
            type="button"
            className={section === entry.id ? 'selected' : ''}
            onPointerEnter={entry.id === 'definitions' ? loadDefinitionEditor : entry.id === 'sources' ? loadSourceManager : undefined}
            onFocus={entry.id === 'definitions' ? loadDefinitionEditor : entry.id === 'sources' ? loadSourceManager : undefined}
            onClick={() => setSection(entry.id)}
            key={entry.id}
          >
            <span aria-hidden="true">{entry.icon}</span>
            <span>{t(entry.labelKey)}</span>
          </button>
        ))}
      </div>
      {section === 'rules' && <RulePoolManager rulePool={state.rulePool} actions={actions} />}
      <Suspense fallback={<div className="rs-empty-state">{t('random.loadingSection')}</div>}>
        {section === 'definitions' && <DefinitionEditor definitions={state.definitions} sources={rollSources} rulePool={state.rulePool} actions={actions} />}
        {section === 'sources' && <SourceManager sources={state.sources} definitions={state.definitions} actions={actions} />}
      </Suspense>
    </div>
  );
}
