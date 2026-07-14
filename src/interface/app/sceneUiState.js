import { toutLeMondeAJoueSouple as tousCreneauxSouplesJoues } from '../../actions/flexibleTurnState.js';
import { participantsPhase as participantsPhaseScene, phaseSuivanteDisponible as phaseSuivanteDisponibleScene, phasesAttendRelanceInitiative } from '../../actions/tempoState.js';
import { defaultCategoryOrder, defaultEqualityRule, defaultInitiativeOrder, temporalityModes } from '../../constants.js';
import { groupeEgalitePourParticipant, indexCreneauActif, ordreCreneauxClassique } from '../../domain/initiative.js';
import { initiativeCostSlotIsAboveThreshold, isInitiativeCostMode, isManualMultipleActionMode, rulesAllowMultipleSlots } from '../../domain/initiativeCost.js';
import { declarationStage, declarationStages, isDeclarationMode } from '../../domain/initiativeModes.js';
import { t } from '../../i18n/index.js';

export function buildSceneUiState({ scene, active, blocked, nextStartsRound, nextClass, roundEffect }) {
  const enPreparation = scene.round < 0;
  const activeIdEffectif = enPreparation ? '' : scene.activeId;
  const activeEffectif = enPreparation ? null : active;
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
    multipleActionSlots: (participant) => rulesAllowMultipleSlots(scene, participant),
  };
  const utiliserInitiative = optionsInitiative.initiativeEnabled;
  const phaseParticipants = temporalitePhases && !phaseAttendRelanceInitiative ? participantsPhaseScene(scene) : [];
  const phaseActiveId = enPreparation ? '' : temporalitePhases ? phaseParticipants.find((participant) => participant.id === activeIdEffectif)?.id || phaseParticipants[0]?.id || '' : activeIdEffectif;
  const phaseActive = temporalitePhases ? phaseParticipants.find((participant) => participant.id === phaseActiveId) || null : null;
  const phaseSuivanteDisponible = temporalitePhases && !phaseAttendRelanceInitiative && phaseSuivanteDisponibleScene(scene);
  const phaseEnFin = temporalitePhases && phaseParticipants.length > 0 && phaseActiveId === phaseParticipants.at(-1)?.id;
  const phaseDemarreNouveauRound = temporalitePhases && phaseEnFin && !phaseSuivanteDisponible;
  const toutLeMondeAJoueSouple = temporaliteSouple && tousCreneauxSouplesJoues(scene);
  const globalAutoTick = roundEffect === 'next' && !!scene.globalTracker?.enabled && !!scene.globalTracker?.auto;
  const creneauxClassiquesTous = !temporaliteSouple && !temporalitePhases ? ordreCreneauxClassique(scene.participants, optionsInitiative) : [];
  const creneauxClassiques = coutInitiativeActif ? creneauxClassiquesTous.filter((slot) => !slot.actionSlotPlayed && initiativeCostSlotIsAboveThreshold(scene, slot)) : creneauxClassiquesTous;
  const currentIndex = enPreparation ? -1 : !temporaliteSouple && !temporalitePhases ? indexCreneauActif({ ...scene, activeId: activeIdEffectif }, creneauxClassiques) : scene.participants.findIndex((participant) => participant.id === activeIdEffectif);
  const creneauClassiqueActif = creneauxClassiques[currentIndex] || null;
  const participantAjustementInitiative = enPreparation ? null : temporalitePhases ? phaseActive : creneauClassiqueActif || activeEffectif;
  const phaseCurrentIndex = phaseParticipants.findIndex((participant) => participant.id === phaseActiveId);
  const roundDepartScene = scene.surpriseRoundActive ? 0 : 1;
  const retourHistoriqueDisponible = Array.isArray(scene._turnHistory) && scene._turnHistory.length > 0;
  const retourPreparationVisible = scene.round >= 0 && !retourHistoriqueDisponible && (declarationEnDeclaration ? scene.round === roundDepartScene : temporaliteSouple ? (scene.historiqueSouple || []).length === 0 && scene.round === roundDepartScene : temporalitePhases ? scene.round === roundDepartScene && Number(scene.phase || 1) <= 1 && (phaseCurrentIndex <= 0 || !phaseParticipants.length) : scene.round === roundDepartScene && currentIndex <= 0);
  const retourPossible = scene.round < 0 ? false : retourHistoriqueDisponible || (declarationEnDeclaration ? scene.round === roundDepartScene : temporaliteSouple ? (scene.historiqueSouple || []).length > 0 || scene.round === scene.startRound : temporalitePhases ? phaseCurrentIndex > 0 || (scene.round === scene.startRound && Number(scene.phase || 1) <= 1 && (phaseCurrentIndex <= 0 || !phaseParticipants.length)) : scene.participants.length > 0 && (scene.round > 0 || currentIndex > 0));
  const participantsPourEgalites = temporalitePhases ? phaseParticipants : scene.participants;
  const idActifPourEgalites = enPreparation ? '' : temporalitePhases ? phaseActiveId : activeIdEffectif;
  const activeGroup = !temporaliteSouple && idActifPourEgalites ? groupeEgalitePourParticipant(participantsPourEgalites, idActifPourEgalites, optionsInitiative) : [];
  const attendRelanceInitiativeCout = coutInitiativeActif && scene.phaseRerollEachRound && scene.round >= 0 && !scene.activeId;
  const phaseVideAvecSuivante = temporalitePhases && !phaseParticipants.length && phaseSuivanteDisponible;
  const nextLabel = scene.round < 0 ? t('scene.next.start') : phaseAttendRelanceInitiative || attendRelanceInitiativeCout ? t('scene.next.enterInitiatives') : declarationEnDeclaration ? t('scene.next.declareActions') : temporaliteSouple ? toutLeMondeAJoueSouple ? t('scene.next.newRound') : t('scene.next.flexibleChoose') : blocked.length ? t('scene.next.resolveClock') : temporalitePhases ? phaseVideAvecSuivante ? t('scene.next.nextPhase') : !phaseParticipants.length ? t('scene.next.noActiveParticipant') : phaseEnFin && phaseSuivanteDisponible ? t('scene.next.nextPhase') : phaseDemarreNouveauRound ? t('scene.next.newRound') : t('scene.next.nextParticipant') : nextStartsRound ? t('scene.next.newRound') : t('scene.next.nextParticipant');
  const classeSuivantEffective = scene.round < 0 ? 'next-round' : temporaliteSouple && toutLeMondeAJoueSouple ? 'next-round' : blocked.length ? 'blocked' : temporalitePhases ? phaseDemarreNouveauRound ? 'next-round' : phaseVideAvecSuivante || (phaseEnFin && phaseSuivanteDisponible) ? 'next-phase' : '' : nextClass;
  const suivantDesactive = scene.round < 0 ? false : declarationEnDeclaration ? scene.participants.length === 0 : (temporaliteSouple && !toutLeMondeAJoueSouple) || (temporalitePhases && !phaseParticipants.length && !phaseSuivanteDisponible) || attendRelanceInitiativeCout;
  const libelleBas = scene.round < 0 ? t('scene.next.start') : phaseAttendRelanceInitiative || attendRelanceInitiativeCout ? t('scene.bottom.enterInitiatives') : declarationEnDeclaration ? t('scene.bottom.declare') : temporaliteSouple ? toutLeMondeAJoueSouple ? t('scene.bottom.newRound', { round: scene.round + 1 }) : t('scene.bottom.choose') : temporalitePhases ? phaseDemarreNouveauRound ? t('scene.bottom.newRound', { round: scene.round + 1 }) : phaseVideAvecSuivante || (phaseEnFin && phaseSuivanteDisponible) ? t('scene.next.nextPhase') : t('scene.bottom.nextPhase', { phase: scene.phase }) : nextStartsRound ? t('scene.bottom.newRound', { round: scene.round + 1 }) : t('scene.bottom.nextRound', { round: scene.round });

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
