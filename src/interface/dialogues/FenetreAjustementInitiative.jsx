import { useState } from 'react';
import { initiativeInputIsValid, initiativeTextOrderEnabled, initiativeValueForMode, normalizeInitiativeTextOrder } from '../../domain/initiativeTextOrder.js';
import { t } from '../../i18n/index.js';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';
import { ChampInitiative } from '../initiative/ChampInitiative.jsx';

export function FenetreAjustementInitiative({ participant, valeurInitiale, initiativeTextOrder, onFermer, onValider, onPasser }) {
  const [valeur, setValeur] = useState(valeurInitiale ?? participant?.initiative ?? '');
  const [cout, setCout] = useState('');
  const textConfig = normalizeInitiativeTextOrder(initiativeTextOrder);
  const modeLabel = initiativeTextOrderEnabled(textConfig);
  const numerique = !modeLabel && Number.isFinite(Number(valeur));
  const valeurValide = initiativeInputIsValid(valeur, textConfig);
  const appliquerCout = () => {
    const delta = Number(cout);
    if (!Number.isFinite(delta) || !numerique) return;
    setValeur(String(Number(valeur) - delta));
    setCout('');
  };
  const valider = () => {
    if (!valeurValide) return;
    onValider(initiativeValueForMode(valeur, textConfig));
  };

  return <Fenetre title={t('initiativeAdjust.title')} onClose={onFermer}>
    <div className="stack">
      <p className="muted compact-help">{t('initiativeAdjust.help', { name: participant?.name || t('initiativeAdjust.defaultParticipant') })}</p>
      <ChampInitiative label={t('initiativeAdjust.new')} valeur={valeur} onChange={setValeur} textConfig={textConfig} autoFocus />
      {!modeLabel && <div className="row compact-toolbar-actions"><input type="number" inputMode="numeric" placeholder={t('initiativeAdjust.cost')} value={cout} onChange={(event) => setCout(event.target.value)} /><button className="small-btn" type="button" onClick={appliquerCout} disabled={!numerique}>{t('initiativeAdjust.applyCost')}</button></div>}
      <div className="grid2"><button className="primary" onClick={valider} disabled={!valeurValide}>{t('initiativeAdjust.validateNext')}</button><button className="small-btn" onClick={onPasser}>{t('initiativeAdjust.nextWithoutChange')}</button></div>
      <button className="small-btn" onClick={onFermer}>{t('common.cancel')}</button>
    </div>
  </Fenetre>;
}
