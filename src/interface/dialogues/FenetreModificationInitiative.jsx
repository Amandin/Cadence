import { useState } from 'react';
import { phaseActionModes } from '../../constants.js';
import { initiativeInputIsValid, initiativeValueForMode, normalizeInitiativeTextOrder } from '../../domain/initiativeTextOrder.js';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';
import { EditeurPhasesParticipant, normaliserPhaseActions } from '../initiative/EditeurPhasesParticipant.jsx';
import { ChampInitiative } from '../initiative/ChampInitiative.jsx';

export function FenetreModificationInitiative({ participant, initiativeTextOrder, phaseActionMode, phaseCount, onFermer, onValider }) {
  const [initiative, setInitiative] = useState(String(participant?.initiative ?? ''));
  const [phaseActions, setPhaseActions] = useState(() => normaliserPhaseActions(participant?.phaseActions, phaseCount));
  const textConfig = normalizeInitiativeTextOrder(initiativeTextOrder);
  const valeurValide = initiativeInputIsValid(initiative, textConfig);
  const modePhasesCochees = phaseActionMode === phaseActionModes.CHECKED;

  return (
    <Fenetre title={`Modifier l'initiative - ${participant?.name || 'Personnage'}`} onClose={onFermer}>
      <div className="stack">
        <ChampInitiative label="Initiative" valeur={initiative} textConfig={textConfig} onChange={setInitiative} autoFocus />
        {modePhasesCochees && <EditeurPhasesParticipant phaseActions={phaseActions} phaseCount={phaseCount} onChange={setPhaseActions} />}
        <div className="grid2">
          <button className="primary" type="button" disabled={!valeurValide} onClick={() => onValider(initiativeValueForMode(initiative, textConfig), modePhasesCochees ? phaseActions : undefined)}>Valider</button>
          <button className="small-btn" type="button" onClick={onFermer}>Annuler</button>
        </div>
      </div>
    </Fenetre>
  );
}
