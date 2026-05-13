import { useState } from 'react';
import { hasTriggeredClock, isVisible } from '../../logic.js';
import { Avatar, Status, colorToAccent } from '../../components/common.jsx';
import { Tracker } from '../../components/Tracker.jsx';

function aDuContenuOperationnel(participant, suivisVisibles) {
  return suivisVisibles.length > 0 || (participant.statuses || []).length > 0;
}

export function FichetteInitiative({ participant, actif, onOuvrir, onSuivi, onSupprimerSuivi, onAjouterEtat, onRetirerEtat, onQuitterInitiative }) {
  const [repliee, setRepliee] = useState(false);
  const declenchee = hasTriggeredClock(participant);
  const suivisVisibles = participant.trackers.filter(isVisible);
  const contenuOperationnel = aDuContenuOperationnel(participant, suivisVisibles);
  const sortieConseillee = !contenuOperationnel;

  return <article data-participant-id={participant.id} className={`card ${actif ? 'active' : ''} ${declenchee ? 'triggered' : ''} ${repliee ? 'collapsed' : ''}`} style={{ '--accent': colorToAccent(participant.color) }}><div className="card-head"><button className="icon-btn collapse-btn" onClick={() => setRepliee((valeur) => !valeur)} aria-label={repliee ? 'Dérouler la fichette' : 'Enrouler la fichette'}>{repliee ? '⌄' : '⌃'}</button><button className="card-main" onClick={onOuvrir}><Avatar participant={participant} /><div className="info"><div className="name-line"><strong>{participant.name}</strong>{actif && <span className="chip">Tour actif</span>}{declenchee && <span className="chip hot">À résoudre</span>}{sortieConseillee && <span className="chip hot">Aucun suivi</span>}</div><div className="muted">{participant.description}</div><div className="name-line" style={{ marginTop: 6 }}><span className="chip">{participant.kind}</span><span className="chip">Init {participant.initiative}</span>{participant.stats?.map((stat) => <span className="chip" key={stat}>{stat}</span>)}</div></div></button><button className={`small-btn ${sortieConseillee ? 'suggested' : ''}`} onClick={onQuitterInitiative}>{sortieConseillee ? 'Sortir de l’initiative' : 'Quitter l’init'}</button></div><div className="trackers">{suivisVisibles.map((suivi) => <Tracker key={suivi.id} tracker={suivi} onChange={(suivant) => onSuivi(suivi.id, suivant)} onDelete={() => onSupprimerSuivi(suivi.id)} />)}<div className="statuses">{participant.statuses?.map((etat) => <Status key={etat.id} status={etat} onRemove={() => onRetirerEtat(etat.id)} />)}<button className="small-btn" onClick={onAjouterEtat}>+ état</button></div></div></article>;
}
