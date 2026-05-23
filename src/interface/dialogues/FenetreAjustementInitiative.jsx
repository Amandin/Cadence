import { useState } from 'react';
import { composeInitiativeLabel, initiativeTextOrderEnabled, normalizeInitiativeTextOrder, splitInitiativeLabel } from '../../domain/initiativeTextOrder.js';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';

function ChampInitiativeAjustee({ valeur, onChange, textConfig }) {
  if (!initiativeTextOrderEnabled(textConfig)) return <input type="number" inputMode="numeric" value={valeur ?? ''} onChange={(event) => onChange(event.target.value)} />;
  const config = normalizeInitiativeTextOrder(textConfig);
  const selection = splitInitiativeLabel(valeur, config);
  const changerPartie = (index, next) => {
    const parts = config.parts.map((_, position) => position === index ? next : (selection[position] || ''));
    onChange(composeInitiativeLabel(parts, config));
  };
  return <div className="initiative-select-parts">{config.parts.map((part, index) => <label className="initiative-select-part" key={`${part.label}-${index}`}><small>{part.label}</small><select value={selection[index] || ''} onChange={(event) => changerPartie(index, event.target.value)}><option value="">—</option>{part.values.map((option) => <option value={option} key={option}>{option}</option>)}</select></label>)}</div>;
}

export function FenetreAjustementInitiative({ participant, valeurInitiale, initiativeTextOrder, onFermer, onValider, onPasser }) {
  const [valeur, setValeur] = useState(valeurInitiale ?? participant?.initiative ?? '');
  const [cout, setCout] = useState('');
  const textConfig = normalizeInitiativeTextOrder(initiativeTextOrder);
  const numerique = !initiativeTextOrderEnabled(textConfig) && Number.isFinite(Number(valeur));
  const appliquerCout = () => {
    const delta = Number(cout);
    if (!Number.isFinite(delta) || !numerique) return;
    setValeur(String(Number(valeur) - delta));
    setCout('');
  };
  const valider = () => onValider(String(valeur ?? '').trim());

  return <Fenetre title="Ajuster l’initiative" onClose={onFermer}>
    <div className="stack">
      <p className="muted compact-help">Modifie seulement l’initiative de {participant?.name || 'ce participant'} avant d’avancer. Les ticks du bouton Suivant se produisent normalement ; l’activation du même personnage reste bornée par la règle du round.</p>
      <label className="field">Nouvelle initiative<ChampInitiativeAjustee valeur={valeur} onChange={setValeur} textConfig={textConfig} /></label>
      {!initiativeTextOrderEnabled(textConfig) && <div className="row compact-toolbar-actions"><input type="number" inputMode="numeric" placeholder="Coût" value={cout} onChange={(event) => setCout(event.target.value)} /><button className="small-btn" type="button" onClick={appliquerCout} disabled={!numerique}>Appliquer coût</button></div>}
      <div className="grid2"><button className="primary" onClick={valider}>Valider puis suivant</button><button className="small-btn" onClick={onPasser}>Suivant sans modifier</button></div>
      <button className="small-btn" onClick={onFermer}>Annuler</button>
    </div>
  </Fenetre>;
}
