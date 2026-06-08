import { useMemo, useState } from 'react';
import { participantKinds } from '../../constants.js';
import { normaliserCreneauxAction } from '../../domain/initiative.js';
import { initiativeTextOrderEnabled, normalizeInitiativeTextOrder } from '../../domain/initiativeTextOrder.js';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';
import { ChampInitiative } from '../initiative/ChampInitiative.jsx';

function estPersonnage(participant) { return participant.kind !== 'Environnement'; }
function filtrerParticipants(participants, inclureEnvironnements) { return inclureEnvironnements ? participants : participants.filter(estPersonnage); }
function champRempli(valeur) { if (Array.isArray(valeur)) return valeur.some(champRempli); return String(valeur ?? '').trim() !== ''; }
function champsParticipant(participant, valeurs, multipleActionSlots = true) { const courant = valeurs[participant.id]; if (Array.isArray(courant) && courant.length) return multipleActionSlots ? courant : courant.slice(0, 1); return normaliserCreneauxAction(participant, { multipleActionSlots }).map(() => ''); }
function participantsParType(participants, inclureEnvironnements, categoryOrder = []) { const types = [...new Set([...categoryOrder, ...participantKinds, ...participants.map((participant) => participant.kind)].filter(Boolean))]; return types.filter((type) => inclureEnvironnements || type !== 'Environnement').map((type) => ({ type, participants: participants.filter((participant) => participant.kind === type) })).filter((groupe) => groupe.participants.length > 0); }
function valeursVides(participants, multipleActionSlots = true) { return Object.fromEntries(participants.map((participant) => [participant.id, normaliserCreneauxAction(participant, { multipleActionSlots }).map(() => '')])); }
function valeursInitiales(participants, reserve, multipleActionSlots = true, prefillExisting = false) { return { ...valeursVides(reserve, multipleActionSlots), ...(prefillExisting ? Object.fromEntries(participants.map((participant) => [participant.id, normaliserCreneauxAction(participant, { multipleActionSlots }).map((slot) => String(slot.initiative ?? participant.initiative ?? ''))])) : valeursVides(participants, multipleActionSlots)) }; }
function valeursRenseignees(participants, valeurs, multipleActionSlots = true) { return Object.fromEntries(participants.filter((participant) => champRempli(valeurs[participant.id])).map((participant) => [participant.id, champsParticipant(participant, valeurs, multipleActionSlots).filter(champRempli)])); }
function departagesInitiaux(participants) { return Object.fromEntries(participants.map((participant) => [participant.id, String(participant.departage ?? '')])); }
function departagesRenseignes(participants, departages) { return Object.fromEntries(participants.filter((participant) => champRempli(departages[participant.id])).map((participant) => [participant.id, departages[participant.id]])); }

function BoutonChoixInitiative({ titre, detail, onClick, disabled = false, variant = 'standard' }) {
  return <button className={`initiative-choice-action ${variant}`} onClick={onClick} disabled={disabled}><strong>{titre}</strong><small>{detail}</small></button>;
}

function SectionSaisieInitiative({ titre, participants, inclureEnvironnements, categoryOrder, valeurs, changerValeur, ajouterAction, retirerAction, textConfig, initiativeEnabled, multipleActionSlots, surpriseSelectionEnabled, surprisedIds, basculerSurpris, tiebreakerVisible, tiebreakerLabel, departages, changerDepartage }) {
  const groupes = participantsParType(participants, inclureEnvironnements, categoryOrder);
  if (groupes.length === 0) return null;
  return <section className="initiative-entry-zone">
    {titre && <h3>{titre}</h3>}
    <div className="initiative-entry-groups">
      {groupes.map((groupe) => <section className="initiative-roll-group" key={`${titre}-${groupe.type}`}>
        <h4>{groupe.type}</h4>
        <div className="initiative-roll-list">
          {groupe.participants.map((participant) => {
            const champs = champsParticipant(participant, valeurs, multipleActionSlots);
            const departageManquant = initiativeEnabled && tiebreakerVisible && !champRempli(participant.departage);
            return <div className={`initiative-roll-row multi-roll-row ${surpriseSelectionEnabled ? 'has-surprise' : ''} ${departageManquant ? 'has-tiebreaker' : ''}`} key={participant.id}>
              <div className="initiative-roll-identity"><span className="type-chip">{groupe.type}</span><strong>{participant.name}</strong></div>
              {(surpriseSelectionEnabled || departageManquant) && <div className={`initiative-meta-row ${surpriseSelectionEnabled ? 'has-surprise' : ''} ${departageManquant ? 'has-tiebreaker' : ''}`}>
                {surpriseSelectionEnabled && <label className={`surprise-inline-toggle ${surprisedIds.has(participant.id) ? 'active' : ''}`}><input type="checkbox" checked={surprisedIds.has(participant.id)} onChange={() => basculerSurpris(participant.id)} /><span>Surpris</span></label>}
                {departageManquant && <label className="initiative-tiebreaker-field"><small>{tiebreakerLabel || 'Départage'}</small><input type="number" inputMode="numeric" value={departages[participant.id] ?? ''} onChange={(event) => changerDepartage(participant.id, event.target.value)} /></label>}
              </div>}
              {initiativeEnabled && <div className="initiative-values-row">
                <div className="initiative-roll-slots">
                  {champs.map((valeur, index) => <label className="initiative-roll-slot" key={index}>
                    <small>Init {index + 1}</small>
                    <ChampInitiative valeur={valeur} textConfig={textConfig} onChange={(next) => changerValeur(participant.id, index, next)} />
                    {champs.length > 1 && <button className="small-btn subtle-danger" onClick={() => retirerAction(participant.id, index)} type="button">x</button>}
                  </label>)}
                  {multipleActionSlots && <button className="small-btn add-roll-slot" onClick={() => ajouterAction(participant.id)} type="button">+ action</button>}
                </div>
              </div>}
            </div>;
          })}
        </div>
      </section>)}
    </div>
  </section>;
}

export function FenetreLancerInitiatives({ participants = [], reserve = [], initiativeTextOrder, initiativeEnabled = true, multipleActionSlots = true, categoryOrder = [], prefillExisting = false, surpriseSelectionEnabled = false, tiebreakerVisible = false, tiebreakerLabel = 'Départage', onFermer, onValider, onPasserHorsInitiative }) {
  const textConfig = useMemo(() => normalizeInitiativeTextOrder(initiativeTextOrder), [initiativeTextOrder]);
  const [inclureEnvironnements, setInclureEnvironnements] = useState(false);
  const candidats = useMemo(() => [...participants, ...reserve], [participants, reserve]);
  const candidatsAffiches = useMemo(() => filtrerParticipants(candidats, inclureEnvironnements), [candidats, inclureEnvironnements]);
  const [idsEnAttente, setIdsEnAttente] = useState(() => candidats.map((participant) => participant.id));
  const idsAffiches = useMemo(() => new Set(candidatsAffiches.map((participant) => participant.id)), [candidatsAffiches]);
  const participantsEnAttente = participants.filter((participant) => idsEnAttente.includes(participant.id) && idsAffiches.has(participant.id));
  const reserveEnAttente = reserve.filter((participant) => idsEnAttente.includes(participant.id) && idsAffiches.has(participant.id));
  const [valeurs, setValeurs] = useState(() => valeursInitiales(participants, reserve, multipleActionSlots, prefillExisting));
  const [departages, setDepartages] = useState(() => departagesInitiaux(candidats));
  const [surprisedIds, setSurprisedIds] = useState(() => new Set());
  const participantsActifsSansValeur = initiativeEnabled ? participantsEnAttente.filter((participant) => !champRempli(valeurs[participant.id])) : [];
  const participantsActifsAvecValeur = initiativeEnabled ? participantsEnAttente.filter((participant) => champRempli(valeurs[participant.id])) : participantsEnAttente;
  const reservistesAvecValeur = initiativeEnabled ? reserveEnAttente.filter((participant) => champRempli(valeurs[participant.id])) : [];
  const aValider = [...participantsActifsAvecValeur, ...reservistesAvecValeur];
  const saisiePartielle = participantsActifsAvecValeur.length > 0 && participantsActifsSansValeur.length > 0;
  const changerValeur = (id, index, valeur) => setValeurs((courant) => { const champs = Array.isArray(courant[id]) && courant[id].length ? courant[id] : ['']; return { ...courant, [id]: champs.map((champ, position) => position === index ? valeur : champ) }; });
  const changerDepartage = (id, valeur) => setDepartages((courant) => ({ ...courant, [id]: valeur }));
  const ajouterAction = (id) => setValeurs((courant) => { const champs = Array.isArray(courant[id]) && courant[id].length ? courant[id] : ['']; return { ...courant, [id]: [...champs, ''] }; });
  const retirerAction = (id, index) => setValeurs((courant) => { const champs = Array.isArray(courant[id]) && courant[id].length ? courant[id] : ['']; const suivants = champs.filter((_, position) => position !== index); return { ...courant, [id]: suivants.length ? suivants : [''] }; });
  const basculerSurpris = (id) => setSurprisedIds((courant) => { const suivants = new Set(courant); if (suivants.has(id)) suivants.delete(id); else suivants.add(id); return suivants; });
  const vider = () => setValeurs((courant) => ({ ...courant, ...valeursVides([...participantsEnAttente, ...reserveEnAttente], multipleActionSlots) }));
  const validerCourants = () => onValider(valeursRenseignees(aValider, valeurs, multipleActionSlots), [...surprisedIds], departagesRenseignes(aValider, departages));
  const appliquer = () => { if (aValider.length === 0) return; validerCourants(); setIdsEnAttente(participantsActifsSansValeur.map((participant) => participant.id)); setValeurs((courant) => ({ ...courant, ...valeursVides(aValider, multipleActionSlots) })); if (participantsActifsSansValeur.length === 0) onFermer(); };
  const ajouterEtConserverAutresInitiatives = () => { if (aValider.length === 0) return; validerCourants(); onFermer(); };
  const passerRestantsHorsInitiative = () => { onPasserHorsInitiative(participantsActifsSansValeur.map((participant) => participant.id)); onFermer(); };
  const appliquerEtPasserRestantsHorsInitiative = () => { if (aValider.length > 0) validerCourants(); passerRestantsHorsInitiative(); };
  const aucunCandidatAffiche = participantsEnAttente.length === 0 && reserveEnAttente.length === 0;
  const propsSection = { inclureEnvironnements, categoryOrder, valeurs, changerValeur, ajouterAction, retirerAction, textConfig, initiativeEnabled, multipleActionSlots, surpriseSelectionEnabled, surprisedIds, basculerSurpris, tiebreakerVisible, tiebreakerLabel, departages, changerDepartage };

  return <Fenetre title={initiativeEnabled ? 'Saisir les initiatives' : 'Préparer la surprise'} onClose={onFermer}>
    <div className="initiative-roll-panel">
      <div className="initiative-roll-toolbar manual-entry"><p className="muted compact-help">{!initiativeEnabled ? 'Choisis uniquement les personnages surpris avant de commencer.' : initiativeTextOrderEnabled(textConfig) ? 'Choisis les parties de l’initiative. Cadence calcule l’ordre sans afficher de score technique.' : 'Renseigne les valeurs au fur et à mesure. Les réservistes renseignés rejoignent l’initiative.'}</p><div className="row compact-toolbar-actions"><button className={`small-btn ${inclureEnvironnements ? 'selected-toggle' : ''}`} onClick={() => setInclureEnvironnements((valeur) => !valeur)}>{inclureEnvironnements ? 'Masquer env.' : 'Inclure env.'}</button>{initiativeEnabled && <button className="small-btn" onClick={vider}>Vider</button>}</div></div>
      {saisiePartielle && <div className="initiative-entry-warning">Certaines valeurs actives sont renseignées, d’autres non. Choisis quoi faire des champs vides.</div>}
      {aucunCandidatAffiche ? <p className="muted">Aucun personnage à renseigner.</p> : <><SectionSaisieInitiative titre="En initiative" participants={participantsEnAttente} {...propsSection} />{initiativeEnabled && reserveEnAttente.length > 0 && <details className="initiative-reserve-compact"><summary>Réserve · {reserveEnAttente.length}</summary><SectionSaisieInitiative titre="" participants={reserveEnAttente} {...propsSection} surpriseSelectionEnabled={false} /></details>}</>}
      <div className="initiative-actions"><div className="initiative-decision-actions"><BoutonChoixInitiative titre="Continuer" detail={saisiePartielle ? 'Valider, puis compléter les champs vides.' : initiativeEnabled ? 'Valider les valeurs renseignées.' : 'Commencer avec cette surprise.'} onClick={appliquer} disabled={aValider.length === 0} variant="primary-choice" />{saisiePartielle && <BoutonChoixInitiative titre="Conserver" detail="Valider et garder les autres initiatives." onClick={ajouterEtConserverAutresInitiatives} variant="keep-choice" />}{saisiePartielle && participantsActifsSansValeur.length > 0 && <BoutonChoixInitiative titre="Ignorer" detail="Valider et sortir les non renseignés." onClick={appliquerEtPasserRestantsHorsInitiative} variant="out-choice" />}</div>{participantsActifsSansValeur.length > 0 && aValider.length === 0 && idsEnAttente.length < candidats.length && <BoutonChoixInitiative titre="Ignorer" detail="Sortir les champs encore vides." onClick={passerRestantsHorsInitiative} variant="out-choice" />}<button className="initiative-cancel-action" onClick={onFermer}>Annuler</button></div>
    </div>
  </Fenetre>;
}
