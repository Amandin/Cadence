import { useEffect, useMemo, useRef, useState } from 'react';
import { t } from '../../i18n/index.js';
import { parseRandomSourceCsv } from '../csv.js';
import { createUniformSource, randomSourceKinds } from '../engine.js';
import { createResourceId } from '../resourceIds.js';
import { createGuidedWeightedSource } from '../weightedSources.js';
import { OutcomeDetailEditor } from './OutcomeDetailEditor.jsx';
import { RandomIcon, RandomSourceIcon } from './RandomIcons.jsx';

const CSV_EXAMPLE = 'plage,nom,symbole,texte\n1-2,Soleil,,Ciel bien degage\n3,Nuage,,Quelques nuages\n4,Pluie,,Averses possibles';
const MAX_GUIDED_UNIFORM_FACES = 200;

function weightedRow(outcome = {}, index = 0) {
  return {
    id: outcome.id || createResourceId('outcome'),
    label: outcome.label || '',
    weight: outcome.weight ?? 1,
    value: outcome.value ?? '',
    symbol: outcome.symbol || '',
    image: outcome.image || '',
    text: outcome.text || '',
    index,
  };
}

function cardRow(card = {}, index = 0) {
  return {
    id: card.id || `card-${index + 1}`,
    label: card.label || '',
    value: card.value ?? card.label ?? '',
    rank: card.rank || '',
    suit: card.suit || '',
    color: card.color || '',
    symbol: card.symbol || '',
    image: card.image || '',
    text: card.comment || '',
    markers: card.markers || [],
  };
}

function listedEntries(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((label, lineIndex) => ({ label: label.trim(), lineIndex }))
    .filter((entry) => entry.label);
}

function cleanDetailMap(enabled, details) {
  if (!enabled) return {};
  return Object.fromEntries(
    Object.entries(details)
      .map(([value, detail]) => [value, String(detail || '').trim()])
      .filter(([, detail]) => detail),
  );
}

function uniformFaceValues(draft) {
  const min = Number(draft.min);
  const max = Number(draft.max);
  const step = Math.abs(Number(draft.step));
  if (!Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(step) || step <= 0 || max < min) return [];
  const count = Math.floor((max - min) / step) + 1;
  if (count > MAX_GUIDED_UNIFORM_FACES) return null;
  return Array.from({ length: Math.max(1, count) }, (_, index) => {
    const raw = min + (index * step);
    return Number.isInteger(raw) ? raw : Number(raw.toFixed(10));
  });
}

function sourceToCsv(source) {
  if (source?.kind !== randomSourceKinds.WEIGHTED) return CSV_EXAMPLE;
  const escape = (value) => {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [
    'nom,poids,valeur,symbole,image,texte',
    ...source.outcomes.map((outcome) => [
      escape(outcome.label),
      outcome.weight,
      escape(outcome.value),
      escape(outcome.symbol),
      escape(outcome.image),
      escape(outcome.text),
    ].join(',')),
  ].join('\n');
}

function sourceUsedByDefinitions(sourceId, definitions) {
  return definitions.some((definition) => (
    definition.components.some((component) => component.source.kind === 'fixed' && component.source.value === sourceId)
    || definition.parameters.some((parameter) => parameter.type === 'source' && parameter.defaultValue === sourceId)
    || definition.pipeline?.some((step) => step.type === 'lookup-table' && step.sourceId === sourceId)
  ));
}

function sourceKindLabel(source) {
  if (source.note) return source.note;
  if (source.kind === randomSourceKinds.CARDS) return t('random.source.cards');
  if (source.kind === randomSourceKinds.WEIGHTED) return t('random.source.weighted');
  return t('random.source.uniform');
}

function sourceDraft(source) {
  if (!source) {
    return {
      id: createResourceId('source'),
      name: 'Nouvelle source',
      note: '',
      kind: randomSourceKinds.UNIFORM,
      min: 1,
      max: 6,
      step: 1,
      describeFaces: false,
      faceLabels: {},
      faceSymbols: {},
      faceImages: {},
      faceTexts: {},
      weightedMode: 'guided',
      outcomes: [weightedRow()],
      weightedEntries: '',
      csv: CSV_EXAMPLE,
      cards: '',
      cardDetails: [],
    };
  }
  return {
    id: source.id,
    name: source.name,
    note: source.note || '',
    kind: source.kind,
    min: source.min ?? 1,
    max: source.max ?? 6,
    step: source.step ?? 1,
    describeFaces: source.kind === randomSourceKinds.UNIFORM
      && (
        Object.keys(source.labels || {}).length > 0
        || Object.keys(source.symbols || {}).length > 0
        || Object.keys(source.images || {}).length > 0
        || Object.keys(source.texts || {}).length > 0
      ),
    faceLabels: source.labels || {},
    faceSymbols: source.symbols || {},
    faceImages: source.images || {},
    faceTexts: source.texts || {},
    weightedMode: 'guided',
    outcomes: source.kind === randomSourceKinds.WEIGHTED
      ? source.outcomes.map(weightedRow)
      : [weightedRow()],
    weightedEntries: source.kind === randomSourceKinds.WEIGHTED
      ? source.outcomes.map((outcome) => outcome.label).join('\n')
      : '',
    csv: sourceToCsv(source),
    cards: source.kind === randomSourceKinds.CARDS
      ? source.cards.map((card) => card.label).join('\n')
      : '',
    cardDetails: source.kind === randomSourceKinds.CARDS
      ? source.cards.map(cardRow)
      : [],
  };
}

function uniformDetailOptions(faceValues) {
  return Array.isArray(faceValues)
    ? faceValues.map((value) => ({ value: String(value), label: String(value) }))
    : [];
}

function ensureSelection(options, current) {
  if (!options.length) return '';
  if (options.some((option) => option.value === current)) return current;
  return options[0].value;
}

function selectedEntryIndex(entries, selectedLine) {
  if (!entries.length) return -1;
  const index = entries.findIndex((entry) => String(entry.lineIndex) === selectedLine);
  return index >= 0 ? index : 0;
}

export function SourceManager({ sources, definitions, actions }) {
  const [selectedId, setSelectedId] = useState(sources[0]?.id || '');
  const selected = sources.find((item) => item.id === selectedId) || null;
  const [draft, setDraft] = useState(() => sourceDraft(selected));
  const [error, setError] = useState('');
  const [selectedFaceValue, setSelectedFaceValue] = useState('');
  const [selectedOutcomeLine, setSelectedOutcomeLine] = useState('0');
  const [selectedCardLine, setSelectedCardLine] = useState('0');
  const fileInputRef = useRef(null);

  useEffect(() => {
    setDraft(sourceDraft(selected));
    setError('');
    setSelectedFaceValue('');
    setSelectedOutcomeLine('0');
    setSelectedCardLine('0');
  }, [selected]);

  const used = useMemo(() => selected && sourceUsedByDefinitions(selected.id, definitions), [definitions, selected]);
  const totalWeight = useMemo(
    () => draft.outcomes.reduce((sum, outcome) => sum + (Number(outcome.weight) || 0), 0),
    [draft.outcomes],
  );
  const weightedEntries = useMemo(() => listedEntries(draft.weightedEntries), [draft.weightedEntries]);
  const faceValues = useMemo(
    () => draft.kind === randomSourceKinds.UNIFORM ? uniformFaceValues(draft) : [],
    [draft.kind, draft.max, draft.min, draft.step],
  );
  const faceOptions = useMemo(() => uniformDetailOptions(faceValues), [faceValues]);
  const activeFaceValue = ensureSelection(faceOptions, selectedFaceValue);
  const outcomeOptions = useMemo(
    () => weightedEntries.map((entry, index) => ({
      value: String(entry.lineIndex),
      label: entry.label || t('random.source.outcomeNumber', { index: index + 1 }),
    })),
    [weightedEntries],
  );
  const activeOutcomeLine = ensureSelection(outcomeOptions, selectedOutcomeLine);
  const activeOutcomeIndex = selectedEntryIndex(weightedEntries, activeOutcomeLine);
  const cardEntries = useMemo(() => listedEntries(draft.cards), [draft.cards]);
  const cardOptions = useMemo(
    () => cardEntries.map((card, index) => ({
      value: String(card.lineIndex),
      label: `${index + 1}. ${card.label}`,
    })),
    [cardEntries],
  );
  const activeCardLine = ensureSelection(cardOptions, selectedCardLine);
  const activeOutcome = activeOutcomeIndex >= 0
    ? draft.outcomes[activeOutcomeIndex] || null
    : null;
  const activeCard = cardEntries.find((card) => String(card.lineIndex) === activeCardLine) || null;
  const activeCardDetails = activeCard ? draft.cardDetails[activeCard.lineIndex] || {} : {};

  const createSource = (kind, weightedMode = 'guided') => {
    setSelectedId('');
    setDraft({ ...sourceDraft(null), kind, weightedMode });
    setError('');
    setSelectedFaceValue('');
    setSelectedOutcomeLine('0');
    setSelectedCardLine('0');
  };

  const saveUniform = () => {
    const labels = cleanDetailMap(draft.describeFaces, draft.faceLabels);
    const symbols = cleanDetailMap(draft.describeFaces, draft.faceSymbols);
    const images = cleanDetailMap(draft.describeFaces, draft.faceImages);
    const texts = cleanDetailMap(draft.describeFaces, draft.faceTexts);
    const saved = actions.saveSource(createUniformSource({
      ...draft,
      labels,
      symbols,
      images,
      texts,
    }));
    setSelectedId(saved.id);
    setError('');
  };

  const saveWeighted = () => {
    if (draft.weightedMode === 'guided') {
      const guided = createGuidedWeightedSource(draft.outcomes, {
        id: draft.id,
        name: draft.name,
        note: draft.note,
      });
      if (!guided.ok) {
        setError(guided.error);
        return;
      }
      const saved = actions.saveSource(guided.source);
      setSelectedId(saved.id);
      setError('');
      return;
    }
    const parsed = parseRandomSourceCsv(draft.csv, { id: draft.id, name: draft.name, note: draft.note });
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    const saved = actions.saveSource(parsed.source);
    setSelectedId(saved.id);
    setError('');
  };

  const saveCards = () => {
    const cards = draft.cards
      .split(/\r?\n/)
      .map((label, index) => {
        const cleanLabel = label.trim();
        const original = draft.cardDetails[index];
        return {
          id: original?.id || `card-${index + 1}`,
          label: cleanLabel,
          value: original?.value ?? cleanLabel,
          rank: original?.rank || '',
          suit: original?.suit || '',
          color: original?.color || '',
          symbol: original?.symbol || '',
          image: original?.image || '',
          comment: original?.text || '',
          markers: original?.markers || [],
        };
      })
      .filter((card) => card.label);
    if (!cards.length) {
      setError(t('random.result.deckEmpty'));
      return;
    }
    const saved = actions.saveSource({
      id: draft.id,
      name: draft.name,
      note: draft.note,
      kind: randomSourceKinds.CARDS,
      cards,
    });
    setSelectedId(saved.id);
    setError('');
  };

  const save = () => {
    if (draft.kind === randomSourceKinds.UNIFORM) {
      saveUniform();
      return;
    }
    if (draft.kind === randomSourceKinds.WEIGHTED) {
      saveWeighted();
      return;
    }
    saveCards();
  };

  const importFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const csv = await file.text();
    setDraft((current) => ({
      ...current,
      kind: randomSourceKinds.WEIGHTED,
      weightedMode: 'csv',
      name: current.name === 'Nouvelle source' ? file.name.replace(/\.csv$/i, '') : current.name,
      csv,
    }));
    setError('');
  };

  const remove = () => {
    if (!selected || used) return;
    actions.deleteSource(selected.id);
    setSelectedId('');
    setDraft(sourceDraft(null));
  };

  const updateOutcome = (outcomeIndex, patch) => {
    setDraft((current) => ({
      ...current,
      outcomes: current.outcomes.map((item, index) => (
        index === outcomeIndex ? { ...item, ...patch, index } : { ...item, index }
      )),
    }));
  };

  const syncWeightedEntries = (value) => {
    setDraft((current) => {
      const nextEntries = listedEntries(value);
      return {
        ...current,
        weightedEntries: value,
        outcomes: nextEntries.map((entry, index) => ({
          ...weightedRow(current.outcomes[index], index),
          label: entry.label,
        })),
      };
    });
  };

  const updateActiveCard = (field, value) => {
    if (!activeCard) return;
    setDraft((current) => {
      const cardDetails = [...current.cardDetails];
      cardDetails[activeCard.lineIndex] = {
        ...(cardDetails[activeCard.lineIndex] || {}),
        [field]: value,
      };
      return { ...current, cardDetails };
    });
  };

  return (
    <div className="rs-config-workspace">
      <aside className="rs-config-list">
        <div className="rs-section-head">
          <div>
            <span className="rs-section-kicker">{t('random.source.listKicker')}</span>
            <div className="rs-heading-with-mark">
              <span className="rs-heading-mark" aria-hidden="true"><RandomIcon name="source" /></span>
              <h3>{t('random.config.sources')}</h3>
            </div>
            <p className="muted compact-help">{t('random.source.listHelp')}</p>
          </div>
        </div>
        <div className="rs-new-source-actions">
          <button type="button" className="small-btn" onClick={() => createSource(randomSourceKinds.UNIFORM)}><span aria-hidden="true"><RandomIcon name="roll" /></span><span>{t('random.source.newUniform')}</span></button>
          <button type="button" className="small-btn" onClick={() => createSource(randomSourceKinds.WEIGHTED, 'guided')}><span aria-hidden="true"><RandomIcon name="table" /></span><span>{t('random.source.newWeighted')}</span></button>
          <button type="button" className="small-btn" onClick={() => createSource(randomSourceKinds.CARDS)}><span aria-hidden="true"><RandomIcon name="cards" /></span><span>{t('random.source.newCards')}</span></button>
          <button type="button" className="small-btn" onClick={() => createSource(randomSourceKinds.WEIGHTED, 'csv')}><span aria-hidden="true"><RandomIcon name="table" /></span><span>{t('random.source.importCsv')}</span></button>
        </div>
        {sources.map((source) => (
          <button type="button" className={`rs-config-list-item ${source.id === selectedId ? 'selected' : ''}`} onClick={() => setSelectedId(source.id)} key={source.id}>
            <span className="rs-resource-title">
              <span aria-hidden="true"><RandomSourceIcon kind={source.kind} /></span>
              <span>{source.name}</span>
            </span>
            <small>
              {sourceKindLabel(source)}
              {source.kind === randomSourceKinds.CARDS ? ` · ${source.cards.length}` : ''}
            </small>
          </button>
        ))}
      </aside>
      <section className="rs-config-editor">
        <div className="rs-section-head">
          <div>
            <span className="rs-section-kicker">{draft.kind === randomSourceKinds.CARDS ? t('random.source.cards') : t('random.source.random')}</span>
            <div className="rs-heading-with-mark">
              <span className="rs-heading-mark" aria-hidden="true"><RandomSourceIcon kind={draft.kind} /></span>
              <h2>{selected ? t('random.source.edit') : t('random.source.new')}</h2>
            </div>
          </div>
          {selected && (
            <button type="button" className="danger-btn" onClick={remove} disabled={used} title={used ? t('random.source.used') : ''}>
              {t('common.delete')}
            </button>
          )}
        </div>
        <label className="field">
          {t('common.name')}
          <input type="text" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
        </label>
        <label className="field">
          {t('random.source.note')}
          <input type="text" value={draft.note} onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))} />
        </label>
        <label className="field">
          {t('random.source.type')}
          <select value={draft.kind} onChange={(event) => setDraft((current) => ({
            ...current,
            kind: event.target.value,
            weightedMode: event.target.value === randomSourceKinds.WEIGHTED
              ? current.weightedMode || 'guided'
              : current.weightedMode,
          }))}>
            <option value={randomSourceKinds.UNIFORM}>{t('random.source.uniform')}</option>
            <option value={randomSourceKinds.WEIGHTED}>{t('random.source.weighted')}</option>
            <option value={randomSourceKinds.CARDS}>{t('random.source.cards')}</option>
          </select>
        </label>

        {draft.kind === randomSourceKinds.UNIFORM && (
          <div className="rs-uniform-editor">
            <div className="rs-editor-grid">
              <label className="field">{t('random.source.minimum')}<input type="number" value={draft.min} onChange={(event) => setDraft((current) => ({ ...current, min: event.target.value }))} /></label>
              <label className="field">{t('random.source.maximum')}<input type="number" value={draft.max} onChange={(event) => setDraft((current) => ({ ...current, max: event.target.value }))} /></label>
              <label className="field">{t('random.source.step')}<input type="number" min="0.000001" step="any" value={draft.step} onChange={(event) => setDraft((current) => ({ ...current, step: event.target.value }))} /></label>
            </div>
            <label className={`global-switch rs-source-option-toggle ${draft.describeFaces ? 'active' : ''}`}>
              <span>{t('random.source.describeFaces')}</span>
              <input
                type="checkbox"
                checked={draft.describeFaces}
                disabled={faceValues === null}
                onChange={(event) => setDraft((current) => ({ ...current, describeFaces: event.target.checked }))}
              />
            </label>
            {faceValues === null && <p className="muted compact-help">{t('random.source.tooManyFaces')}</p>}
            {draft.describeFaces && faceOptions.length > 0 && (
              <OutcomeDetailEditor
                title={t('random.source.faceDetails')}
                help={t('random.source.faceDetailsHelp')}
                selectorLabel={t('random.source.selectedFace')}
                selectorValue={activeFaceValue}
                selectorOptions={faceOptions}
                onSelect={setSelectedFaceValue}
                nameLabel={t('random.source.faceLabel')}
                nameValue={draft.faceLabels[activeFaceValue] || ''}
                onNameChange={(value) => setDraft((current) => ({
                  ...current,
                  faceLabels: { ...current.faceLabels, [activeFaceValue]: value },
                }))}
                namePlaceholder={activeFaceValue}
                symbolValue={draft.faceSymbols[activeFaceValue] || ''}
                onSymbolChange={(value) => setDraft((current) => ({
                  ...current,
                  faceSymbols: { ...current.faceSymbols, [activeFaceValue]: value },
                }))}
                imageValue={draft.faceImages[activeFaceValue] || ''}
                onImageChange={(value) => setDraft((current) => ({
                  ...current,
                  faceImages: { ...current.faceImages, [activeFaceValue]: value },
                }))}
                textValue={draft.faceTexts[activeFaceValue] || ''}
                onTextChange={(value) => setDraft((current) => ({
                  ...current,
                  faceTexts: { ...current.faceTexts, [activeFaceValue]: value },
                }))}
              />
            )}
          </div>
        )}

        {draft.kind === randomSourceKinds.WEIGHTED && (
          <div className="rs-weighted-editor">
            <div className="rs-segmented rs-weighted-mode">
              <button type="button" className={draft.weightedMode === 'guided' ? 'selected' : ''} onClick={() => setDraft((current) => ({ ...current, weightedMode: 'guided' }))}>{t('random.source.guided')}</button>
              <button type="button" className={draft.weightedMode === 'csv' ? 'selected' : ''} onClick={() => setDraft((current) => ({ ...current, weightedMode: 'csv' }))}>{t('random.source.csv')}</button>
            </div>
            {draft.weightedMode === 'guided' ? (
              <div className="rs-weighted-layout">
                <section className="rs-weighted-outcomes-panel">
                  <div className="rs-subhead">
                    <div>
                      <h3>{t('random.source.weightedOutcomes')}</h3>
                      <span>{t('random.source.weightedHelp', { total: totalWeight })}</span>
                    </div>
                  </div>
                  <label className="field">
                    {t('random.source.weightedList')}
                    <textarea
                      rows="12"
                      value={draft.weightedEntries}
                      onChange={(event) => syncWeightedEntries(event.target.value)}
                    />
                  </label>
                  <div className="rs-weighted-outcomes-list">
                    {weightedEntries.map((entry, index) => (
                      <div className={`rs-weighted-outcome-row ${String(entry.lineIndex) === activeOutcomeLine ? 'selected' : ''}`} key={`${entry.lineIndex}-${entry.label}`}>
                        <button
                          type="button"
                          className="rs-weighted-outcome-select"
                          onClick={() => setSelectedOutcomeLine(String(entry.lineIndex))}
                        >
                          <span>{entry.label || t('random.source.outcomeNumber', { index: index + 1 })}</span>
                          <small>{t('random.source.weight')} {draft.outcomes[index]?.weight ?? 1}/{totalWeight || 0}</small>
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
                {activeOutcome && (
                  <div className="rs-weighted-detail-stack">
                    <OutcomeDetailEditor
                      title={t('random.source.outcomeDetails')}
                      help={t('random.source.outcomeDetailsHelp')}
                      selectorLabel={t('random.source.selectedOutcome')}
                      selectorValue={activeOutcomeLine}
                      selectorOptions={outcomeOptions}
                      onSelect={setSelectedOutcomeLine}
                      nameLabel={t('random.source.outcomeLabel')}
                      nameValue={activeOutcome.label}
                      onNameChange={(value) => {
                        const outcomeLineIndex = Number(activeOutcomeLine);
                        updateOutcome(activeOutcomeIndex, { label: value });
                        setDraft((current) => {
                          const lines = String(current.weightedEntries || '').split(/\r?\n/);
                          lines[outcomeLineIndex] = value;
                          return { ...current, weightedEntries: lines.join('\n') };
                        });
                      }}
                      valueLabel={t('random.source.outcomeValue')}
                      valueValue={activeOutcome.value}
                      onValueChange={(value) => updateOutcome(activeOutcomeIndex, { value })}
                      valuePlaceholder={activeOutcome.label}
                      weightLabel={t('random.source.weight')}
                      weightValue={activeOutcome.weight}
                      onWeightChange={(value) => updateOutcome(activeOutcomeIndex, { weight: value })}
                      symbolValue={activeOutcome.symbol}
                      onSymbolChange={(value) => updateOutcome(activeOutcomeIndex, { symbol: value })}
                      imageValue={activeOutcome.image}
                      onImageChange={(value) => updateOutcome(activeOutcomeIndex, { image: value })}
                      textValue={activeOutcome.text}
                      onTextChange={(value) => updateOutcome(activeOutcomeIndex, { text: value })}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="rs-csv-editor">
                <div className="rs-subhead">
                  <div>
                    <h3>{t('random.source.csv')}</h3>
                    <span>{t('random.source.csvHelp')}</span>
                  </div>
                  <button type="button" className="small-btn" onClick={() => fileInputRef.current?.click()}>{t('random.source.chooseFile')}</button>
                  <input ref={fileInputRef} className="import-file-input" type="file" accept=".csv,text/csv,text/plain" onChange={importFile} />
                </div>
                <textarea rows="14" value={draft.csv} onChange={(event) => setDraft((current) => ({ ...current, csv: event.target.value }))} spellCheck="false" />
              </div>
            )}
          </div>
        )}

        {draft.kind === randomSourceKinds.CARDS && (
          <div className="rs-card-source-editor">
            <label className="field">
              {t('random.deck.cardList')}
              <textarea rows="18" value={draft.cards} onChange={(event) => setDraft((current) => ({ ...current, cards: event.target.value }))} />
            </label>
            {activeCard && (
              <OutcomeDetailEditor
                title={t('random.deck.cardDetails')}
                help={t('random.deck.cardDetailsHelp')}
                selectorLabel={t('random.deck.selectedCard')}
                selectorValue={activeCardLine}
                selectorOptions={cardOptions}
                onSelect={setSelectedCardLine}
                nameLabel={t('random.deck.cardValue')}
                nameValue={activeCardDetails.value ?? activeCard.label}
                onNameChange={(value) => updateActiveCard('value', value)}
                namePlaceholder={activeCard.label}
                symbolValue={activeCardDetails.symbol || ''}
                onSymbolChange={(value) => updateActiveCard('symbol', value)}
                imageValue={activeCardDetails.image || ''}
                onImageChange={(value) => updateActiveCard('image', value)}
                textValue={activeCardDetails.text || ''}
                onTextChange={(value) => updateActiveCard('text', value)}
              />
            )}
          </div>
        )}

        {used && <p className="muted compact-help">{t('random.source.used')}</p>}
        {error && <p className="rs-error" role="alert">{error}</p>}
        <button type="button" className="primary rs-save-resource" onClick={save}>{t('common.save')}</button>
      </section>
    </div>
  );
}
