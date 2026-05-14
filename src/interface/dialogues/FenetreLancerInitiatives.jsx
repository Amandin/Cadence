import { useMemo, useState } from 'react';
import { participantKinds } from '../../constants.js';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';

function estPersonnage(participant) {
  return participant.kind !== 'Environnement';
}

function filtrerParticipants(participants, inclureEnvironnements) {
  return inclureEnvironnements ? participants : participants.filter(estPersonnage);
}

function champRempli(valeur) {
  return valeur !== '' && valeur != null && Number.isFinite(Number(valeur));
}

function participantsParType(participants, inclureEnvironnements) {
  return participantKinds
    .filter((type) => inclureEnvironnements || type !== 'Environnement')
    .map((type) => ({ type, participants: participants.filter((participant) => participant.kind === type) }))
    .filter((groupe) => groupe.participants.length > 0);
}

function valeursVides(participants) {
  return Object.fromEntries(participants.map((participant) => [participant.id, '']));
}

function valeursRenseignees(participants, valeurs) {
  return Object.fromEntries(participants
    .filter((participant) => champRempli(valeurs[participant.id]))
    .map((participant) => [participant.id, valeurs[participant.id]]));
}

function SectionSaisieInitiative({ titre, participants, inclureEnvironnements, valeurs, changerValeur }) {
  const groupes = participantsParType(participants, inclureEnvironnements);
  if (groupes.length === 0) return null;

  return (
    <section className="initiative-entry-zone">
      <h3>{titre}</h3>
      <div className="initiative-entry-groups">
        {groupes.map((groupe) => (
          <section className="initiative-roll-group" key={`${titre}-${groupe.type}`}>
            <h4>{groupe.type}</h4>
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
      </div>
    </section>
  );
}

export function FenetreLancerInitiatives({ participants = [], reserve = [], onFermer, onValider, onPasserHorsInitiative }) {
  const [inclureEnvironnements, setInclureEnvironnements] = useState(false);
  const candidats = useMemo(() => [...participants, ...reserve], [participants, reserve]);
  const candidatsAffiches = useMemo(() => filtrerParticipants(candidats, inclureEnvironnements), [candidats, inclureEnvironnements]);
  const [idsEnAttente, setIdsEnAttente] = useState(() => candidats.map((participant) => participant.id));
  const idsAffiches = useMemo(() => new Set(candidatsAffiches.map((participant) => participant.id)), [candidatsAffiches]);
  const participantsEnAttente = participants.filter((participant) => idsEnAttente.includes(participant.id) && idsAffiches.has(participant.id));
  const reserveEnAttente = reserve.filter((participant) => idsEnAttente.includes(participant.id) && idsAffiches.has(participant.id));
  const tousEnAttente = [...participantsEnAttente, ...reserveEnAttente];
  const [valeurs, setValeurs] = useState(() => valeursVides(candidats));
  const restantsSansValeur = tousEnAttente.filter((participant) => !champRempli(valeurs[participant.id]));
  const restantsAvecValeur = tousEnAttente.filter((participant) => champRempli(valeurs[participant.id]));
  const participantsActifsSansValeur = participantsEnAttente.filter((participant) => !champRempli(valeurs[participant.id]));
  const saisiePartielle = restantsAvecValeur.length > 0 && restantsSansValeur.length > 0;

  const changerValeur = (id, valeur) => setValeurs((courant) => ({ ...courant, [id]: valeur }));

  const vider = () => setValeurs((courant) => ({ ...courant, ...valeursVides(tousEnAttente) }));

  const appliquer = () => {
    if (restantsAvecValeur.length === 0) return;
    onValider(valeursRenseignees(restantsAvecValeur, valeurs));
    setIdsEnAttente(restantsSansValeur.map((participant) => participant.id));
    setValeurs((courant) => ({ ...courant, ...valeursVides(restantsAvecValeur) }));
    if (restantsSansValeur.length === 0) onFermer();
  };

  const ajouterEtConserverAutresInitiatives = () => {
    if (restantsAvecValeur.length === 0) return;
    onValider(valeursRenseignees(restantsAvecValeur, valeurs));
    onFermer();
  };

  const passerRestantsHorsInitiative = () => {
    onPasserHorsInitiative(participantsActifsSansValeur.map((participant) => participant.id));
    onFermer();
  };

  const appliquerEtPasserRestantsHorsInitiative = () => {
    if (restantsAvecValeur.length > 0) onValider(valeursRenseignees(restantsAvecValeur, valeurs));
    passerRestantsHorsInitiative();
  };

  const aucunCandidatAffiche = participantsEnAttente.length === 0 && reserveEnAttente.length === 0;

  return (
    <Fenetre title="Saisir les initiatives" onClose={onFermer}>
      <div className="initiative-roll-panel">
        <div className="initiative-roll-toolbar manual-entry">
          <p className="muted compact-help">Renseigne les valeurs au fur et à mesure. Les réservistes renseignés rejoignent l’initiative.</p>
          <div className="row compact-toolbar-actions">
            <button className={`small-btn ${inclureEnvironnements ? 'selected-toggle' : ''}`} onClick={() => setInclureEnvironnements((valeur) => !valeur)}>{inclureEnvironnements ? 'Masquer env.' : 'Inclure env.'}</button>
            <button className="small-btn" onClick={vider}>Vider</button>
          </div>
        </div>
        {saisiePartielle && <div className="initiative-entry-warning">Les valeurs renseignées vont être appliquées. Les autres resteront à compléter, pourront être conservées, ou pourront passer hors init’.</div>}
        {aucunCandidatAffiche ? <p className="muted">Aucun personnage à renseigner.</p> : <>
          <SectionSaisieInitiative titre="En initiative" participants={participantsEnAttente} inclureEnvironnements={inclureEnvironnements} valeurs={valeurs} changerValeur={changerValeur} />
          <SectionSaisieInitiative titre="Réserve" participants={reserveEnAttente} inclureEnvironnements={inclureEnvironnements} valeurs={valeurs} changerValeur={changerValeur} />
        </>}
        <div className="grid2" style={{ marginTop: 12 }}>
          <button className="primary" onClick={appliquer} disabled={restantsAvecValeur.length === 0}>Appliquer</button>
          <button className="small-btn" onClick={onFermer}>Annuler</button>
        </div>
        {saisiePartielle && <button className="small-btn" onClick={ajouterEtConserverAutresInitiatives}>Ajouter et conserver les autres initiatives</button>}
        {participantsActifsSansValeur.length > 0 && restantsAvecValeur.length === 0 && idsEnAttente.length < candidats.length && <button className="small-btn" onClick={passerRestantsHorsInitiative}>Passer les restants hors init’</button>}
        {saisiePartielle && participantsActifsSansValeur.length > 0 && <button className="small-btn" onClick={appliquerEtPasserRestantsHorsInitiative}>Appliquer et passer les autres hors init’</button>}
      </div>
    </Fenetre>
  );
}
