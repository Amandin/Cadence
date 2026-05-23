import { useMemo, useState } from 'react';
import { initiativeTextOrderPresetIds, initiativeTextOrderPresets, normalizeInitiativeTextOrder, presetInitiativeTextOrder } from '../../domain/initiativeTextOrder.js';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';

function ensureParts(config) {
  const normalized = normalizeInitiativeTextOrder(config);
  const parts = normalized.parts.length ? normalized.parts : [{ label: 'Partie 1', values: [] }, { label: 'Partie 2', values: [] }];
  return { ...normalized, parts: parts.slice(0, 2) };
}

function ListeLibelles({ part, partIndex, onModifierPart, onAjouterValeur, onModifierValeur, onSupprimerValeur, onDeplacerValeur }) {
  const [nouveau, setNouveau] = useState('');
  const ajouter = () => {
    const valeur = nouveau.trim();
    if (!valeur) return;
    onAjouterValeur(partIndex, valeur);
    setNouveau('');
  };

  return (
    <div className="scene-options compact-options advanced-rule-block">
      <label className="field">Nom de la partie<input type="text" value={part.label} onChange={(event) => onModifierPart(partIndex, { label: event.target.value })} /></label>
      <div className="stack compact-category-order">
        {(part.values || []).map((valeur, index) => (
          <div className="restore-row discreet" key={`${valeur}-${index}`}>
            <input type="text" value={valeur} onChange={(event) => onModifierValeur(partIndex, index, event.target.value)} />
            <div className="compact-arrows">
              <button className="small-btn" type="button" onClick={() => onDeplacerValeur(partIndex, index, -1)} disabled={index <= 0}>↑</button>
              <button className="small-btn" type="button" onClick={() => onDeplacerValeur(partIndex, index, 1)} disabled={index >= part.values.length - 1}>↓</button>
              <button className="small-btn subtle-danger" type="button" onClick={() => onSupprimerValeur(partIndex, index)}>×</button>
            </div>
          </div>
        ))}
      </div>
      <div className="row compact-toolbar-actions">
        <input type="text" placeholder="Nouveau libellé" value={nouveau} onChange={(event) => setNouveau(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); ajouter(); } }} />
        <button className="small-btn" type="button" onClick={ajouter}>Ajouter</button>
      </div>
      <p className="muted compact-help">L’ordre affiché est l’ordre de priorité : le premier libellé passe avant le suivant.</p>
    </div>
  );
}

export function FenetreInitiativeTextuelleEdition({ config, onFermer, onValider }) {
  const initial = useMemo(() => ensureParts(config), [config]);
  const [draft, setDraft] = useState(initial);

  const appliquerPreset = (id) => setDraft(ensureParts(presetInitiativeTextOrder(id)));
  const modifierPart = (partIndex, patch) => setDraft((current) => ({
    ...current,
    preset: '',
    parts: ensureParts(current).parts.map((part, index) => index === partIndex ? { ...part, ...patch } : part),
  }));
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
  const parts = ensureParts(draft).parts;

  return (
    <Fenetre title="Initiative par liste" onClose={onFermer}>
      <div className="stack">
        <label className="advanced-radio selected"><input type="checkbox" checked={draft.enabled} onChange={(event) => setDraft((current) => ({ ...current, enabled: event.target.checked }))} /><span><strong>Activer l’initiative par menus</strong><small>Remplace les champs numériques par des sélecteurs.</small></span></label>
        <label className="field">Preset<select value={draft.preset || ''} onChange={(event) => appliquerPreset(event.target.value)}><option value="">Personnalisé</option>{Object.values(initiativeTextOrderPresetIds).map((id) => <option key={id} value={id}>{initiativeTextOrderPresets[id].label}</option>)}</select></label>
        <label className="field">Séparateur stocké<input type="text" value={draft.separator} onChange={(event) => setDraft((current) => ({ ...current, preset: '', separator: event.target.value }))} /></label>
        {parts.map((part, index) => <ListeLibelles key={index} part={part} partIndex={index} onModifierPart={modifierPart} onAjouterValeur={ajouterValeur} onModifierValeur={modifierValeur} onSupprimerValeur={supprimerValeur} onDeplacerValeur={deplacerValeur} />)}
        <div className="grid2"><button className="primary" onClick={() => onValider({ initiativeTextOrder: normalizeInitiativeTextOrder(draft) })}>Enregistrer</button><button className="small-btn" onClick={onFermer}>Annuler</button></div>
      </div>
    </Fenetre>
  );
}
