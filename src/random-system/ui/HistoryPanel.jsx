import { memo } from 'react';
import { t } from '../../i18n/index.js';
import { RandomIcon } from './RandomIcons.jsx';

function historyValue(result) {
  if (result.kind === 'card-draw') return result.cards.map((card) => card.label).join(', ') || '—';
  const value = result.primaryAggregate?.value;
  return Array.isArray(value) ? value.map((item) => item.label || item.value).join(', ') : String(value ?? '—');
}

export const HistoryPanel = memo(function HistoryPanel({ history, onSelect, onClear }) {
  return (
    <aside className="rs-history">
      <div className="rs-section-head">
        <div className="rs-heading-with-mark">
          <span className="rs-heading-mark" aria-hidden="true"><RandomIcon name="history" /></span>
          <h3>{t('random.history.title')}</h3>
        </div>
        {history.length > 0 && <button type="button" className="small-btn" onClick={onClear}>{t('random.history.clear')}</button>}
      </div>
      <div className="rs-history-list">
        {history.map((result) => (
          <button type="button" onClick={() => onSelect(result.id)} key={result.id}>
            <span>
              <strong>{result.definitionName || result.sourceName}</strong>
              <time>{new Date(result.rolledAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</time>
            </span>
            <b>{historyValue(result)}</b>
          </button>
        ))}
        {!history.length && <p className="muted">{t('random.history.empty')}</p>}
      </div>
    </aside>
  );
});
