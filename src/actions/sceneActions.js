import { activationAdvancePolicies, temporalityModes } from '../constants.js';
import { indexCreneauActif, ordreCreneauxClassique, premierCreneauClassique, trierParInitiative } from '../domain/initiative.js';
import { declarationStage, declarationStages, isCheckedPhaseMode, normalizeDeclarations, setDeclaration } from '../domain/initiativeModes.js';
import { stepAutoGlobalTracker } from '../domain/globalTracker.js';
import { createStatus, createSurprisedStatus } from '../domain/statuses.js';
import { clone, isBoxesTracker, isNumericTracker, resetAutoTrackers, resetTracker, tickParticipant, tickStatuses, triggerActivation, untickParticipant, untickStatuses } from '../logic.js';
import { ajouterJoueSouple, annulerDernierJoueSouple, retirerHistoriqueSouple, retirerJoueSouple, toutLeMondeAJoueSouple } from './flexibleTurnState.js';
import { actionSlotsDepuisInitiatives, addPreInitiativeRestorePoint, addRestorePoint, createBlankParticipant, initiativesRenseignees, optionsTri, placerEnReserve, valeurInitiativeRenseignee } from './sceneSupport.js';
import {
  appliquerDebutNouveauRound,
  appliquerNouveauRoundPhases,
  appliquerNouveauRoundSouple,
  estModeDeclaration,
  estModePhases,
  estModeSouple,
  phaseSuivante,
  participantsPhase,
  phaseSuivanteDisponible,
  premierePhaseDisponible,
  premierParticipantPhase,
  trouverTourActifParInitiative,
} from './tempoState.js';

function modifierParticipantDansScene(scene, participantId, updater) {
  const participants = trierParInitiative(scene.participants.map((p) => p.id === participantId ? updater(p) : p), optionsTri(scene));
  const slots = ordreCreneauxClassique(participants, optionsTri(scene));
  const activeSlot = slots.find((slot) => slot.actionSlotId === scene.activeSlotId) || slots.find((slot) => slot.id === scene.activeId);
  const { activeId, activeSlotId, nouveauRound } = estModeSouple(scene) || estModePhases(scene)
    ? { activeId: scene.activeId, activeSlotId: scene.activeSlotId || '', nouveauRound: false }
    : trouverTourActifParInitiative(scene, participants);
  const sceneSuivante = {
    ...scene,
    participants,
    activeId,
    activeSlotId: activeSlotId || activeSlot?.actionSlotId || '',
    reserve: (scene.reserve || []).map((p) => p.id === participantId ? placerEnReserve(updater(p)) : placerEnReserve(p)),
  };

  return nouveauRound ? appliquerDebutNouveauRound(sceneSuivante, activeId) : sceneSuivante;
}

function recalerActifPhaseSiBesoin(scene) {
  return estModePhases(scene) && !participantsPhase(scene).some((participant) => participant.id === scene.activeId)
    ? { ...scene, activeId: premierParticipantPhase(scene) }
    : scene;
}

function roundDepart(scene) {
  return 1;
}

function demarrerTempsReelScene(compteur) {
  if (!compteur?.enabled || !['stopwatch', 'timer'].includes(compteur.mode)) return compteur;
  return { ...compteur, running: true, startedAt: Date.now(), elapsedMs: 0 };
}

function arreterTempsReelScene(compteur) {
  if (!compteur?.enabled || !['stopwatch', 'timer'].includes(compteur.mode)) return compteur;
  return { ...compteur, running: false, startedAt: null, elapsedMs: 0 };
}

function reinitialiserDeclarationRound(scene) {
  if (!estModeDeclaration(scene)) return scene;
  return {
    ...scene,
    activeId: '',
    activeSlotId: '',
    declarationStage: declarationStages.DECLARATION,
    declarations: {},
    resolutionOrder: [],
    declarationPlayedIds: [],
  };
}

function marquerDeclarationJoue(scene, participantId) {
  if (!estModeDeclaration(scene) || declarationStage(scene) !== declarationStages.RESOLUTION || !participantId) return scene;
  return { ...scene, declarationPlayedIds: [...new Set([...(scene.declarationPlayedIds || []), String(participantId)])] };
}

function retirerDeclarationJoue(scene, participantId) {
  if (!estModeDeclaration(scene) || !participantId) return scene;
  return { ...scene, declarationPlayedIds: (scene.declarationPlayedIds || []).filter((id) => id !== String(participantId)) };
}

function appliquerDebutRoundInitial(scene) {
  const sceneAvecEtats = tickSceneRoundStatuses(scene);
  return {
    ...sceneAvecEtats,
    round: roundDepart(sceneAvecEtats),
    globalTracker: demarrerTempsReelScene(stepAutoGlobalTracker(sceneAvecEtats.globalTracker, 1)),
    participants: (sceneAvecEtats.participants || []).map((participant) => tickParticipant(resetAutoTrackers(participant, 'round'), 'round')),
    reserve: (sceneAvecEtats.reserve || []).map((participant) => tickParticipant(resetAutoTrackers(participant, 'round'), 'round')).map(placerEnReserve),
  };
}

function demarrerScene(scene) {
  const sceneInitiale = appliquerDebutRoundInitial(scene);
  if (estModeDeclaration(scene)) {
    if (estModeSouple(scene)) return reinitialiserDeclarationRound({ ...sceneInitiale, jouesSouples: [], historiqueSouple: [] });
    if (estModePhases(scene)) {
      const scenePreteBase = { ...sceneInitiale, phase: 1, activeId: '', activeSlotId: '' };
      const scenePrete = { ...scenePreteBase, phase: premierePhaseDisponible(scenePreteBase) };
      return reinitialiserDeclarationRound(scenePrete);
    }
    const participants = trierParInitiative(sceneInitiale.participants || [], optionsTri(sceneInitiale));
    return reinitialiserDeclarationRound({ ...sceneInitiale, participants });
  }
  if (estModeSouple(scene)) return { ...sceneInitiale, activeId: '', activeSlotId: '', jouesSouples: [], historiqueSouple: [] };
  if (estModePhases(scene)) {
    const scenePreteBase = { ...sceneInitiale, phase: 1 };
    const scenePrete = { ...scenePreteBase, phase: premierePhaseDisponible(scenePreteBase) };
    const activeId = !isCheckedPhaseMode(scenePrete) && scenePrete.phaseRerollEachRound ? '' : premierParticipantPhase(scenePrete);
    const sceneActive = { ...scenePrete, activeId, activeSlotId: '', participants: (scenePrete.participants || []).map((participant) => ({ ...participant, _activationAutomationsDone: false })) };
    return { ...sceneActive, participants: sceneActive.participants.map((participant) => triggerActivationScene(sceneActive, participant, activeId)) };
  }
  const participants = trierParInitiative(sceneInitiale.participants || [], optionsTri(sceneInitiale));
  const premierCreneau = premierCreneauClassique(participants, optionsTri(sceneInitiale));
  const sceneActive = { ...sceneInitiale, participants, activeId: premierCreneau?.id || participants[0]?.id || scene.activeId, activeSlotId: premierCreneau?.actionSlotId || '' };
  return { ...sceneActive, participants: sceneActive.participants.map((participant) => triggerActivationScene(sceneActive, participant, sceneActive.activeId)) };
}

function remettreEnPreparation(scene) {
  return {
    ...scene,
    round: -1,
    phase: 1,
    activeId: '',
    activeSlotId: '',
    declarationStage: estModeDeclaration(scene) ? declarationStages.DECLARATION : '',
    declarations: estModeDeclaration(scene) ? {} : scene.declarations || {},
    resolutionOrder: estModeDeclaration(scene) ? [] : scene.resolutionOrder || [],
    declarationPlayedIds: estModeDeclaration(scene) ? [] : scene.declarationPlayedIds || [],
    globalTracker: arreterTempsReelScene(scene.globalTracker),
    jouesSouples: [],
    historiqueSouple: [],
    reserve: (scene.reserve || []).map(placerEnReserve),
    _turnHistory: [],
  };
}

function resetSuivi(suivi) {
  return resetTracker(suivi);
}

function resetSuivisParticipant(participant) {
  return { ...participant, trackers: (participant.trackers || []).map(resetSuivi) };
}

function effacerEtatsParticipant(participant) {
  return { ...participant, statuses: [] };
}

function tickSceneRoundStatuses(scene) {
  return { ...scene, statuses: tickStatuses(scene.statuses, 'round') };
}

function untickSceneRoundStatuses(scene) {
  return { ...scene, statuses: untickStatuses(scene.statuses, 'round') };
}

function triggerActivationScene(scene, participant, activeId) {
  if (participant.id !== activeId) return participant;
  const cible = scene.activationAdvancePolicy === activationAdvancePolicies.EVERY_ACTION
    ? { ...participant, _activationAutomationsDone: false }
    : participant;
  return triggerActivation(cible);
}

function preparerParticipantPhases(scene, participant) {
  if (!estModePhases(scene) || !isCheckedPhaseMode(scene) || Array.isArray(participant.phaseActions)) return participant;
  return { ...participant, phaseActions: ['1'] };
}

function departageRenseigne(departagesById, participantId) {
  const valeur = departagesById?.[participantId];
  if (String(valeur ?? '').trim() === '') return {};
  const nombre = Number(valeur);
  return Number.isFinite(nombre) ? { departage: nombre } : {};
}

function appliquerInitiativesRenseignees(scene, valuesById, departagesById = {}) {
  const participantsMisAJour = (scene.participants || []).map((participant) => {
    const initiatives = initiativesRenseignees(valuesById, participant.id);
    const departage = departageRenseigne(departagesById, participant.id);
    if (!initiatives) return { ...participant, ...departage };
    const actionSlots = actionSlotsDepuisInitiatives(initiatives, scene.multipleActionSlots !== false);
    return { ...participant, ...departage, initiative: actionSlots[0]?.initiative ?? participant.initiative, actionSlots };
  });
  const reserveJointe = [];
  const reserve = (scene.reserve || []).flatMap((participant) => {
    const initiatives = initiativesRenseignees(valuesById, participant.id);
    const participantAvecDepartage = { ...participant, ...departageRenseigne(departagesById, participant.id) };
    if (!initiatives) return [placerEnReserve(participantAvecDepartage)];
    const actionSlots = actionSlotsDepuisInitiatives(initiatives, scene.multipleActionSlots !== false);
    reserveJointe.push(preparerParticipantPhases(scene, { ...participantAvecDepartage, initiative: actionSlots[0]?.initiative ?? 0, actionSlots }));
    return [];
  });
  const participants = trierParInitiative([...participantsMisAJour, ...reserveJointe], optionsTri(scene));
  const sceneAvecParticipantsBase = { ...scene, participants, reserve, phase: estModePhases(scene) ? 1 : scene.phase || 1 };
  const sceneAvecParticipants = estModePhases(scene) ? { ...sceneAvecParticipantsBase, phase: premierePhaseDisponible(sceneAvecParticipantsBase) } : sceneAvecParticipantsBase;
  const premierCreneau = premierCreneauClassique(participants, optionsTri(sceneAvecParticipants));
  const attendDeclarations = estModeDeclaration(scene) && declarationStage(scene) === declarationStages.DECLARATION;
  return {
    ...sceneAvecParticipants,
    activeId: attendDeclarations ? '' : estModeSouple(scene) ? '' : estModePhases(scene) ? participantsPhase(sceneAvecParticipants)[0]?.id || '' : premierCreneau?.id || participants[0]?.id || '',
    activeSlotId: attendDeclarations || estModeSouple(scene) || estModePhases(scene) ? '' : premierCreneau?.actionSlotId || '',
    jouesSouples: [],
    historiqueSouple: [],
  };
}

function appliquerSurpriseInitiale(scene, surprisedIds = []) {
  const ids = new Set(surprisedIds);
  if (!scene.preparationSurprise || ids.size === 0) return scene;
  return {
    ...scene,
    participants: (scene.participants || []).map((participant) => ids.has(participant.id)
      ? { ...participant, statuses: [...(participant.statuses || []), createSurprisedStatus(scene.surpriseImpact, { advanceOn: scene.surpriseAdvanceOn, skipNextAdvance: true })] }
      : participant),
  };
}

const TURN_HISTORY_LIMIT = 40;

function sceneSansHistorique(scene = {}) {
  const { _turnHistory, ...rest } = scene;
  return rest;
}

function empilerRetourTour(sceneAvant, sceneApres) {
  const historique = Array.isArray(sceneAvant._turnHistory) ? sceneAvant._turnHistory : [];
  return {
    ...sceneApres,
    _turnHistory: [...historique.slice(-(TURN_HISTORY_LIMIT - 1)), clone(sceneSansHistorique(sceneAvant))],
  };
}

function depilerRetourTour(scene) {
  const historique = Array.isArray(scene._turnHistory) ? scene._turnHistory : [];
  const precedente = historique.at(-1);
  if (!precedente) return null;
  return { ...clone(precedente), _turnHistory: historique.slice(0, -1) };
}

function restaurerPreparationDepuisHistorique(scene) {
  const historique = Array.isArray(scene._turnHistory) ? scene._turnHistory : [];
  for (let index = historique.length - 1; index >= 0; index -= 1) {
    if (historique[index].round < 0) return { ...clone(historique[index]), _turnHistory: historique.slice(0, index) };
  }
  return remettreEnPreparation(scene);
}

export function createSceneActions({ scene, sceneIndex, blocked, restorePoints, setScenes, setRestorePoints, setRoundEffect }) {
  const updateScene = (updater) => setScenes((list) => list.map((s, i) => i === sceneIndex ? updater(s) : s));
  const addStartRestorePoints = (points, sceneBeforeInitiative, nextScene) => addRestorePoint(addPreInitiativeRestorePoint(points, sceneBeforeInitiative.id, sceneBeforeInitiative), sceneBeforeInitiative.id, nextScene);
  const updateParticipant = (id, updater) => updateScene((s) => {
    const nextScene = modifierParticipantDansScene(s, id, updater);
    if (nextScene.round > s.round) {
      setRoundEffect('next');
      setRestorePoints((points) => addRestorePoint(points, s.id, nextScene));
    }
    return nextScene;
  });

  return {
    updateParticipant,
    updateCategoryOrder(categoryOrder) {
      updateScene((s) => ({
        ...s,
        categoryOrder,
        participants: trierParInitiative(s.participants || [], { ...optionsTri(s), categoryOrder }),
      }));
    },
    updateEqualityRule(equalityRule) {
      updateScene((s) => ({
        ...s,
        equalityRule,
        participants: trierParInitiative(s.participants || [], { ...optionsTri(s), equalityRule }),
      }));
    },
    updateTemporality(temporalite) {
      setRoundEffect(null);
      updateScene((s) => recalerActifPhaseSiBesoin({
        ...s,
        temporalite,
        phase: temporalite === temporalityModes.PHASES ? (s.phase || 1) : 1,
        activeId: temporalite === temporalityModes.FLEXIBLE || (estModeDeclaration(s) && declarationStage(s) === declarationStages.DECLARATION) ? '' : s.activeId,
        activeSlotId: temporalite === temporalityModes.CLASSIC ? (premierCreneauClassique(s.participants || [], optionsTri(s))?.actionSlotId || s.activeSlotId || '') : '',
        reserve: (s.reserve || []).map(placerEnReserve),
        jouesSouples: temporalite === temporalityModes.FLEXIBLE ? (s.jouesSouples || []) : [],
        historiqueSouple: temporalite === temporalityModes.FLEXIBLE ? (s.historiqueSouple || []) : [],
        declarationStage: estModeDeclaration(s) ? declarationStage(s) : '',
        declarations: estModeDeclaration(s) ? (s.declarations || {}) : {},
        resolutionOrder: estModeDeclaration(s) ? (s.resolutionOrder || []) : [],
        declarationPlayedIds: estModeDeclaration(s) ? (s.declarationPlayedIds || []) : [],
      }));
    },
    updatePhaseDecrement(phaseDecrement) {
      const valeur = Math.max(1, Number(phaseDecrement) || 10);
      setRoundEffect(null);
      updateScene((s) => ({ ...s, phaseDecrement: valeur, activeId: estModePhases(s) ? participantsPhase({ ...s, phaseDecrement: valeur })[0]?.id || '' : s.activeId }));
    },
    updatePhaseRerollEachRound(phaseRerollEachRound) {
      updateScene((s) => ({ ...s, phaseRerollEachRound: !!phaseRerollEachRound }));
    },
    setActiveParticipant(activeId) {
      updateScene((s) => ({ ...s, activeId, activeSlotId: '' }));
    },
    applyInitiativeRolls(valuesById, departagesById = {}) {
      setRoundEffect(null);
      updateScene((s) => appliquerInitiativesRenseignees(s, valuesById, departagesById));
    },
    startSceneWithInitiatives(valuesById, surprisedIds = [], departagesById = {}) {
      setRoundEffect('next');
      updateScene((s) => {
        const sceneReglesCourantes = {
          ...s,
          preparationSurprise: scene.preparationSurprise,
          surpriseImpact: scene.surpriseImpact,
          surpriseAdvanceOn: scene.surpriseAdvanceOn,
        };
        const sceneAvecInitiatives = appliquerInitiativesRenseignees(sceneReglesCourantes, valuesById, departagesById);
        const nextScene = demarrerScene(appliquerSurpriseInitiale(sceneAvecInitiatives, surprisedIds));
        if (nextScene.round >= 0) setRestorePoints((points) => addStartRestorePoints(points, s, nextScene));
        return empilerRetourTour(s, nextScene);
      });
    },
    updateDeclaration(participantId, value) {
      updateScene((s) => setDeclaration(s, participantId, value));
    },
    applyDeclarationChoices(declarations = {}) {
      setRoundEffect(null);
      updateScene((s) => {
        const declarationsNormalisees = normalizeDeclarations(declarations, s.participants || []);
        const slots = ordreCreneauxClassique(s.participants || [], optionsTri(s));
        const premierCreneau = slots[0] || null;
        const sceneAvecDeclarations = {
          ...s,
          declarations: declarationsNormalisees,
          declarationStage: declarationStages.RESOLUTION,
          declarationPlayedIds: [],
          resolutionOrder: slots.map((slot) => slot.actionSlotId || slot.id),
        };
        const sceneAvecMode = estModePhases(sceneAvecDeclarations)
          ? { ...sceneAvecDeclarations, phase: premierePhaseDisponible(sceneAvecDeclarations) }
          : sceneAvecDeclarations;
        const activeId = estModeSouple(sceneAvecMode) ? '' : estModePhases(sceneAvecMode) ? premierParticipantPhase(sceneAvecMode) : premierCreneau?.id || '';
        const activeSlotId = estModeSouple(sceneAvecMode) || estModePhases(sceneAvecMode) ? '' : premierCreneau?.actionSlotId || '';
        const nextScene = { ...sceneAvecMode, activeId, activeSlotId };
        return empilerRetourTour(s, {
          ...nextScene,
          participants: (nextScene.participants || []).map((participant) => triggerActivationScene(nextScene, participant, nextScene.activeId)),
        });
      });
    },
    moveParticipantsToReserve(ids = []) {
      const idsSet = new Set(ids);
      if (idsSet.size === 0) return;
      updateScene((s) => {
        const sortants = (s.participants || []).filter((participant) => idsSet.has(participant.id)).map(placerEnReserve);
        const participants = (s.participants || []).filter((participant) => !idsSet.has(participant.id));
        const sceneSuivante = {
          ...s,
          participants,
          reserve: [...(s.reserve || []).map(placerEnReserve), ...sortants],
          activeId: idsSet.has(s.activeId) ? participants[0]?.id || '' : s.activeId,
          activeSlotId: idsSet.has(s.activeId) ? '' : s.activeSlotId || '',
          jouesSouples: (s.jouesSouples || []).filter((id) => !idsSet.has(id.split(':')[0])),
          historiqueSouple: (s.historiqueSouple || []).filter((id) => !idsSet.has(id.split(':')[0])),
        };
        return recalerActifPhaseSiBesoin(sceneSuivante);
      });
    },
    markFlexiblePlayed(participantId) {
      updateScene((s) => {
        const { scene: sceneAvecJoue, slotId } = ajouterJoueSouple(s, participantId);
        if (!slotId) return s;
        return empilerRetourTour(s, {
          ...marquerDeclarationJoue(sceneAvecJoue, participantId),
          activeId: participantId,
          activeSlotId: slotId || '',
          participants: (sceneAvecJoue.participants || []).map((participant) => triggerActivationScene(sceneAvecJoue, participant, participantId)),
          historiqueSouple: slotId ? [...(s.historiqueSouple || []), slotId] : (s.historiqueSouple || []),
        });
      });
    },
    unmarkFlexiblePlayed(participantId) {
      updateScene((s) => ({
        ...retirerDeclarationJoue(s, participantId),
        activeId: participantId,
        activeSlotId: '',
        jouesSouples: retirerJoueSouple(s, participantId),
        historiqueSouple: retirerHistoriqueSouple(s, participantId),
      }));
    },
    undoFlexibleTurn() {
      updateScene((s) => {
        const precedente = depilerRetourTour(s);
        if (precedente) return precedente;
        const nextScene = annulerDernierJoueSouple(s);
        return retirerDeclarationJoue(nextScene, nextScene.activeId);
      });
    },
    restoreScene(pointId) {
      const point = (restorePoints[scene.id] || []).find((item) => item.id === pointId);
      if (!point) return;
      setRoundEffect(null);
      updateScene(() => clone(point.scene));
    },
    returnToPreparation() {
      setRoundEffect(null);
      updateScene(restaurerPreparationDepuisHistorique);
    },
    advanceRound() {
      setRoundEffect('next');
      updateScene((s) => {
        if (s.round < 0) {
          const nextScene = demarrerScene(s);
          if (nextScene.round >= 0) setRestorePoints((points) => addStartRestorePoints(points, s, nextScene));
          return empilerRetourTour(s, nextScene);
        }
        const sceneDeBase = s;
        const premierCreneau = premierCreneauClassique(sceneDeBase.participants || [], optionsTri(sceneDeBase));
        const nextScene = estModeSouple(sceneDeBase)
          ? appliquerNouveauRoundSouple(sceneDeBase)
          : estModePhases(sceneDeBase)
            ? appliquerNouveauRoundPhases(sceneDeBase)
            : appliquerDebutNouveauRound(sceneDeBase, premierCreneau?.id || sceneDeBase.activeId || '');
        const nextSceneAvecDeclaration = reinitialiserDeclarationRound(nextScene);
        setRestorePoints((points) => addRestorePoint(points, s.id, nextSceneAvecDeclaration));
        return empilerRetourTour(s, nextSceneAvecDeclaration);
      });
    },
    resetSceneTrackers() {
      updateScene((s) => ({
        ...s,
        globalTracker: s.globalTracker ? { ...s.globalTracker, current: 0, total: 0, loops: 0, running: false, startedAt: null, elapsedMs: 0 } : s.globalTracker,
        participants: (s.participants || []).map(resetSuivisParticipant),
        reserve: (s.reserve || []).map(resetSuivisParticipant).map(placerEnReserve),
      }));
    },
    clearSceneStatuses() {
      updateScene((s) => ({
        ...s,
        statuses: [],
        participants: (s.participants || []).map(effacerEtatsParticipant),
        reserve: (s.reserve || []).map(effacerEtatsParticipant).map(placerEnReserve),
      }));
    },
    deleteParticipant(id) {
      updateScene((s) => recalerActifPhaseSiBesoin({
        ...s,
        participants: s.participants.filter((p) => p.id !== id),
        reserve: (s.reserve || []).filter((p) => p.id !== id).map(placerEnReserve),
        activeId: s.activeId === id ? s.participants.find((p) => p.id !== id)?.id || '' : s.activeId,
        activeSlotId: s.activeId === id ? '' : s.activeSlotId || '',
        jouesSouples: retirerJoueSouple(s, id),
        historiqueSouple: retirerHistoriqueSouple(s, id),
      }));
    },
    trackerChange(pid, tid, next) {
      updateParticipant(pid, (p) => ({ ...p, trackers: p.trackers.map((t) => t.id === tid ? next : t) }));
    },
    deleteTracker(pid, tid) {
      updateParticipant(pid, (p) => ({ ...p, trackers: p.trackers.filter((t) => t.id !== tid) }));
    },
    addStatus(pid, data) {
      const status = createStatus(data);
      if (status) updateParticipant(pid, (p) => ({ ...p, statuses: [...(p.statuses || []), status] }));
    },
    removeStatus(pid, sid) {
      updateParticipant(pid, (p) => ({ ...p, statuses: (p.statuses || []).filter((s) => s.id !== sid) }));
    },
    addSceneStatus(data) {
      const status = createStatus({ ...data, advanceOn: data.advanceOn || 'round' });
      if (status) updateScene((s) => ({ ...s, statuses: [...(s.statuses || []), status] }));
    },
    removeSceneStatus(sid) {
      updateScene((s) => ({ ...s, statuses: (s.statuses || []).filter((status) => status.id !== sid) }));
    },
    nextTurn(direction = 1) {
      if (direction < 0 && Array.isArray(scene._turnHistory) && scene._turnHistory.length > 0) {
        setRoundEffect(null);
        updateScene((s) => depilerRetourTour(s) || s);
        return;
      }

      if (direction > 0 && scene.round < 0) {
        setRoundEffect('next');
        updateScene((s) => {
          const nextScene = demarrerScene(s);
          if (nextScene.round >= 0) setRestorePoints((points) => addStartRestorePoints(points, s, nextScene));
          return empilerRetourTour(s, nextScene);
        });
        return;
      }

      if (estModeDeclaration(scene) && declarationStage(scene) === declarationStages.DECLARATION) {
        if (direction < 0 && scene.round === roundDepart(scene)) {
          setRoundEffect(null);
          updateScene(remettreEnPreparation);
        }
        return;
      }

      if (estModeSouple(scene)) {
        if (direction < 0) {
          if ((scene.historiqueSouple || []).length === 0 && scene.round === roundDepart(scene)) updateScene(remettreEnPreparation);
          else updateScene(annulerDernierJoueSouple);
        }
        if (direction > 0 && !blocked.length && toutLeMondeAJoueSouple(scene)) {
          setRoundEffect('next');
          updateScene((s) => {
            const nextScene = reinitialiserDeclarationRound(appliquerNouveauRoundSouple(s));
            setRestorePoints((points) => addRestorePoint(points, s.id, nextScene));
            return empilerRetourTour(s, nextScene);
          });
        }
        return;
      }

      if (estModePhases(scene)) {
        const phaseParticipants = participantsPhase(scene);
        if (direction < 0 && !phaseParticipants.length && scene.round === roundDepart(scene) && (scene.phase || 1) <= 1) {
          setRoundEffect(null);
          updateScene(remettreEnPreparation);
          return;
        }
        const avancerPhaseSuivante = () => {
          setRoundEffect(null);
          updateScene((s) => {
            const phase = phaseSuivante(s);
            const nextParticipants = participantsPhase({ ...s, phase });
            const activeId = nextParticipants[0]?.id || '';
            const nextScene = marquerDeclarationJoue({ ...s, phase, activeId, activeSlotId: '', participants: (s.participants || []).map((participant) => triggerActivationScene(s, participant, activeId)) }, s.activeId);
            return empilerRetourTour(s, nextScene);
          });
        };
        if (!phaseParticipants.length) {
          if (direction > 0 && phaseSuivanteDisponible(scene)) avancerPhaseSuivante();
          return;
        }
        const currentIndex = phaseParticipants.findIndex((p) => p.id === scene.activeId);
        if (currentIndex < 0) {
          setRoundEffect(null);
          updateScene((s) => ({ ...s, activeId: phaseParticipants[0]?.id || s.activeId }));
          return;
        }
        if (direction < 0) {
          if (scene.round === roundDepart(scene) && (scene.phase || 1) <= 1 && currentIndex <= 0) {
            setRoundEffect(null);
            updateScene(remettreEnPreparation);
            return;
          }
          const previousIndex = Math.max(0, currentIndex - 1);
          setRoundEffect(null);
          updateScene((s) => retirerDeclarationJoue({ ...s, activeId: phaseParticipants[previousIndex]?.id || s.activeId }, phaseParticipants[previousIndex]?.id));
          return;
        }
        const nextIndex = currentIndex + 1;
        if (nextIndex < phaseParticipants.length) {
          setRoundEffect(null);
          updateScene((s) => empilerRetourTour(s, marquerDeclarationJoue({ ...s, activeId: phaseParticipants[nextIndex].id, activeSlotId: '', participants: (s.participants || []).map((participant) => triggerActivationScene(s, participant, phaseParticipants[nextIndex].id)) }, s.activeId)));
          return;
        }
        if (blocked.length) return;
        if (phaseSuivanteDisponible(scene)) {
          avancerPhaseSuivante();
          return;
        }
        setRoundEffect('next');
        updateScene((s) => {
          const nextScene = reinitialiserDeclarationRound(appliquerNouveauRoundPhases(s));
          setRestorePoints((points) => addRestorePoint(points, s.id, nextScene));
          return empilerRetourTour(s, nextScene);
        });
        return;
      }

      const slots = ordreCreneauxClassique(scene.participants || [], optionsTri(scene));
      if (!slots.length) return;

      const currentIndex = Math.max(0, indexCreneauActif(scene, slots));
      const nextIndex = direction > 0
        ? (currentIndex + 1) % slots.length
        : (currentIndex - 1 + slots.length) % slots.length;

      if (direction < 0) {
        if (scene.round === roundDepart(scene) && currentIndex <= 0) {
          setRoundEffect(null);
          updateScene(remettreEnPreparation);
          return;
        }
        const roundDelta = currentIndex === 0 ? -1 : 0;
        setRoundEffect(null);
        updateScene((s) => {
          const scenePrecedente = {
            ...s,
            activeId: slots[nextIndex].id,
            activeSlotId: slots[nextIndex].actionSlotId,
            round: Math.max(0, s.round + roundDelta),
            globalTracker: roundDelta < 0 ? stepAutoGlobalTracker(s.globalTracker, -1) : s.globalTracker,
            statuses: roundDelta < 0 ? untickSceneRoundStatuses(s).statuses : s.statuses,
            participants: s.participants.map((p) => {
              const afterRound = roundDelta < 0 ? untickParticipant(p, 'round') : p;
              const currentSlot = slots[currentIndex];
              const earlierCurrentSlot = slots.slice(0, currentIndex).some((slot) => slot.id === currentSlot.id);
              return p.id === currentSlot.id && !earlierCurrentSlot ? untickParticipant(afterRound, 'activation') : afterRound;
            }),
            reserve: roundDelta < 0 ? (s.reserve || []).map((participant) => untickParticipant(participant, 'round')).map(placerEnReserve) : (s.reserve || []).map(placerEnReserve),
          };
          return retirerDeclarationJoue(scenePrecedente, slots[nextIndex].id);
        });
        return;
      }

      if (blocked.length) return;

      const roundDelta = currentIndex >= slots.length - 1 ? 1 : 0;

      setRoundEffect(roundDelta > 0 ? 'next' : null);
      updateScene((s) => {
        const sceneAvecEtats = roundDelta > 0 ? tickSceneRoundStatuses(s) : s;
        const nextSceneBase = {
          ...sceneAvecEtats,
          activeId: slots[nextIndex].id,
          activeSlotId: slots[nextIndex].actionSlotId,
          round: Math.max(1, sceneAvecEtats.round + roundDelta),
          globalTracker: roundDelta > 0 ? stepAutoGlobalTracker(sceneAvecEtats.globalTracker, 1) : sceneAvecEtats.globalTracker,
          participants: sceneAvecEtats.participants.map((p) => {
            const afterRound = roundDelta > 0 ? tickParticipant(resetAutoTrackers(p, 'round'), 'round') : p;
            return triggerActivationScene(sceneAvecEtats, afterRound, slots[nextIndex].id);
          }),
          reserve: roundDelta > 0 ? (sceneAvecEtats.reserve || []).map((participant) => tickParticipant(resetAutoTrackers(participant, 'round'), 'round')).map(placerEnReserve) : (sceneAvecEtats.reserve || []).map(placerEnReserve),
        };
        const nextScene = roundDelta > 0 ? reinitialiserDeclarationRound(nextSceneBase) : marquerDeclarationJoue(nextSceneBase, slots[currentIndex].id);

        if (roundDelta > 0) setRestorePoints((points) => addRestorePoint(points, s.id, nextScene));
        return empilerRetourTour(s, nextScene);
      });
    },
    leaveInit(id) {
      const participant = scene.participants.find((x) => x.id === id);
      if (!participant) return;

      updateScene((s) => recalerActifPhaseSiBesoin({
        ...s,
        participants: s.participants.filter((x) => x.id !== id),
        reserve: [...(s.reserve || []).map(placerEnReserve), placerEnReserve(participant)],
        activeId: s.activeId === id ? s.participants.find((x) => x.id !== id)?.id || '' : s.activeId,
        activeSlotId: s.activeId === id ? '' : s.activeSlotId || '',
        jouesSouples: retirerJoueSouple(s, id),
        historiqueSouple: retirerHistoriqueSouple(s, id),
      }));
    },
    activateParticipantNow(id) {
      updateScene((s) => {
        const participant = s.participants.find((item) => item.id === id);
        if (!participant) return s;
        const slot = ordreCreneauxClassique(s.participants || [], optionsTri(s)).find((item) => item.id === id);
        const sceneActive = { ...s, activeId: id, activeSlotId: estModePhases(s) ? '' : slot?.actionSlotId || '' };
        return empilerRetourTour(s, {
          ...sceneActive,
          participants: sceneActive.participants.map((item) => triggerActivationScene(sceneActive, item, id)),
        });
      });
    },
    joinInit(id, initiativeValue) {
      const participant = scene.reserve.find((x) => x.id === id);
      const initiative = String(initiativeValue ?? '').trim();
      if (!participant || !initiative) return;

      updateScene((s) => {
        const actionSlots = actionSlotsDepuisInitiatives([initiative], s.multipleActionSlots !== false);
        const participantActif = preparerParticipantPhases(s, { ...participant, initiative: actionSlots[0]?.initiative ?? initiative, actionSlots });
        const participants = trierParInitiative([...s.participants, participantActif], optionsTri(s));
        return recalerActifPhaseSiBesoin({
          ...s,
          reserve: s.reserve.filter((x) => x.id !== id).map(placerEnReserve),
          participants,
          activeId: s.activeId || participantActif.id,
        });
      });
    },
    addParticipant(participant = createBlankParticipant(), placement = 'init') {
      if (placement === 'reserve') {
        updateScene((s) => ({ ...s, reserve: [...(s.reserve || []).map(placerEnReserve), placerEnReserve(participant)] }));
        return;
      }
      updateScene((s) => recalerActifPhaseSiBesoin({
        ...s,
        participants: trierParInitiative([...s.participants, preparerParticipantPhases(s, participant)], optionsTri(s)),
        activeId: s.activeId || participant.id,
        activeSlotId: s.activeId ? s.activeSlotId || '' : premierCreneauClassique([participant], optionsTri(s))?.actionSlotId || '',
        reserve: (s.reserve || []).map(placerEnReserve),
      }));
    },
  };
}
