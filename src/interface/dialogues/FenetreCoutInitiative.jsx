import { useState } from 'react';
import { normalizeInitiativeCostQuickCosts, normalizeInitiativeCostThreshold } from '../../domain/initiativeCost.js';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';

export function FenetreCoutInitiative({ participant, quickCosts, threshold, onFermer, onValider, onTerminer }) {
  const [customCost, setCustomCost] = useState('');
  const costs = normalizeInitiativeCostQuickCosts(quickCosts);
  const seuil = normalizeInitiativeCostThreshold(threshold);
  const valeur = Math.floor(Number(customCost));
  const customValide = Number.isFinite(valeur) && valeur >= 1;
  const initiative = Number(participant?.initiative);
  const apercu = customValide && Number.isFinite(initiative) ? initiative - valeur : null;

  return (
    <Fenetre title="Cout d'initiative" onClose={onFermer}>
      <div className="stack initiative-cost-dialog">
        <p className="muted compact-help">Choisis le cout paye apres l'action de {participant?.name || 'ce personnage'}. Si l'initiative apres cout est inferieure ou egale a {seuil}, aucun nouveau creneau n'est cree ce round.</p>
        <div className="choice-row initiative-cost-quick-row">
          {costs.map((cost) => <button className="choice" type="button" key={cost} onClick={() => onValider(cost)}>{cost}</button>)}
        </div>
        <label className="field">Cout personnalise<input type="number" inputMode="numeric" min="1" step="1" value={customCost} onChange={(event) => setCustomCost(event.target.value)} autoFocus /></label>
        {apercu != null && <p className="rule-option-note">Nouveau creneau possible : {participant.initiative} - {valeur} = {apercu}.</p>}
        <div className="grid2"><button className="primary" type="button" onClick={() => customValide && onValider(valeur)} disabled={!customValide}>Appliquer le cout</button><button className="small-btn" type="button" onClick={onTerminer}>Terminer son round</button></div>
        <button className="small-btn" type="button" onClick={onFermer}>Annuler</button>
      </div>
    </Fenetre>
  );
}
