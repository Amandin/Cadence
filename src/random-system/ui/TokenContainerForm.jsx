import { useEffect, useMemo, useState } from 'react';
import { t } from '../../i18n/index.js';
import { drawTokenTypes, selectTokenIndex } from '../tokens.js';

function totalTokens(container) {
  return Object.values(container?.contents || {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
}

function TokenMark({ type }) {
  return <span className="rs-token-swatch" style={type?.appearance?.color ? { backgroundColor: type.appearance.color } : undefined} aria-hidden="true">{type?.appearance?.image ? <img src={type.appearance.image} alt="" /> : type?.appearance?.symbol}</span>;
}

export function TokenContainerOverview({ containers, tokenTypes, openContainerId = '' }) {
  const typeById = useMemo(() => new Map(tokenTypes.map((type) => [type.id, type])), [tokenTypes]);
  return <section className="rs-token-overview" aria-label={t('random.tokens.containerStates')}>
    {containers.map((container) => <details key={container.id} open={container.id === openContainerId ? true : undefined}>
      <summary><span>{container.name}</span><strong>{t('random.tokens.total', { count: totalTokens(container) })}</strong></summary>
      <div className="rs-token-overview-content">
        {Object.entries(container.contents || {}).map(([typeId, count]) => {
          const type = typeById.get(typeId);
          return <span key={typeId}><TokenMark type={type} /><span>{type?.name || typeId}</span><strong>×{count}</strong></span>;
        })}
        {totalTokens(container) === 0 && <small className="muted">{t('random.tokens.emptySource')}</small>}
      </div>
    </details>)}
  </section>;
}

function InlineTokenResult({ result }) {
  if (!result) return null;
  return <section className="rs-token-inline-result" aria-live="polite">
    <h4>{t('random.result.title')}</h4>
    <div className="rs-token-result-grid">
      {result.tokens.map((token, index) => <article key={`${token.typeId}-${index}`}>
        <span className="rs-token-result-mark" style={token.appearance?.color ? { backgroundColor: token.appearance.color } : undefined} aria-hidden="true">{token.appearance?.image ? <img src={token.appearance.image} alt="" /> : token.appearance?.symbol}</span>
        <span><strong>{token.name}</strong><small>→ {token.destinationName}</small></span>
      </article>)}
    </div>
  </section>;
}

export function TokenContainerForm({ container, containers, tokenTypes, actions, onResult, result = null }) {
  const alternativeDestinationId = containers.find((item) => item.id !== container?.id)?.id || container?.id || '';
  const [mode, setMode] = useState('draw');
  const [count, setCount] = useState(() => Math.min(2, Math.max(1, totalTokens(container))));
  const [keepCount, setKeepCount] = useState(1);
  const [selectedDestinationId, setSelectedDestinationId] = useState(alternativeDestinationId);
  const [otherDestinationId, setOtherDestinationId] = useState(container?.id || '');
  const [pending, setPending] = useState(null);
  const [selectedIndexes, setSelectedIndexes] = useState([]);
  const [lastResult, setLastResult] = useState(null);
  const [editedTypeId, setEditedTypeId] = useState(tokenTypes[0]?.id || '');
  const [editedCount, setEditedCount] = useState(1);
  const [moveDestinationId, setMoveDestinationId] = useState('');
  const availableCount = totalTokens(container);
  const effectiveCount = Math.min(Math.max(1, Number(count) || 1), Math.max(1, availableCount));
  const effectiveKeepCount = Math.min(Math.max(0, Number(keepCount) || 0), pending?.length ?? effectiveCount);

  useEffect(() => {
    setPending(null);
    setLastResult(null);
    setCount(2);
    setKeepCount(1);
    setSelectedDestinationId(alternativeDestinationId);
    setOtherDestinationId(container?.id || '');
  }, [alternativeDestinationId, container?.id]);

  useEffect(() => {
    setCount((current) => Math.min(Math.max(1, Number(current) || 1), Math.max(1, availableCount)));
  }, [availableCount]);

  useEffect(() => {
    if (!editedTypeId && tokenTypes[0]) setEditedTypeId(tokenTypes[0].id);
  }, [editedTypeId, tokenTypes]);

  if (!container) return null;

  const startDraw = () => {
    const drawn = drawTokenTypes(container, effectiveCount);
    const nextKeepCount = Math.min(Number(keepCount) || 0, drawn.length);
    setPending(drawn);
    setSelectedIndexes(drawn.map((_, index) => index).slice(0, nextKeepCount));
    setLastResult(null);
  };
  const confirmDraw = () => {
    const result = actions.runTokenContainerDraw(container.id, {
      count: pending.length,
      keepCount: effectiveKeepCount,
      selectedDestinationId,
      otherDestinationId,
    }, selectedIndexes, pending);
    setLastResult(result);
    onResult?.(result);
    setPending(null);
  };
  const applyContentChange = (direction) => {
    const quantity = Math.max(1, Number(editedCount) || 1);
    if (direction > 0) actions.adjustTokenContents(container.id, { [editedTypeId]: quantity });
    else if (moveDestinationId) actions.moveTokenContents(container.id, moveDestinationId, { [editedTypeId]: quantity });
    else actions.adjustTokenContents(container.id, { [editedTypeId]: -quantity });
  };

  return <section className="rs-use-form rs-token-container-form">
    <div className="rs-section-head"><div><span className="rs-section-kicker">{t('random.tokens.container')}</span><h3>{container.name}</h3><small>{t('random.tokens.total', { count: availableCount })}</small></div></div>
    <div className="rs-token-operation-tabs" role="group" aria-label={t('random.tokens.actions')}>
      <button type="button" className={mode === 'draw' ? 'selected' : ''} onClick={() => setMode('draw')}>{t('random.tokens.run')}</button>
      <button type="button" className={mode === 'manage' ? 'selected' : ''} onClick={() => setMode('manage')}>{t('random.tokens.manage')}</button>
    </div>

    {mode === 'draw' && <div className="rs-token-draw-workflow">
      {!pending && <div className="rs-token-draw-settings">
        <label>{t('random.tokens.count')}<input type="number" min="1" max={Math.max(1, availableCount)} value={count} onChange={(event) => { setCount(event.target.value); setKeepCount((current) => Math.min(Number(current) || 0, Number(event.target.value) || 1)); }} /></label>
        <label>{t('random.tokens.keep')}<input type="number" min="0" max={effectiveCount} value={keepCount} onChange={(event) => setKeepCount(event.target.value)} /></label>
        <label>{t('random.tokens.selectedDestination')}<select value={selectedDestinationId} onChange={(event) => setSelectedDestinationId(event.target.value)}>{containers.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <label>{t('random.tokens.otherDestination')}<select value={otherDestinationId} onChange={(event) => setOtherDestinationId(event.target.value)}>{containers.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
      </div>}
      {pending ? <div className="rs-token-pending">
        <strong>{t('random.tokens.choose', { count: effectiveKeepCount })}</strong>
        <div className="rs-token-choice-grid">{pending.map((typeId, index) => {
          const type = tokenTypes.find((item) => item.id === typeId);
          const checked = selectedIndexes.includes(index);
          return <button type="button" className={checked ? 'selected' : ''} aria-pressed={checked} key={`${typeId}-${index}`} onClick={() => setSelectedIndexes((current) => selectTokenIndex(current, index, effectiveKeepCount))}><TokenMark type={type} /><span>{type?.name || typeId}</span></button>;
        })}</div>
        <div className="rs-token-route-summary"><span>{t('random.tokens.selectedDestination')} <strong>{containers.find((item) => item.id === selectedDestinationId)?.name}</strong></span><span>{t('random.tokens.otherDestination')} <strong>{containers.find((item) => item.id === otherDestinationId)?.name}</strong></span></div>
        <div className="rs-token-pending-actions"><button type="button" className="small-btn" onClick={() => setPending(null)}>{t('common.cancel')}</button><button type="button" className="primary rs-run-button" disabled={selectedIndexes.length !== effectiveKeepCount} onClick={confirmDraw}>{t('common.ok')}</button></div>
      </div> : <><button type="button" className="primary rs-run-button" disabled={availableCount === 0} onClick={startDraw}>{t('random.tokens.drawFrom', { name: container.name })}</button>{availableCount === 0 && <p className="rs-error">{t('random.tokens.emptySource')}</p>}</>}
    </div>}

    {mode === 'manage' && <div className="rs-token-manage-panel">
      <div className="rs-token-manage-fields">
        <label>{t('random.tokens.type')}<select value={editedTypeId} onChange={(event) => setEditedTypeId(event.target.value)}>{tokenTypes.map((type) => <option value={type.id} key={type.id}>{type.name}</option>)}</select></label>
        <label>{t('random.tokens.quantity')}<input type="number" min="1" value={editedCount} onChange={(event) => setEditedCount(event.target.value)} /></label>
        <label>{t('random.tokens.moveTo')}<select value={moveDestinationId} onChange={(event) => setMoveDestinationId(event.target.value)}><option value="">{t('random.tokens.outside')}</option>{containers.filter((item) => item.id !== container.id).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
      </div>
      <div className="rs-token-actions"><button type="button" className="small-btn" disabled={!editedTypeId} onClick={() => applyContentChange(1)}>{t('random.tokens.addDefined')}</button><button type="button" className="small-btn" disabled={!editedTypeId || !(container.contents[editedTypeId] > 0)} onClick={() => applyContentChange(-1)}>{moveDestinationId ? t('random.tokens.moveDefined') : t('random.tokens.takeDefined')}</button></div>
      <div className="rs-token-reference-actions"><button type="button" className="small-btn" disabled={!container.referenceContents} onClick={() => actions.resetTokenContainer(container.id)}>{t('random.tokens.resetReference')}</button><button type="button" className="small-btn" onClick={() => actions.saveTokenReference(container.id)}>{t('random.tokens.saveReference')}</button></div>
    </div>}

    <InlineTokenResult result={lastResult || (result?.kind === 'token-draw' && result.sourceId === container.id ? result : null)} />
    <TokenContainerOverview containers={containers} tokenTypes={tokenTypes} />
  </section>;
}
