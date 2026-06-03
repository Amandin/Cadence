import { useState } from 'react';
import { defaultPhaseCount, phaseActionModes } from '../../constants.js';
import { initiativesActionParticipant } from '../../domain/initiative.js';
import { initiativeInputIsValid, initiativeValueForMode, normalizeInitiativeTextOrder } from '../../domain/initiativeTextOrder.js';
import { EtiquetteEtat, Fenetre } from '../commun/ComposantsCommuns.jsx';
import { IconeOeilMystiqueOuvert, IconeOeilMystiqueFerme } from '../icones/IconesOeilMystique.jsx';
import { ChampInitiative } from '../initiative/ChampInitiative.jsx';
import { EditeurPhasesParticipant, normaliserPhaseActions } from '../initiative/EditeurPhasesParticipant.jsx';
import { Suivi } from '../suivis/Suivi.jsx';
import { InfosRapides } from './InfosRapides.jsx';

function valeurNumerique(valeur, defaut = 0) {
  const nombre = Number(valeur);
  return Number.isFinite(nombre) ? nombre : defaut;
}

function FenetreInitiativesRapides({ participant, initiatives, initiativeTextOrder, phaseActionMode, phaseCount = defaultPhaseCount, multipleActionSlots = true, onFermer, onValider }) {
  const textConfig = normalizeInitiativeTextOrder(initiativeTextOrder);
  const modePhasesCochees = phaseActionMode === phaseActionModes.CHECKED;
  const [brouillon, setBrouillon] = useState(() => (multipleActionSlots ? initiatives : initiatives.slice(0, 1)).map(String));
  const [phaseActionsBrouillon, setPhaseActionsBrouillon] = useState(() => normaliserPhaseActions(Array.isArray(participant.phaseActions) ? participant.phaseActions : ['1'], phaseCount));
  const modifier = (index, valeur) => setBrouillon((courant) => courant.map((item, position) => position === index ? valeur : item));
  const ajouter = () => setBrouillon((courant) => [...courant, courant.at(-1) || '']);
  const retirer = (index) => setBrouillon((courant) => courant.length <= 1 ? courant : courant.filter((_, position) => position !== index));
  const valeurs = brouillon.map((valeur) => String(valeur ?? '').trim()).filter(Boolean);
  const valeursValides = valeurs.length > 0 && valeurs.every((valeur) => initiativeInputIsValid(valeur, textConfig));
  const valider = () => {
    if (!valeursValides) return;
    onValider(
      valeurs.map((valeur) => initiativeValueForMode(valeur, textConfig)),
      modePhasesCochees ? normaliserPhaseActions(phaseActionsBrouillon, phaseCount) : undefined,
    );
  };

  return (
    <Fenetre title={`Initiative - ${participant.name}`} onClose={onFermer}>
      <div className="stack">
        {brouillon.map((initiative, index) => (
          <div className="initiative-action-row" key={index}>
            <ChampInitiative label={`Initiative ${index + 1}`} valeur={initiative} textConfig={textConfig} onChange={(valeur) => modifier(index, valeur)} autoFocus={index === 0} />
            <button className="small-btn subtle-danger" type="button" onClick={() => retirer(index)} disabled={brouillon.length <= 1}>x</button>
          </div>
        ))}
        {multipleActionSlots && <button className="small-btn" type="button" onClick={ajouter}>+ action</button>}
        {modePhasesCochees && <EditeurPhasesParticipant phaseActions={phaseActionsBrouillon} phaseCount={phaseCount} onChange={setPhaseActionsBrouillon} />}
        <div className="grid2">
          <button className="primary" onClick={valider} disabled={!valeursValides}>Valider</button>
          <button className="small-btn" onClick={onFermer}>Annuler</button>
        </div>
      </div>
    </Fenetre>
  );
}

function MiniCompteurInitiative({ participant, departage, initiativeTextOrder, phaseActionMode, phaseCount, multipleActionSlots, tiebreakerVisible, onChangerInitiatives }) {
  const textConfig = normalizeInitiativeTextOrder(initiativeTextOrder);
  const initiatives = initiativesActionParticipant(participant, { initiativeTextOrder: textConfig, multipleActionSlots });
  const [edition, setEdition] = useState(false);
  const libelle = initiatives.join(' / ');
  const valeurDepartage = valeurNumerique(departage, 0);
  const afficherDepartage = tiebreakerVisible && valeurDepartage !== 0;

  return (
    <>
      <button className="mini-init-counter compact-init-display" onClick={() => setEdition(true)} aria-label="Modifier les initiatives">
        <small>Init</small>
        <strong>{libelle}{afficherDepartage && <em className="init-tiebreak">{valeurDepartage > 0 ? `+${valeurDepartage}` : valeurDepartage}</em>}</strong>
      </button>
      {edition && <FenetreInitiativesRapides participant={participant} initiatives={initiatives} initiativeTextOrder={initiativeTextOrder} phaseActionMode={phaseActionMode} phaseCount={phaseCount} multipleActionSlots={multipleActionSlots} onFermer={() => setEdition(false)} onValider={(valeurs, phaseActions) => { onChangerInitiatives(valeurs, phaseActions); setEdition(false); }} />}
    </>
  );
}

export function FicheParticipant({ participant, enInitiative, initiativeTextOrder, phaseActionMode, phaseCount = defaultPhaseCount, multipleActionSlots = true, utiliserInitiative = true, tiebreakerVisible = true, onFermer, onModifier, onChangerInitiatives, onRejoindreInitiative, onQuitterInitiative, onInfoRapide, onSuivi, onSupprimerSuivi, onAjouterEtat, onRetirerEtat, onNote }) {
  const basculerVisibilite = (suivi) => onSuivi(suivi.id, { ...suivi, visible: suivi.visible === false });
  const boutonOeil = (suivi) => {
    const visible = suivi.visible !== false;
    return <button className={`eye-toggle ${visible ? 'active' : 'inactive'}`} onClick={(event) => { event.stopPropagation(); basculerVisibilite(suivi); }} aria-label={visible ? 'Masquer sur la fichette' : 'Afficher sur la fichette'} title={visible ? 'Visible sur la fichette' : 'Masque sur la fichette'} type="button">{visible ? <IconeOeilMystiqueOuvert /> : <IconeOeilMystiqueFerme />}</button>;
  };

  return (
    <Fenetre title={participant.name} onClose={onFermer} className="character-sheet">
      <p>{participant.description}</p>
      <div className={`sheet-action-row ${enInitiative && utiliserInitiative ? '' : 'without-init-counter'}`}>
        <button className="primary" onClick={onModifier}>Modifier</button>
        {enInitiative && utiliserInitiative && <MiniCompteurInitiative participant={participant} departage={participant.departage} initiativeTextOrder={initiativeTextOrder} phaseActionMode={phaseActionMode} phaseCount={phaseCount} multipleActionSlots={multipleActionSlots} tiebreakerVisible={tiebreakerVisible} onChangerInitiatives={onChangerInitiatives} />}
        {enInitiative ? <button className="small-btn" onClick={onQuitterInitiative}>Quitter l'init</button> : <button className="small-btn join-init-wide" onClick={onRejoindreInitiative}>Rejoindre init</button>}
      </div>
      <InfosRapides stats={participant.stats || []} editable onChanger={onInfoRapide} />
      <h3>Suivis</h3>
      <div className="stack sheet-trackers">{participant.trackers.map((suivi) => <Suivi key={suivi.id} suivi={suivi} avantTitre={boutonOeil(suivi)} couleur={participant.color} onModifier={(suivant) => onSuivi(suivi.id, suivant)} onSupprimer={() => onSupprimerSuivi(suivi.id)} />)}</div>
      <h3>Etats</h3>
      <div className="statuses">{participant.statuses?.map((etat) => <EtiquetteEtat key={etat.id} etat={etat} onRetirer={() => onRetirerEtat(etat.id)} />)}<button className="small-btn" onClick={onAjouterEtat}>+ etat</button></div>
      <label className="field">Note<textarea value={participant.note || ''} onChange={(event) => onNote(event.target.value)} /></label>
    </Fenetre>
  );
}
