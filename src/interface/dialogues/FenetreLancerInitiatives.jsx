import { useMemo, useState } from 'react';
import { participantKinds } from '../../constants.js';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';

function lancerDe(nombreFaces) {
  return Math.floor(Math.random() * nombreFaces) + 1;
}

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
  const [faces, setFaces] = useState(20);
  const [valeurs, setValeurs] = useState(() => Object.fromEntries(personnages.map((participant) => [participant.id, String(lancerDe(20))])));

  const relancer = () => {
    const nombreFaces = Math.max(2, Number(faces) || 20);
    setValeurs(Object.fromEntries(personnages.map((participant) => [participant.id, String(lancerDe(nombreFaces))])));
  };

  const changerValeur = (id, valeur) => setValeurs((courant) => ({ ...courant, [id]: valeur }));

  const valider = () => {
    onValider(valeurs);
    onFermer();
  };

  return (
    <Fenetre title="Lancer les initiatives" onClose={onFermer}>
      <div className="initiative-roll-panel">
        <div className="initiative-roll-toolbar">
          <label className="field compact-field">Dé<input type="number" min="2" value={faces} onChange={(event) => setFaces(event.target.value)} /></label>
          <button className="small-btn" onClick={relancer}>Relancer</button>
        </div>
        <p className="muted compact-help">Seuls les personnages sont relancés. L’environnement garde son initiative fixe.</p>
        {groupes.length === 0 ? <p className="muted">Aucun personnage à relancer.</p> : groupes.map((groupe) => (
          <section className="initiative-roll-group" key={groupe.type}>
            <h3>{groupe.type}</h3>
            <div className="initiative-roll-list">
              {groupe.participants.map((participant) => (
                <label className="initiative-roll-row" key={participant.id}>
                  <span>{participant.name}</span>
                  <input type="number" inputMode="numeric" value={valeurs[participant.id] ?? ''} onChange={(event) => changerValeur(participant.id, event.target.value)} />
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
