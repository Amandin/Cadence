import { useState } from 'react';
import { initiativeCostMaxForSlot, normalizeInitiativeCostQuickCosts, normalizeInitiativeCostThreshold } from '../../domain/initiativeCost.js';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';

export function FenetreCoutInitiative({ participant, quickCosts, threshold, limitToCurrent = false, onFermer, onValider, onTerminer }) {
  const [customCost, setCustomCost] = useState('');
  const costs = normalizeInitiativeCostQuickCosts(quickCosts);
  const seuil = normalizeInitiativeCostThreshold(threshold);
  const valeur = Math.floor(Number(customCost));
  const customValide = Number.isFinite(valeur) && valeur >= 1;
  const initiative = Number(participant?.initiative);
  const coutMax = initiativeCostMaxForSlot({ initiativeCostLimitToCurrent: limitToCurrent, initiativeCostThreshold: seuil }, participant);
  const apercu = customValide && Number.isFinite(initiative) ? initiative - valeur : null;
  const coutAutorise = (cost) => coutMax == null || cost <= coutMax;
  const customAutorise = customValide && coutAutorise(valeur);

  return (
    <Fenetre title="Cout d'initiative" onClose={onFermer}>
      <div className="stack initiative-cost-dialog">
        <div className="initiative-cost-current">
          <span>Initiative actuelle</span>
          <strong>{Number.isFinite(initiative) ? participant.initiative : '-'}</strong>
        </div>
        <p className="muted compact-help">Choisis le cout paye apres l'action de {participant?.name || 'ce personnage'}. Si l'initiative apres cout est inferieure ou egale a {seuil}, aucun nouveau creneau n'est cree ce round.</p>
        {coutMax != null && <p className="rule-option-note">Regle active : cout maximum {coutMax} pour ce creneau.</p>}
        <div className="choice-row initiative-cost-quick-row">
          {costs.map((cost) => <button className="choice" type="button" key={cost} disabled={!coutAutorise(cost)} onClick={() => onValider(cost)}>{cost}</button>)}
        </div>
        <label className="field">Cout personnalise<input type="number" inputMode="numeric" min="1" max={coutMax ?? undefined} step="1" value={customCost} onChange={(event) => setCustomCost(event.target.value)} autoFocus /></label>
        {apercu != null && <p className="rule-option-note">Nouveau creneau possible : {participant.initiative} - {valeur} = {apercu}.</p>}
        <div className="grid2"><button className="primary" type="button" onClick={() => customAutorise && onValider(valeur)} disabled={!customAutorise}>Appliquer le cout</button><button className="small-btn" type="button" onClick={onTerminer}>Terminer son round</button></div>
        <button className="small-btn" type="button" onClick={onFermer}>Annuler</button>
      </div>
    </Fenetre>
  );
}
