import { t } from '../../i18n/index.js';
import { createTokenId } from '../tokens.js';

const emptyType = () => ({ id: createTokenId('type'), name: '', appearance: { color: '#6b4b9a', symbol: '', image: '' }, value: '', tags: [], description: '' });
const emptyContainer = () => ({ id: createTokenId('container'), name: '', contents: {}, referenceContents: null });

function TokenTypeCard({ token, actions }) {
  const update = (patch) => actions.saveTokenType({ ...token, ...patch });
  return <article className="rs-token-card">
    <div className="rs-token-type-head"><input value={token.name} placeholder={t('random.tokens.name')} onChange={(event) => update({ name: event.target.value })} /><button type="button" className="small-btn subtle-danger" onClick={() => actions.deleteTokenType(token.id)}>{t('common.delete')}</button></div>
    <div className="rs-token-fields">
      <label>{t('random.tokens.color')}<input type="color" value={token.appearance.color || '#6b4b9a'} onChange={(event) => update({ appearance: { ...token.appearance, color: event.target.value } })} /></label>
      <label>{t('random.tokens.symbol')}<input value={token.appearance.symbol} onChange={(event) => update({ appearance: { ...token.appearance, symbol: event.target.value } })} /></label>
      <label>{t('random.tokens.image')}<input value={token.appearance.image} onChange={(event) => update({ appearance: { ...token.appearance, image: event.target.value } })} /></label>
      <label>{t('random.tokens.value')}<input value={token.value} onChange={(event) => update({ value: event.target.value })} /></label>
      <label>{t('random.tokens.tags')}<input value={token.tags.join(', ')} onChange={(event) => update({ tags: event.target.value.split(',').map((value) => value.trim()).filter(Boolean) })} /></label>
    </div>
    <textarea value={token.description} placeholder={t('random.tokens.description')} onChange={(event) => update({ description: event.target.value })} />
  </article>;
}

function TokenContainerCard({ container, types, actions }) {
  const updateQuantity = (typeId, value) => actions.updateTokenContents(container.id, { [typeId]: value });
  const total = Object.values(container.contents).reduce((sum, count) => sum + (Number(count) || 0), 0);
  return <article className="rs-token-card">
    <div className="rs-token-type-head"><input value={container.name} placeholder={t('random.tokens.name')} onChange={(event) => actions.saveTokenContainer({ ...container, name: event.target.value })} /><button type="button" className="small-btn subtle-danger" onClick={() => actions.deleteTokenContainer(container.id)}>{t('common.delete')}</button></div>
    <details className="rs-token-definition-contents"><summary>{t('random.tokens.contents')} · {t('random.tokens.total', { count: total })}</summary><div className="rs-token-quantities">{types.map((type) => <label key={type.id}><span className="rs-token-swatch" style={{ backgroundColor: type.appearance.color || 'var(--ui-muted)' }}>{type.appearance.symbol}</span>{type.name}<input type="number" min="0" value={container.contents[type.id] || 0} onChange={(event) => updateQuantity(type.id, event.target.value)} /></label>)}</div></details>
    <div className="rs-token-actions"><button type="button" className="small-btn" disabled={!container.referenceContents} onClick={() => actions.resetTokenContainer(container.id)}>{t('random.tokens.resetReference')}</button><button type="button" className="small-btn" onClick={() => actions.saveTokenReference(container.id)}>{t('random.tokens.saveReference')}</button></div>
  </article>;
}

export function TokenManager({ state, actions }) {
  const { tokenTypes = [], tokenContainers = [] } = state;
  return <section className="rs-token-manager">
    <header><h3>{t('random.tokens.title')}</h3><p>{t('random.tokens.help')}</p></header>
    <section><div className="rs-token-section-head"><h4>{t('random.tokens.types')}</h4><button type="button" className="small-btn" onClick={() => actions.saveTokenType(emptyType())}>{t('random.tokens.addType')}</button></div>{tokenTypes.length ? <div className="rs-token-grid">{tokenTypes.map((token) => <TokenTypeCard key={token.id} token={token} actions={actions} />)}</div> : <p className="muted">{t('random.tokens.empty')}</p>}</section>
    <section><div className="rs-token-section-head"><h4>{t('random.tokens.containers')}</h4><button type="button" className="small-btn" onClick={() => actions.saveTokenContainer(emptyContainer())}>{t('random.tokens.addContainer')}</button></div>{tokenContainers.length ? <div className="rs-token-grid">{tokenContainers.map((container) => <TokenContainerCard key={container.id} container={container} types={tokenTypes} actions={actions} />)}</div> : <p className="muted">{t('random.tokens.empty')}</p>}</section>
  </section>;
}
