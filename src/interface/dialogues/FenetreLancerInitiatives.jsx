import { useMemo, useState } from 'react';
import { participantKinds } from '../../constants.js';
import { normaliserCreneauxAction } from '../../domain/initiative.js';
import { composeInitiativeLabel, initiativeTextOrderEnabled, normalizeInitiativeTextOrder, splitInitiativeLabel } from '../../domain/initiativeTextOrder.js';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';

function estPersonnage(participant) { return participant.kind !== 'Environnement'; }
function filtrerParticipants(participants, inclureEnvironnements) { return inclureEnvironnements ? participants : participants.filter(estPersonnage); }
function champRempli(valeur) { if (Array.isArray(valeur)) return valeur.some(champRempli); return String(valeur ?? '').trim() !== ''; }
function champsParticipant(participant, valeurs) { const courant = valeurs[participant.id]; if (Array.isArray(courant) && courant.length) return courant; return normaliserCreneauxAction(participant).map(() => ''); }
function participantsParType(participants, inclureEnvironnements) { return participantKinds.filter((type) => inclureEnvironnements || type !== 'Environnement').map((type) => ({ type, participants: participants.filter((participant) => participant.kind === type) })).filter((groupe) => groupe.participants.length > 0); }
function valeursVides(participants) { return Object.fromEntries(participants.map((participant) => [participant.id, normaliserCreneauxAction(participant).map(() => '')])); }
function valeursRenseignees(participants, valeurs) { return Object.fromEntries(participants.filter((participant) => champRempli(valeurs[participant.id])).map((participant) => [participant.id, champsParticipant(participant, valeurs).filter(champRempli)])); }

function BoutonChoixInitiative({ titre, detail, onClick, disabled = false, variant = 'standard' }) {
  return <button className={`initiative-choice-action ${variant}`} onClick={onClick} disabled={disabled}><strong>{titre}</strong><small>{detail}</small></button>;
}

function ChampInitiative({ valeur, onChange, textConfig }) {
  if (!initiativeTextOrderEnabled(textConfig)) return <input type="number" inputMode="numeric" placeholder="-" value={valeur ?? ''} onChange={(event) => onChange(event.target.value)} />;
  const config = normalizeInitiativeTextOrder(textConfig);
  const selection = splitInitiativeLabel(valeur, config);
  const changerPartie = (index, next) => {
    const parts = config.parts.map((_, position) => position === index ? next : (selection[position] || ''));
    onChange(composeInitiativeLabel(parts, config));
  };
  return <div className="initiative-select-parts">
    {config.parts.map((part, index) => <label className="initiative-select-part" key={`${part.label}-${index}`}>
      <small>{part.label}</small>
      <select value={selection[index] || ''} onChange={(event) => changerPartie(index, event.target.value)}>
        <option value="">—</option>
        {part.values.map((option) => <option value={option} key={option}>{option}</option>)}
      </select>
    </label>)}
  </div>;
}

function SectionSaisieInitiative({ titre, participants, inclureEnvironnements, valeurs, changerValeur, ajouterAction, retirerAction, textConfig }) {
  const groupes = participantsParType(participants, inclureEnvironnements);
  if (groupes.length === 0) return null;
  return <section className="initiative-entry-zone">
    <h3>{titre}</h3>
    <div className="initiative-entry-groups">
      {groupes.map((groupe) => <section className="initiative-roll-group" key={`${titre}-${groupe.type}`}>
        <h4>{groupe.type}</h4>
        <div className="initiative-roll-list">
          {groupe.participants.map((participant) => {
            const champs = champsParticipant(participant, valeurs);
            return <div className="initiative-roll-row multi-roll-row" key={participant.id}>
              <span>{participant.name}</span>
              <div className="initiative-roll-slots">
                {champs.map((valeur, index) => <label className="initiative-roll-slot" key={index}>
                  <small>Init {index + 1}</small>
                  <ChampInitiative valeur={valeur} textConfig={textConfig} onChange={(next) => changerValeur(participant.id, index, next)} />
                  {champs.length > 1 && <button className="small-btn subtle-danger" onClick={() => retirerAction(participant.id, index)} type="button">x</button>}
                </label>)}
                <button className="small-btn add-roll-slot" onClick={() => ajouterAction(participant.id)} type="button">+ action</button>
              </div>
            </div>;
          })}
        </div>
      </section>)}
    </div>
  </section>;
}

export function FenetreLancerInitiatives({ participants = [], reserve = [], initiativeTextOrder, onFermer, onValider, onPasserHorsInitiative }) {
  const textConfig = useMemo(() => normalizeInitiativeTextOrder(initiativeTextOrder), [initiativeTextOrder]);
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
  const changerValeur = (id, index, valeur) => setValeurs((courant) => { const champs = Array.isArray(courant[id]) && courant[id].length ? courant[id] : ['']; return { ...courant, [id]: champs.map((champ, position) => position === index ? valeur : champ) }; });
  const ajouterAction = (id) => setValeurs((courant) => { const champs = Array.isArray(courant[id]) && courant[id].length ? courant[id] : ['']; return { ...courant, [id]: [...champs, ''] }; });
  const retirerAction = (id, index) => setValeurs((courant) => { const champs = Array.isArray(courant[id]) && courant[id].length ? courant[id] : ['']; const suivants = champs.filter((_, position) => position !== index); return { ...courant, [id]: suivants.length ? suivants : [''] }; });
  const vider = () => setValeurs((courant) => ({ ...courant, ...valeursVides(tousEnAttente) }));
  const appliquer = () => { if (restantsAvecValeur.length === 0) return; onValider(valeursRenseignees(restantsAvecValeur, valeurs)); setIdsEnAttente(restantsSansValeur.map((participant) => participant.id)); setValeurs((courant) => ({ ...courant, ...valeursVides(restantsAvecValeur) })); if (restantsSansValeur.length === 0) onFermer(); };
  const ajouterEtConserverAutresInitiatives = () => { if (restantsAvecValeur.length === 0) return; onValider(valeursRenseignees(restantsAvecValeur, valeurs)); onFermer(); };
  const passerRestantsHorsInitiative = () => { onPasserHorsInitiative(participantsActifsSansValeur.map((participant) => participant.id)); onFermer(); };
  const appliquerEtPasserRestantsHorsInitiative = () => { if (restantsAvecValeur.length > 0) onValider(valeursRenseignees(restantsAvecValeur, valeurs)); passerRestantsHorsInitiative(); };
  const aucunCandidatAffiche = participantsEnAttente.length === 0 && reserveEnAttente.length === 0;
  return <Fenetre title="Saisir les initiatives" onClose={onFermer}>
    <div className="initiative-roll-panel">
      <div className="initiative-roll-toolbar manual-entry"><p className="muted compact-help">{initiativeTextOrderEnabled(textConfig) ? 'Choisis les parties de l’initiative. Cadence calcule l’ordre sans afficher de score technique.' : 'Renseigne les valeurs au fur et a mesure. Les reservistes renseignes rejoignent l’initiative.'}</p><div className="row compact-toolbar-actions"><button className={`small-btn ${inclureEnvironnements ? 'selected-toggle' : ''}`} onClick={() => setInclureEnvironnements((valeur) => !valeur)}>{inclureEnvironnements ? 'Masquer env.' : 'Inclure env.'}</button><button className="small-btn" onClick={vider}>Vider</button></div></div>
      {saisiePartielle && <div className="initiative-entry-warning">Certaines valeurs sont renseignees, d'autres non. Choisis quoi faire des champs vides.</div>}
      {aucunCandidatAffiche ? <p className="muted">Aucun personnage a renseigner.</p> : <><SectionSaisieInitiative titre="En initiative" participants={participantsEnAttente} inclureEnvironnements={inclureEnvironnements} valeurs={valeurs} changerValeur={changerValeur} ajouterAction={ajouterAction} retirerAction={retirerAction} textConfig={textConfig} /><SectionSaisieInitiative titre="Reserve" participants={reserveEnAttente} inclureEnvironnements={inclureEnvironnements} valeurs={valeurs} changerValeur={changerValeur} ajouterAction={ajouterAction} retirerAction={retirerAction} textConfig={textConfig} /></>}
      <div className="initiative-actions"><div className="initiative-decision-actions"><BoutonChoixInitiative titre="Continuer" detail={saisiePartielle ? 'Valider, puis completer les champs vides.' : 'Valider les valeurs renseignees.'} onClick={appliquer} disabled={restantsAvecValeur.length === 0} variant="primary-choice" />{saisiePartielle && <BoutonChoixInitiative titre="Conserver" detail="Valider et garder les autres initiatives." onClick={ajouterEtConserverAutresInitiatives} variant="keep-choice" />}{saisiePartielle && participantsActifsSansValeur.length > 0 && <BoutonChoixInitiative titre="Ignorer" detail="Valider et sortir les non renseignes." onClick={appliquerEtPasserRestantsHorsInitiative} variant="out-choice" />}</div>{participantsActifsSansValeur.length > 0 && restantsAvecValeur.length === 0 && idsEnAttente.length < candidats.length && <BoutonChoixInitiative titre="Ignorer" detail="Sortir les champs encore vides." onClick={passerRestantsHorsInitiative} variant="out-choice" />}<button className="initiative-cancel-action" onClick={onFermer}>Annuler</button></div>
    </div>
  </Fenetre>;
}
