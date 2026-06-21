import { useState } from 'react';
import { initiativeInputIsValid, initiativeValueForMode, normalizeInitiativeTextOrder } from '../../domain/initiativeTextOrder.js';
import { t } from '../../i18n/index.js';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';
import { ChampInitiative } from '../initiative/ChampInitiative.jsx';

export function FenetreRejoindreInitiative({ participant, initiativeTextOrder, utiliserInitiative = true, onFermer, onValider }) {
  const ancienneInitiative = participant.previousInitiative ?? participant.previousActionSlots?.[0]?.initiative ?? '';
  const [initiative, setInitiative] = useState('');
  const textConfig = normalizeInitiativeTextOrder(initiativeTextOrder);
  const valeurValide = initiativeInputIsValid(initiative, textConfig);

  return (
    <Fenetre title={t('initiative.joinDialog.title', { name: participant.name })} onClose={onFermer}>
      {utiliserInitiative ? <ChampInitiative label={t('characterAdd.initiative')} valeur={initiative} textConfig={textConfig} onChange={setInitiative} autoFocus /> : <p className="muted compact-help">{t('initiative.joinDialog.flexibleHelp')}</p>}
      {utiliserInitiative && String(ancienneInitiative ?? '').trim() !== '' && <button className="small-btn" type="button" onClick={() => setInitiative(String(ancienneInitiative))}>{t('initiative.joinDialog.resumePrevious')}</button>}
      <div className="grid2" style={{ marginTop: 12 }}>
        <button className="primary" disabled={!valeurValide} onClick={() => onValider(initiativeValueForMode(initiative, textConfig))}>{t('initiative.joinAction')}</button>
        <button className="small-btn" onClick={onFermer}>{t('common.cancel')}</button>
      </div>
    </Fenetre>
  );
}
