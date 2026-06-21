import { useState } from 'react';
import { phaseActionModes } from '../../constants.js';
import { initiativeInputIsValid, initiativeValueForMode, normalizeInitiativeTextOrder } from '../../domain/initiativeTextOrder.js';
import { t } from '../../i18n/index.js';
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
    <Fenetre title={t('initiative.editDialog.title', { name: participant?.name || t('initiative.editDialog.fallbackName') })} onClose={onFermer}>
      <div className="stack">
        <ChampInitiative label={t('characterAdd.initiative')} valeur={initiative} textConfig={textConfig} onChange={setInitiative} autoFocus />
        {modePhasesCochees && <EditeurPhasesParticipant phaseActions={phaseActions} phaseCount={phaseCount} onChange={setPhaseActions} />}
        <div className="grid2">
          <button className="primary" type="button" disabled={!valeurValide} onClick={() => onValider(initiativeValueForMode(initiative, textConfig), modePhasesCochees ? phaseActions : undefined)}>{t('sheet.validate')}</button>
          <button className="small-btn" type="button" onClick={onFermer}>{t('common.cancel')}</button>
        </div>
      </div>
    </Fenetre>
  );
}
