import { useMemo, useState } from 'react';
import { initiativeTextOrderFromCardSource, initiativeTextOrderPresetIds, initiativeTextOrderPresets, normalizeInitiativeTextOrder, presetInitiativeTextOrder, sameInitiativeTextOrder } from '../../domain/initiativeTextOrder.js';
import { t } from '../../i18n/index.js';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';

const nettoyer = (value) => String(value ?? '').trim();
const separateur = (value) => String(value ?? '');
const valeursPropres = (values) => [...new Set((Array.isArray(values) ? values : []).map(nettoyer).filter(Boolean))];

function alignerSeparateurs(parts, separators = [], fallback = '') {
  return Array.from({ length: Math.max(0, parts.length - 1) }, (_, index) => (
    separators[index] == null ? fallback : separateur(separators[index])
  ));
}

function ensureParts(config) {
  const normalized = normalizeInitiativeTextOrder(config);
  const sourceParts = Array.isArray(config?.parts) && config.parts.length ? config.parts : normalized.parts;
  const parts = sourceParts.length
    ? sourceParts.map((part, index) => ({
      label: nettoyer(part?.label) || t('initiativeText.partFallback', { index: index + 1 }),
      values: valeursPropres(part?.values),
    }))
    : [{ label: t('initiativeText.partFallback', { index: 1 }), values: [] }];
  return { ...normalized, parts, separators: alignerSeparateurs(parts, config?.separators || normalized.separators, config?.separator ?? normalized.separator ?? '') };
}

function ListeLibelles({ part, partIndex, totalParts, separatorAfter, onModifierPart, onModifierSeparateur, onAjouterValeur, onModifierValeur, onSupprimerValeur, onDeplacerValeur, onAjouterPartie, onSupprimerPartie, onDeplacerPartie }) {
  const [nouveau, setNouveau] = useState('');
  const ajouter = () => {
    const valeur = nouveau.trim();
    if (!valeur) return;
    onAjouterValeur(partIndex, valeur);
    setNouveau('');
  };

  return (
    <div className="scene-options compact-options advanced-rule-block">
      <div className="line-count-row initiative-part-head">
        <label>{t('initiativeText.partLabel', { index: partIndex + 1 })}</label>
        <button className="small-btn" type="button" onClick={() => onDeplacerPartie(partIndex, -1)} disabled={partIndex <= 0}>^</button>
        <button className="small-btn" type="button" onClick={() => onDeplacerPartie(partIndex, 1)} disabled={partIndex >= totalParts - 1}>v</button>
        <button className="small-btn subtle-danger" type="button" onClick={() => onSupprimerPartie(partIndex)} disabled={totalParts <= 1}>x</button>
      </div>
      <label className="field">{t('initiativeText.partName')}<input type="text" value={part.label} onChange={(event) => onModifierPart(partIndex, { label: event.target.value })} /></label>
      {partIndex < totalParts - 1 && <label className="field">{t('initiativeText.separator')}<input type="text" value={separatorAfter ?? ''} onChange={(event) => onModifierSeparateur(partIndex, event.target.value)} placeholder={t('initiativeText.separatorPlaceholder')} /></label>}
      <div className="stack compact-category-order">
        {(part.values || []).map((valeur, index) => (
          <div className="restore-row discreet" key={`${valeur}-${index}`}>
            <input type="text" value={valeur} onChange={(event) => onModifierValeur(partIndex, index, event.target.value)} />
            <div className="compact-arrows">
              <button className="small-btn" type="button" onClick={() => onDeplacerValeur(partIndex, index, -1)} disabled={index <= 0}>^</button>
              <button className="small-btn" type="button" onClick={() => onDeplacerValeur(partIndex, index, 1)} disabled={index >= part.values.length - 1}>v</button>
              <button className="small-btn subtle-danger" type="button" onClick={() => onSupprimerValeur(partIndex, index)}>x</button>
            </div>
          </div>
        ))}
      </div>
      <div className="row compact-toolbar-actions">
        <input type="text" placeholder={t('initiativeText.newLabel')} value={nouveau} onChange={(event) => setNouveau(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); ajouter(); } }} />
        <button className="small-btn" type="button" onClick={ajouter}>{t('common.add')}</button>
      </div>
      <button className="small-btn" type="button" onClick={() => onAjouterPartie(partIndex + 1)}>{t('initiativeText.addPartAfter')}</button>
      <p className="muted compact-help">{t('initiativeText.orderHelp')}</p>
    </div>
  );
}

function ConfirmationSortie({ onAnnuler, onConfirmer }) {
  return (
    <Fenetre title={t('initiativeText.leaveTitle')} onClose={onAnnuler}>
      <div className="stack">
        <p className="muted compact-help" style={{ margin: 0 }}>{t('initiativeText.leaveHelp')}</p>
        <div className="grid2">
          <button className="small-btn" type="button" onClick={onAnnuler}>{t('initiativeText.continueEditing')}</button>
          <button className="danger-btn" type="button" onClick={onConfirmer}>{t('initiativeText.leaveWithoutSaving')}</button>
        </div>
      </div>
    </Fenetre>
  );
}

export function FenetreInitiativeTextuelleEdition({ config, cardSources = [], initiativeTextPresets = [], onFermer, onValider, onEnregistrerPreset }) {
  const initial = useMemo(() => {
    const normalized = ensureParts(config);
    if (normalized.preset !== initiativeTextOrderPresetIds.CARDS) return normalized;
    const source = cardSources.find((item) => item.id === normalized.cardSourceId);
    return source ? ensureParts(initiativeTextOrderFromCardSource(source, { enabled: normalized.enabled })) : normalized;
  }, [cardSources, config]);
  const initialCustomPresetId = useMemo(() => (
    initiativeTextPresets.find((preset) => sameInitiativeTextOrder(preset.config, initial))?.id || ''
  ), [initial, initiativeTextPresets]);
  const [draft, setDraft] = useState(initial);
  const [selectedCustomPresetId, setSelectedCustomPresetId] = useState(initialCustomPresetId);
  const [confirmationSortie, setConfirmationSortie] = useState(false);
  const [sauvegardePresetOuverte, setSauvegardePresetOuverte] = useState(false);
  const [nomPreset, setNomPreset] = useState('');
  const [messagePreset, setMessagePreset] = useState('');
  const normalizedDraft = ensureParts(draft);
  const parts = normalizedDraft.parts;
  const dirty = JSON.stringify(ensureParts(initial)) !== JSON.stringify(normalizedDraft);
  const isCardPreset = normalizedDraft.preset === initiativeTextOrderPresetIds.CARDS;
  const cardPresetAvailable = cardSources.length > 0;
  const presetOptionIds = [initiativeTextOrderPresetIds.POSTURES, initiativeTextOrderPresetIds.CARDS];
  const defaultCardSource = () => cardSources.find((source) => source.id === normalizedDraft.cardSourceId)
    || cardSources.find((source) => source.id === 'standard-54-cards')
    || cardSources[0];
  const cardSummary = parts
    .map((part) => `${part.label}: ${part.values.slice(0, 8).join(', ')}${part.values.length > 8 ? ` +${part.values.length - 8}` : ''}`)
    .join(' · ');
  const linkedCardSource = cardSources.some((source) => source.id === normalizedDraft.cardSourceId);
  const canValidate = !isCardPreset || linkedCardSource;

  const demanderFermeture = () => {
    if (dirty) setConfirmationSortie(true);
    else onFermer();
  };
  const valider = () => {
    if (!canValidate) return;
    onValider({ initiativeTextOrder: normalizeInitiativeTextOrder(normalizedDraft) });
  };
  const appliquerPreset = (value) => {
    if (value.startsWith('custom:')) {
      const customPresetId = value.slice('custom:'.length);
      const customPreset = initiativeTextPresets.find((preset) => preset.id === customPresetId);
      if (!customPreset) return;
      setSelectedCustomPresetId(customPreset.id);
      setDraft((current) => ({ ...ensureParts(customPreset.config), enabled: current.enabled, preset: '', cardSourceId: '' }));
      return;
    }
    setSelectedCustomPresetId('');
    setDraft((current) => {
      if (!value) return { ...current, preset: '' };
      if (value === initiativeTextOrderPresetIds.CARDS) {
        const source = cardSources.find((item) => item.id === current.cardSourceId) || defaultCardSource();
        return source ? ensureParts(initiativeTextOrderFromCardSource(source, { enabled: current.enabled })) : current;
      }
      return { ...ensureParts(presetInitiativeTextOrder(value)), enabled: current.enabled, cardSourceId: '' };
    });
  };
  const changerPaquet = (cardSourceId) => setDraft((current) => {
    const source = cardSources.find((item) => item.id === cardSourceId);
    if (!source) return current;
    return ensureParts(initiativeTextOrderFromCardSource(source, { enabled: current.enabled }));
  });
  const modifierPart = (partIndex, patch) => {
    setSelectedCustomPresetId('');
    setDraft((current) => {
      const ensured = ensureParts(current);
      return {
        ...ensured,
        preset: '',
        parts: ensured.parts.map((part, index) => index === partIndex ? { ...part, ...patch } : part),
      };
    });
  };
  const modifierSeparateur = (indexSeparateur, valeur) => {
    setSelectedCustomPresetId('');
    setDraft((current) => {
      const ensured = ensureParts(current);
      return { ...ensured, preset: '', separators: ensured.separators.map((item, index) => index === indexSeparateur ? valeur : item) };
    });
  };
  const ajouterPartie = (position) => {
    setSelectedCustomPresetId('');
    setDraft((current) => {
      const ensured = ensureParts(current);
      const partsNext = [...ensured.parts];
      partsNext.splice(position, 0, { label: t('initiativeText.partFallback', { index: partsNext.length + 1 }), values: [] });
      const separatorsNext = [...ensured.separators];
      separatorsNext.splice(Math.max(0, position - 1), 0, ensured.separators[Math.max(0, position - 1)] ?? '');
      return { ...ensured, preset: '', parts: partsNext, separators: alignerSeparateurs(partsNext, separatorsNext, '') };
    });
  };
  const supprimerPartie = (partIndex) => {
    setSelectedCustomPresetId('');
    setDraft((current) => {
      const ensured = ensureParts(current);
      if (ensured.parts.length <= 1) return current;
      const partsNext = ensured.parts.filter((_, index) => index !== partIndex);
      const separatorsNext = ensured.separators.filter((_, index) => index !== Math.max(0, partIndex - 1));
      return { ...ensured, preset: '', parts: partsNext, separators: alignerSeparateurs(partsNext, separatorsNext, '') };
    });
  };
  const deplacerPartie = (partIndex, delta) => {
    setSelectedCustomPresetId('');
    setDraft((current) => {
      const ensured = ensureParts(current);
      const partsNext = [...ensured.parts];
      const target = partIndex + delta;
      if (target < 0 || target >= partsNext.length) return current;
      [partsNext[partIndex], partsNext[target]] = [partsNext[target], partsNext[partIndex]];
      return { ...ensured, preset: '', parts: partsNext, separators: alignerSeparateurs(partsNext, ensured.separators, '') };
    });
  };
  const ajouterValeur = (partIndex, valeur) => modifierPart(partIndex, {
    values: [...(ensureParts(draft).parts[partIndex]?.values || []), valeur],
  });
  const modifierValeur = (partIndex, valueIndex, valeur) => modifierPart(partIndex, {
    values: (ensureParts(draft).parts[partIndex]?.values || []).map((item, index) => index === valueIndex ? valeur : item),
  });
  const supprimerValeur = (partIndex, valueIndex) => modifierPart(partIndex, {
    values: (ensureParts(draft).parts[partIndex]?.values || []).filter((_, index) => index !== valueIndex),
  });
  const deplacerValeur = (partIndex, valueIndex, delta) => {
    const values = [...(ensureParts(draft).parts[partIndex]?.values || [])];
    const target = valueIndex + delta;
    if (target < 0 || target >= values.length) return;
    [values[valueIndex], values[target]] = [values[target], values[valueIndex]];
    modifierPart(partIndex, { values });
  };
  const enregistrerPreset = () => {
    const result = onEnregistrerPreset?.(normalizedDraft, nomPreset);
    if (result?.ok === false) {
      setMessagePreset(result.message || t('initiativeText.presetInvalid'));
      return;
    }
    if (!result?.preset) return;
    setSelectedCustomPresetId(result.preset.id);
    setNomPreset('');
    setMessagePreset(t('initiativeText.presetSaved', { name: result.preset.name }));
    setSauvegardePresetOuverte(false);
  };
  const presetValue = selectedCustomPresetId
    ? `custom:${selectedCustomPresetId}`
    : presetOptionIds.includes(draft.preset) ? draft.preset : '';
  const header = <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}><h2 style={{ margin: 0 }}>{t('initiativeText.title')}</h2><div className="row"><button className="small-btn" type="button" onClick={demanderFermeture}>{t('common.cancel')}</button><button className="icon-btn validate-edit-btn" type="button" onClick={valider} disabled={!canValidate} aria-label={t('initiativeText.saveLabels')}>v</button></div></div>;

  return (
    <>
      <Fenetre title={t('initiativeText.title')} onClose={demanderFermeture} header={header}>
        <div className="stack">
          <label className="field">{t('initiativeText.preset')}<select value={presetValue} onChange={(event) => appliquerPreset(event.target.value)}><option value="">{t('initiativeText.custom')}</option>{initiativeTextPresets.map((preset) => <option key={preset.id} value={`custom:${preset.id}`}>{preset.name}</option>)}{presetOptionIds.map((id) => <option key={id} value={id} disabled={id === initiativeTextOrderPresetIds.CARDS && !cardPresetAvailable}>{initiativeTextOrderPresets[id].label}</option>)}</select></label>
          {isCardPreset && <>
            <label className="field">{t('initiativeText.cardSource')}<select value={normalizedDraft.cardSourceId || ''} onChange={(event) => changerPaquet(event.target.value)} disabled={!cardPresetAvailable}><option value="" disabled>{t('initiativeText.noCardSource')}</option>{cardSources.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}</select></label>
            <p className="muted compact-help">{t('initiativeText.cardSourceHelp')}</p>
            {!cardPresetAvailable && <p className="rule-warning">{t('initiativeText.cardSourceRequired')}</p>}
            {cardSummary && <p className="rule-option-note">{cardSummary}</p>}
          </>}
          {!isCardPreset && <>
            {parts.map((part, index) => <ListeLibelles key={`${part.label}-${index}`} part={part} partIndex={index} totalParts={parts.length} separatorAfter={normalizedDraft.separators[index]} onModifierPart={modifierPart} onModifierSeparateur={modifierSeparateur} onAjouterValeur={ajouterValeur} onModifierValeur={modifierValeur} onSupprimerValeur={supprimerValeur} onDeplacerValeur={deplacerValeur} onAjouterPartie={ajouterPartie} onSupprimerPartie={supprimerPartie} onDeplacerPartie={deplacerPartie} />)}
            <button className="small-btn" type="button" onClick={() => ajouterPartie(parts.length)}>{t('initiativeText.addPart')}</button>
            {onEnregistrerPreset && <details className="advanced-options initiative-preset-save" open={sauvegardePresetOuverte} onToggle={(event) => setSauvegardePresetOuverte(event.currentTarget.open)}>
              <summary>{t('initiativeText.savePreset')}</summary>
              <label className="field">{t('initiativeText.presetName')}<input type="text" value={nomPreset} onChange={(event) => { setNomPreset(event.target.value); setMessagePreset(''); }} /></label>
              <button className="small-btn" type="button" onClick={enregistrerPreset} disabled={!nomPreset.trim()}>{t('initiativeText.savePresetAction')}</button>
            </details>}
            {messagePreset && <p className="rule-option-note">{messagePreset}</p>}
          </>}
        </div>
      </Fenetre>
      {confirmationSortie && <ConfirmationSortie onAnnuler={() => setConfirmationSortie(false)} onConfirmer={onFermer} />}
    </>
  );
}
