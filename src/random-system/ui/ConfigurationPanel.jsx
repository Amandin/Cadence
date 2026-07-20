import { lazy, Suspense, useMemo, useState } from 'react';
import { t } from '../../i18n/index.js';
import { Fenetre } from '../../interface/commun/ComposantsCommuns.jsx';
import { RulePoolManager } from './RulePoolManager.jsx';
import '../styles/base.css';
import '../styles/choice-controls.css';
import '../styles/configuration.css';

const loadDefinitionEditor = () => import('./DefinitionEditor.jsx');
const loadSourceManager = () => import('./SourceManager.jsx');
const loadRandomKitManager = () => import('./RandomKitManager.jsx');
const loadTokenManager = () => import('./TokenManager.jsx');
const DefinitionEditor = lazy(() => loadDefinitionEditor()
  .then((module) => ({ default: module.DefinitionEditor })));
const SourceManager = lazy(() => loadSourceManager()
  .then((module) => ({ default: module.SourceManager })));
const RandomKitManager = lazy(() => loadRandomKitManager()
  .then((module) => ({ default: module.RandomKitManager })));
const TokenManager = lazy(() => loadTokenManager()
  .then((module) => ({ default: module.TokenManager })));

export function ConfigurationPanel({ state, actions, section = 'kits', requiredDefinitionIds = [] }) {
  const [resultOptionsOpen, setResultOptionsOpen] = useState(false);
  const rollSources = useMemo(
    () => state.sources.filter((source) => source.kind !== 'cards'),
    [state.sources],
  );
  return (
    <div className="rs-configuration">
      <Suspense fallback={<div className="rs-empty-state">{t('random.loadingSection')}</div>}>
        {section === 'kits' && <RandomKitManager state={state} actions={actions} requiredDefinitionIds={requiredDefinitionIds} />}
        {section === 'rules' && <RulePoolManager rulePool={state.rulePool} actions={actions} />}
        {section === 'definitions' && <DefinitionEditor definitions={state.definitions} sources={rollSources} rulePool={state.rulePool} actions={actions} onOpenResultOptions={() => setResultOptionsOpen(true)} />}
        {section === 'sources' && <SourceManager sources={state.sources} definitions={state.definitions} actions={actions} />}
        {section === 'tokens' && <TokenManager state={state} actions={actions} />}
      </Suspense>
      {resultOptionsOpen && (
        <Fenetre title={t('random.rules.title')} onClose={() => setResultOptionsOpen(false)} className="random-rules-dialog">
          <RulePoolManager embedded rulePool={state.rulePool} actions={actions} />
        </Fenetre>
      )}
    </div>
  );
}
