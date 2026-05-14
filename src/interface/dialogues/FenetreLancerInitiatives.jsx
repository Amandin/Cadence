import { useMemo, useState } from 'react';
import { participantKinds } from '../../constants.js';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';

function estPersonnage(participant) {
  return participant.kind !== 'Environnement';
}

function champRempli(valeur) {
  return valeur !== '' && valeur != null && Number.isFinite(Number(valeur));
}

function participantsParType(participants) {
  return participantKinds
    .filter((type) => type !== 'Environnement')
    .map((type) => ({ type, participants: participants.filter((participant) => participant.kind === type) }))
    .filter((groupe) => groupe.participants.length > 0);
}

function valeursVides(participants) {
  return Object.fromEntries(participants.map((participant) => [participant.id, '']));
}

export function FenetreLancerInitiatives({ participants = [], onFermer, onValider, onPasserHorsInitiative }) {
  const personnages = useMemo(() => participants.filter(estPersonnage), [participants]);
  const [idsEnAttente, setIdsEnAttente] = useState(() => personnages.map((participant) => participant.id));
  const participantsEnAttente = personnages.filter((participant) => idsEnAttente.includes(participant.id));
  const groupes = useMemo(() => participantsParType(participantsEnAttente), [participantsEnAttente]);
  const [valeurs, setValeurs] = useState(() => valeursVides(personnages));
  const restantsSansValeur = participantsEnAttente.filter((participant) => !champRempli(valeurs[participant.id]));
  const restantsAvecValeur = participantsEnAttente.filter((participant) => champRempli(valeurs[participant.id]));
  const saisiePartielle = restantsAvecValeur.length > 0 && restantsSansValeur.length > 0;

  const changerValeur = (id, valeur) => setValeurs((courant) => ({ ...courant, [id]: valeur }));

  const vider = () => setValeurs((courant) => ({ ...courant, ...valeursVides(participantsEnAttente) }));

  const appliquer = () => {
    if (restantsAvecValeur.length === 0) return;
    const valeursRenseignees = Object.fromEntries(restantsAvecValeur.map((participant) => [participant.id, valeurs[participant.id]]));
    onValider(valeursRenseignees);
    setIdsEnAttente(restantsSansValeur.map((participant) => participant.id));
    setValeurs((courant) => ({ ...courant, ...valeursVides(restantsAvecValeur) }));
    if (restantsSansValeur.length === 0) onFermer();
  };

  const passerRestantsHorsInitiative = () => {
    onPasserHorsInitiative(restantsSansValeur.map((participant) => participant.id));
    onFermer();
  };

  return (
    <Fenetre title="Saisir les initiatives" onClose={onFermer}>
      <div className="initiative-roll-panel">
        <div className="initiative-roll-toolbar manual-entry">
          <p className="muted compact-help">Renseigne les valeurs au fur et à mesure. L’environnement garde son initiative fixe.</p>
          <button className="small-btn" onClick={vider}>Vider</button>
        </div>
        {saisiePartielle && <div className="initiative-entry-warning">Les valeurs renseignées vont être appliquées. Les autres resteront à compléter ou pourront passer hors init’.</div>}
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
          <button className="primary" onClick={appliquer} disabled={restantsAvecValeur.length === 0}>Appliquer</button>
          <button className="small-btn" onClick={onFermer}>Annuler</button>
        </div>
        {restantsSansValeur.length > 0 && restantsAvecValeur.length === 0 && idsEnAttente.length < personnages.length && <button className="small-btn" onClick={passerRestantsHorsInitiative}>Passer les restants hors init’</button>}
        {saisiePartielle && <button className="small-btn" onClick={passerRestantsHorsInitiative}>Appliquer et passer les autres hors init’</button>}
      </div>
    </Fenetre>
  );
}
