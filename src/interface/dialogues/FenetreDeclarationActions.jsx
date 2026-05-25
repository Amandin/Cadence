import { useMemo, useState } from 'react';
import { trierParInitiative } from '../../domain/initiative.js';
import { normalizeDeclarations } from '../../domain/initiativeModes.js';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';

const actionTypes = ['Attaque', 'Defense', 'Mouvement', 'Soutien', 'Autre'];

export function FenetreDeclarationActions({ scene, optionsInitiative, onFermer, onValider }) {
  const ordre = useMemo(() => trierParInitiative(scene.participants || [], optionsInitiative).reverse(), [optionsInitiative, scene.participants]);
  const [indexActif, setIndexActif] = useState(0);
  const [choix, setChoix] = useState(() => normalizeDeclarations(scene.declarations, scene.participants || []));
  const participant = ordre[indexActif] || null;
  const choixComplets = ordre.length > 0 && ordre.every((item) => String(choix[item.id] || '').trim());

  const validerChoix = (valeur) => {
    if (!participant) return;
    const suivants = { ...choix, [participant.id]: valeur };
    setChoix(suivants);
    if (indexActif < ordre.length - 1) setIndexActif((index) => index + 1);
    else onValider(suivants);
  };

  const revenir = () => setIndexActif((index) => Math.max(0, index - 1));
  const validerTout = () => {
    if (choixComplets) onValider(choix);
  };

  return (
    <Fenetre title="Declarer les actions" onClose={onFermer}>
      <div className="stack declaration-choice-window">
        <div className="declaration-choice-progress">
          <span>{ordre.length ? `${indexActif + 1}/${ordre.length}` : '0/0'}</span>
          <strong>{participant?.name || 'Aucun participant'}</strong>
        </div>
        <div className="declaration-choice-actions">
          {actionTypes.map((action) => (
            <button className={`initiative-choice-action ${choix[participant?.id] === action ? 'primary-choice' : ''}`} key={action} type="button" onClick={() => validerChoix(action)} disabled={!participant}>
              <strong>{action}</strong>
            </button>
          ))}
        </div>
        <div className="declaration-choice-review">
          {ordre.map((item, index) => <button className={index === indexActif ? 'active' : ''} key={item.id} type="button" onClick={() => setIndexActif(index)}><span>{item.name}</span><strong>{choix[item.id] || '-'}</strong></button>)}
        </div>
        <div className="grid2">
          <button className="small-btn" type="button" onClick={revenir} disabled={indexActif <= 0}>Retour</button>
          <button className="primary" type="button" onClick={validerTout} disabled={!choixComplets}>Lancer la resolution</button>
        </div>
      </div>
    </Fenetre>
  );
}
