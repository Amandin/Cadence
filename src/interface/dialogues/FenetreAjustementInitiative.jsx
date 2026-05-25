import { useState } from 'react';
import { initiativeInputIsValid, initiativeTextOrderEnabled, initiativeValueForMode, normalizeInitiativeTextOrder } from '../../domain/initiativeTextOrder.js';
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

  return <Fenetre title="Ajuster l'initiative" onClose={onFermer}>
    <div className="stack">
      <p className="muted compact-help">Modifie seulement l'initiative de {participant?.name || 'ce participant'} avant d'avancer. Les ticks du bouton Suivant se produisent normalement ; l'activation du meme personnage reste bornee par la regle du round.</p>
      <ChampInitiative label="Nouvelle initiative" valeur={valeur} onChange={setValeur} textConfig={textConfig} autoFocus />
      {!modeLabel && <div className="row compact-toolbar-actions"><input type="number" inputMode="numeric" placeholder="Cout" value={cout} onChange={(event) => setCout(event.target.value)} /><button className="small-btn" type="button" onClick={appliquerCout} disabled={!numerique}>Appliquer cout</button></div>}
      <div className="grid2"><button className="primary" onClick={valider} disabled={!valeurValide}>Valider puis suivant</button><button className="small-btn" onClick={onPasser}>Suivant sans modifier</button></div>
      <button className="small-btn" onClick={onFermer}>Annuler</button>
    </div>
  </Fenetre>;
}
