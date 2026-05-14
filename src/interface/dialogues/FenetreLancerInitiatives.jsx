import { useMemo, useState } from 'react';
import { participantKinds } from '../../constants.js';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';

function estPersonnage(participant) {
  return participant.kind !== 'Environnement';
}

function participantsParType(participants) {
  return participantKinds
    .filter((type) => type !== 'Environnement')
    .map((type) => ({ type, participants: participants.filter((participant) => participant.kind === type) }))
    .filter((groupe) => groupe.participants.length > 0);
}

export function FenetreLancerInitiatives({ participants = [], onFermer, onValider }) {
  const personnages = useMemo(() => participants.filter(estPersonnage), [participants]);
  const groupes = useMemo(() => participantsParType(personnages), [personnages]);
  const [valeurs, setValeurs] = useState(() => Object.fromEntries(personnages.map((participant) => [participant.id, ''])));

  const changerValeur = (id, valeur) => setValeurs((courant) => ({ ...courant, [id]: valeur }));

  const vider = () => setValeurs(Object.fromEntries(personnages.map((participant) => [participant.id, ''])));

  const valider = () => {
    onValider(valeurs);
    onFermer();
  };

  return (
    <Fenetre title="Saisir les initiatives" onClose={onFermer}>
      <div className="initiative-roll-panel">
        <div className="initiative-roll-toolbar manual-entry">
          <p className="muted compact-help">Renseigne les valeurs au fur et à mesure. L’environnement garde son initiative fixe.</p>
          <button className="small-btn" onClick={vider}>Vider</button>
        </div>
        {groupes.length === 0 ? <p className="muted">Aucun personnage à renseigner.</p> : groupes.map((groupe) => (
          <section className="initiative-roll-group" key={groupe.type}>
            <h3>{groupe.type}</h3>
            <div className="initiative-roll-list">
              {groupe.participants.map((participant) => (
                <label className="initiative-roll-row" key={participant.id}>
                  <span>{participant.name}</span>
                  <input type="number" inputMode="numeric" placeholder="—" value={valeurs[participant.id] ?? ''} onChange={(event) => changerValeur(participant.id, event.target.value)} />
                </label>
              ))}
            </div>
          </section>
        ))}
        <div className="grid2" style={{ marginTop: 12 }}>
          <button className="primary" onClick={valider} disabled={groupes.length === 0}>Appliquer</button>
          <button className="small-btn" onClick={onFermer}>Annuler</button>
        </div>
      </div>
    </Fenetre>
  );
}
