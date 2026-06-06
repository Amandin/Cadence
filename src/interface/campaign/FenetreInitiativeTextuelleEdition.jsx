import { useMemo, useState } from 'react';
import { initiativeTextOrderPresetIds, initiativeTextOrderPresets, normalizeInitiativeTextOrder, presetInitiativeTextOrder } from '../../domain/initiativeTextOrder.js';
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
      label: nettoyer(part?.label) || `Partie ${index + 1}`,
      values: valeursPropres(part?.values),
    }))
    : [{ label: 'Partie 1', values: [] }];
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
        <label>Partie {partIndex + 1}</label>
        <button className="small-btn" type="button" onClick={() => onDeplacerPartie(partIndex, -1)} disabled={partIndex <= 0}>^</button>
        <button className="small-btn" type="button" onClick={() => onDeplacerPartie(partIndex, 1)} disabled={partIndex >= totalParts - 1}>v</button>
        <button className="small-btn subtle-danger" type="button" onClick={() => onSupprimerPartie(partIndex)} disabled={totalParts <= 1}>x</button>
      </div>
      <label className="field">Nom de la partie<input type="text" value={part.label} onChange={(event) => onModifierPart(partIndex, { label: event.target.value })} /></label>
      {partIndex < totalParts - 1 && <label className="field">Séparateur vers la partie suivante<input type="text" value={separatorAfter ?? ''} onChange={(event) => onModifierSeparateur(partIndex, event.target.value)} placeholder="ex: de, /, -" /></label>}
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
        <input type="text" placeholder="Nouveau libellé" value={nouveau} onChange={(event) => setNouveau(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); ajouter(); } }} />
        <button className="small-btn" type="button" onClick={ajouter}>Ajouter</button>
      </div>
      <button className="small-btn" type="button" onClick={() => onAjouterPartie(partIndex + 1)}>+ partie après</button>
      <p className="muted compact-help">L’ordre affiché est l’ordre de priorité : le premier libellé passe avant le suivant.</p>
    </div>
  );
}

function ConfirmationSortie({ onAnnuler, onConfirmer }) {
  return (
    <Fenetre title="Quitter sans enregistrer ?" onClose={onAnnuler}>
      <div className="stack">
        <p className="muted compact-help" style={{ margin: 0 }}>Les modifications du préréglage ne seront pas conservées.</p>
        <div className="grid2">
          <button className="small-btn" type="button" onClick={onAnnuler}>Continuer l’édition</button>
          <button className="danger-btn" type="button" onClick={onConfirmer}>Quitter sans conserver</button>
        </div>
      </div>
    </Fenetre>
  );
}

export function FenetreInitiativeTextuelleEdition({ config, onFermer, onValider }) {
  const initial = useMemo(() => ensureParts(config), [config]);
  const [draft, setDraft] = useState(initial);
  const [confirmationSortie, setConfirmationSortie] = useState(false);
  const normalizedDraft = ensureParts(draft);
  const parts = normalizedDraft.parts;
  const dirty = JSON.stringify(ensureParts(initial)) !== JSON.stringify(normalizedDraft);

  const demanderFermeture = () => {
    if (dirty) setConfirmationSortie(true);
    else onFermer();
  };
  const valider = () => onValider({ initiativeTextOrder: normalizeInitiativeTextOrder(normalizedDraft) });
  const appliquerPreset = (id) => setDraft((current) => {
    if (!id) return { ...current, preset: '' };
    return { ...ensureParts(presetInitiativeTextOrder(id)), enabled: current.enabled };
  });
  const modifierPart = (partIndex, patch) => setDraft((current) => {
    const ensured = ensureParts(current);
    return {
      ...ensured,
      preset: '',
      parts: ensured.parts.map((part, index) => index === partIndex ? { ...part, ...patch } : part),
    };
  });
  const modifierSeparateur = (indexSeparateur, valeur) => setDraft((current) => {
    const ensured = ensureParts(current);
    return { ...ensured, preset: '', separators: ensured.separators.map((item, index) => index === indexSeparateur ? valeur : item) };
  });
  const ajouterPartie = (position) => setDraft((current) => {
    const ensured = ensureParts(current);
    const partsNext = [...ensured.parts];
    partsNext.splice(position, 0, { label: `Partie ${partsNext.length + 1}`, values: [] });
    const separatorsNext = [...ensured.separators];
    separatorsNext.splice(Math.max(0, position - 1), 0, ensured.separators[Math.max(0, position - 1)] ?? '');
    return { ...ensured, preset: '', parts: partsNext, separators: alignerSeparateurs(partsNext, separatorsNext, '') };
  });
  const supprimerPartie = (partIndex) => setDraft((current) => {
    const ensured = ensureParts(current);
    if (ensured.parts.length <= 1) return current;
    const partsNext = ensured.parts.filter((_, index) => index !== partIndex);
    const separatorsNext = ensured.separators.filter((_, index) => index !== Math.max(0, partIndex - 1));
    return { ...ensured, preset: '', parts: partsNext, separators: alignerSeparateurs(partsNext, separatorsNext, '') };
  });
  const deplacerPartie = (partIndex, delta) => setDraft((current) => {
    const ensured = ensureParts(current);
    const partsNext = [...ensured.parts];
    const target = partIndex + delta;
    if (target < 0 || target >= partsNext.length) return current;
    [partsNext[partIndex], partsNext[target]] = [partsNext[target], partsNext[partIndex]];
    return { ...ensured, preset: '', parts: partsNext, separators: alignerSeparateurs(partsNext, ensured.separators, '') };
  });
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
  const header = <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}><h2 style={{ margin: 0 }}>Modifier les libellés d’initiative</h2><div className="row"><button className="small-btn" type="button" onClick={demanderFermeture}>Annuler</button><button className="icon-btn validate-edit-btn" type="button" onClick={valider} aria-label="Enregistrer les libellés">✓</button></div></div>;

  return (
    <>
      <Fenetre title="Modifier les libellés d’initiative" onClose={demanderFermeture} header={header}>
        <div className="stack">
          <label className="field">Préréglage<select value={draft.preset || ''} onChange={(event) => appliquerPreset(event.target.value)}><option value="">Personnalisé</option>{Object.values(initiativeTextOrderPresetIds).map((id) => <option key={id} value={id}>{initiativeTextOrderPresets[id].label}</option>)}</select></label>
          {parts.map((part, index) => <ListeLibelles key={`${part.label}-${index}`} part={part} partIndex={index} totalParts={parts.length} separatorAfter={normalizedDraft.separators[index]} onModifierPart={modifierPart} onModifierSeparateur={modifierSeparateur} onAjouterValeur={ajouterValeur} onModifierValeur={modifierValeur} onSupprimerValeur={supprimerValeur} onDeplacerValeur={deplacerValeur} onAjouterPartie={ajouterPartie} onSupprimerPartie={supprimerPartie} onDeplacerPartie={deplacerPartie} />)}
          <button className="small-btn" type="button" onClick={() => ajouterPartie(parts.length)}>+ partie</button>
        </div>
      </Fenetre>
      {confirmationSortie && <ConfirmationSortie onAnnuler={() => setConfirmationSortie(false)} onConfirmer={onFermer} />}
    </>
  );
}
