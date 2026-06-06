import { toutLeMondeAJoueSouple as tousCreneauxSouplesJoues } from '../../actions/flexibleTurnState.js';
import { participantsPhase as participantsPhaseScene, phaseSuivanteDisponible as phaseSuivanteDisponibleScene, phasesAttendRelanceInitiative } from '../../actions/tempoState.js';
import { defaultCategoryOrder, defaultEqualityRule, defaultInitiativeOrder, temporalityModes } from '../../constants.js';
import { groupeEgalitePourParticipant, indexCreneauActif, ordreCreneauxClassique } from '../../domain/initiative.js';
import { initiativeCostSlotIsAboveThreshold, isInitiativeCostMode, isManualMultipleActionMode, rulesAllowMultipleSlots } from '../../domain/initiativeCost.js';
import { declarationStage, declarationStages, isDeclarationMode } from '../../domain/initiativeModes.js';

export function buildSceneUiState({ scene, active, blocked, nextStartsRound, nextClass, roundEffect }) {
  const temporaliteSouple = scene.temporalite === temporalityModes.FLEXIBLE;
  const temporalitePhases = scene.temporalite === temporalityModes.PHASES;
  const temporaliteDeclaration = isDeclarationMode(scene);
  const coutInitiativeActif = isInitiativeCostMode(scene);
  const creneauxManuelsActifs = isManualMultipleActionMode(scene);
  const horlogesBloquantesActives = scene.round >= 0 ? blocked : [];
  const stageDeclaration = temporaliteDeclaration ? declarationStage(scene) : '';
  const declarationEnDeclaration = temporaliteDeclaration && stageDeclaration === declarationStages.DECLARATION;
  const phaseAttendRelanceInitiative = temporalitePhases && phasesAttendRelanceInitiative(scene);
  const optionsInitiative = {
    categoryOrder: scene.categoryOrder || defaultCategoryOrder,
    equalityRule: scene.equalityRule || defaultEqualityRule,
    initiativeOrder: scene.initiativeOrder || defaultInitiativeOrder,
    initiativeTextOrder: scene.initiativeTextOrder,
    initiativeEnabled: !temporaliteSouple || scene.flexibleUseInitiative !== false,
    tiebreakerVisible: scene.tiebreakerVisible !== false,
    multipleActionSlots: rulesAllowMultipleSlots(scene),
  };
  const utiliserInitiative = optionsInitiative.initiativeEnabled;
  const phaseParticipants = temporalitePhases && !phaseAttendRelanceInitiative ? participantsPhaseScene(scene) : [];
  const phaseActiveId = temporalitePhases ? phaseParticipants.find((participant) => participant.id === scene.activeId)?.id || phaseParticipants[0]?.id || '' : scene.activeId;
  const phaseActive = temporalitePhases ? phaseParticipants.find((participant) => participant.id === phaseActiveId) || null : null;
  const phaseSuivanteDisponible = temporalitePhases && !phaseAttendRelanceInitiative && phaseSuivanteDisponibleScene(scene);
  const phaseEnFin = temporalitePhases && phaseParticipants.length > 0 && phaseActiveId === phaseParticipants.at(-1)?.id;
  const phaseDemarreNouveauRound = temporalitePhases && phaseEnFin && !phaseSuivanteDisponible;
  const toutLeMondeAJoueSouple = temporaliteSouple && tousCreneauxSouplesJoues(scene);
  const globalAutoTick = roundEffect === 'next' && !!scene.globalTracker?.enabled && !!scene.globalTracker?.auto;
  const creneauxClassiquesTous = !temporaliteSouple && !temporalitePhases ? ordreCreneauxClassique(scene.participants, optionsInitiative) : [];
  const creneauxClassiques = coutInitiativeActif ? creneauxClassiquesTous.filter((slot) => !slot.actionSlotPlayed && initiativeCostSlotIsAboveThreshold(scene, slot)) : creneauxClassiquesTous;
  const currentIndex = !temporaliteSouple && !temporalitePhases ? indexCreneauActif(scene, creneauxClassiques) : scene.participants.findIndex((participant) => participant.id === scene.activeId);
  const creneauClassiqueActif = creneauxClassiques[currentIndex] || null;
  const participantAjustementInitiative = temporalitePhases ? phaseActive : creneauClassiqueActif || active;
  const phaseCurrentIndex = phaseParticipants.findIndex((participant) => participant.id === phaseActiveId);
  const roundDepartScene = scene.surpriseRoundActive ? 0 : 1;
  const retourHistoriqueDisponible = Array.isArray(scene._turnHistory) && scene._turnHistory.length > 0;
  const retourPreparationVisible = scene.round >= 0 && !retourHistoriqueDisponible && (declarationEnDeclaration ? scene.round === roundDepartScene : temporaliteSouple ? (scene.historiqueSouple || []).length === 0 && scene.round === roundDepartScene : temporalitePhases ? scene.round === roundDepartScene && Number(scene.phase || 1) <= 1 && (phaseCurrentIndex <= 0 || !phaseParticipants.length) : scene.round === roundDepartScene && currentIndex <= 0);
  const retourPossible = scene.round < 0 ? false : retourHistoriqueDisponible || (declarationEnDeclaration ? scene.round === roundDepartScene : temporaliteSouple ? (scene.historiqueSouple || []).length > 0 || scene.round === scene.startRound : temporalitePhases ? phaseCurrentIndex > 0 || (scene.round === scene.startRound && Number(scene.phase || 1) <= 1 && (phaseCurrentIndex <= 0 || !phaseParticipants.length)) : scene.participants.length > 0 && (scene.round > 0 || currentIndex > 0));
  const participantsPourEgalites = temporalitePhases ? phaseParticipants : scene.participants;
  const idActifPourEgalites = temporalitePhases ? phaseActiveId : scene.activeId;
  const activeGroup = !temporaliteSouple && idActifPourEgalites ? groupeEgalitePourParticipant(participantsPourEgalites, idActifPourEgalites, optionsInitiative) : [];
  const attendRelanceInitiativeCout = coutInitiativeActif && scene.phaseRerollEachRound && scene.round >= 0 && !scene.activeId;
  const phaseVideAvecSuivante = temporalitePhases && !phaseParticipants.length && phaseSuivanteDisponible;
  const nextLabel = scene.round < 0 ? 'Commencer' : phaseAttendRelanceInitiative || attendRelanceInitiativeCout ? 'Saisir les initiatives' : declarationEnDeclaration ? 'Déclarer les actions' : temporaliteSouple ? toutLeMondeAJoueSouple ? 'Nouveau round' : 'Mode souple : choisir dans la liste' : blocked.length ? 'Résoudre l’horloge' : temporalitePhases ? phaseVideAvecSuivante ? 'Phase suivante' : !phaseParticipants.length ? 'Aucun participant actif' : phaseEnFin && phaseSuivanteDisponible ? 'Phase suivante' : phaseDemarreNouveauRound ? 'Nouveau round' : 'Participant suivant' : nextStartsRound ? 'Nouveau round' : 'Participant suivant';
  const classeSuivantEffective = scene.round < 0 ? 'next-round' : temporaliteSouple && toutLeMondeAJoueSouple ? 'next-round' : blocked.length ? 'blocked' : temporalitePhases ? phaseDemarreNouveauRound ? 'next-round' : phaseVideAvecSuivante || (phaseEnFin && phaseSuivanteDisponible) ? 'next-phase' : '' : nextClass;
  const suivantDesactive = scene.round < 0 ? false : declarationEnDeclaration ? scene.participants.length === 0 : (temporaliteSouple && !toutLeMondeAJoueSouple) || (temporalitePhases && !phaseParticipants.length && !phaseSuivanteDisponible) || attendRelanceInitiativeCout;
  const libelleBas = scene.round < 0 ? 'Commencer' : phaseAttendRelanceInitiative || attendRelanceInitiativeCout ? 'Initiatives à saisir' : declarationEnDeclaration ? 'Déclarer' : temporaliteSouple ? toutLeMondeAJoueSouple ? `Nouveau round - R${scene.round + 1}` : 'Choisir' : temporalitePhases ? phaseDemarreNouveauRound ? `Nouveau round - R${scene.round + 1}` : phaseVideAvecSuivante || (phaseEnFin && phaseSuivanteDisponible) ? 'Phase suivante' : `Suivant - P${scene.phase}` : nextStartsRound ? `Nouveau round - R${scene.round + 1}` : `Suivant - R${scene.round}`;

  return {
    temporaliteSouple,
    temporalitePhases,
    temporaliteDeclaration,
    coutInitiativeActif,
    creneauxManuelsActifs,
    horlogesBloquantesActives,
    stageDeclaration,
    declarationEnDeclaration,
    phaseAttendRelanceInitiative,
    optionsInitiative,
    utiliserInitiative,
    phaseParticipants,
    phaseActiveId,
    phaseActive,
    phaseSuivanteDisponible,
    phaseDemarreNouveauRound,
    toutLeMondeAJoueSouple,
    globalAutoTick,
    participantAjustementInitiative,
    retourPreparationVisible,
    retourPossible,
    activeGroup,
    attendRelanceInitiativeCout,
    nextLabel,
    classeSuivantEffective,
    suivantDesactive,
    libelleBas,
  };
}
