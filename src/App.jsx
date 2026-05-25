import { useEffect, useRef, useState } from 'react';
import { toutLeMondeAJoueSouple as tousCreneauxSouplesJoues } from './actions/flexibleTurnState.js';
import { participantsPhase as participantsPhaseScene, phaseSuivanteDisponible as phaseSuivanteDisponibleScene, phasesAttendRelanceInitiative } from './actions/tempoState.js';
import { defaultCategoryOrder, defaultEqualityRule, defaultInitiativeOrder, temporalityModes } from './constants.js';
import { groupeEgalitePourParticipant, indexCreneauActif, ordreCreneauxClassique } from './domain/initiative.js';
import { declarationStage, declarationStages, isCheckedPhaseMode, isDeclarationMode } from './domain/initiativeModes.js';
import { initiativeMatchesMode, initiativeTextOrderEnabled } from './domain/initiativeTextOrder.js';
import { FenetresSuperposees } from './interface/app/FenetresSuperposees.jsx';
import { HubCampagne } from './interface/campaign/HubCampagne.jsx';
import { Fenetre } from './interface/commun/ComposantsCommuns.jsx';
import { FenetreAjustementInitiative } from './interface/dialogues/FenetreAjustementInitiative.jsx';
import { FenetreDeclarationActions } from './interface/dialogues/FenetreDeclarationActions.jsx';
import { FenetreEtat } from './interface/dialogues/FenetreEtat.jsx';
import { FenetreExportCampagne } from './interface/dialogues/FenetreExportCampagne.jsx';
import { FenetreEditionFiche } from './interface/fiches/FenetreEditionFiche.jsx';
import { BarreActionBas } from './interface/scene/BarreActionBas.jsx';
import { EnteteScene } from './interface/scene/EnteteScene.jsx';
import { ListeInitiative } from './interface/scene/ListeInitiative.jsx';
import { ReserveHorsInitiative } from './interface/scene/ReserveHorsInitiative.jsx';
import { useCampaign } from './hooks/useCampaign.js';
import { useCharacterInteractions } from './hooks/useCharacterInteractions.js';
import { useTemplates } from './hooks/useTemplates.js';
import { createBlankParticipant } from './templates.js';

function initiativesDeclarees(participant = {}, multipleActionSlots = true) {
  const slots = Array.isArray(participant.actionSlots) && participant.actionSlots.length
    ? participant.actionSlots
    : [{ initiative: participant.initiative }];
  return (multipleActionSlots ? slots : slots.slice(0, 1)).map((slot) => slot?.initiative ?? participant.initiative);
}

function participantsInitiativeIncompatible(scene = {}) {
  return (scene.participants || []).filter((participant) => initiativesDeclarees(participant, scene.multipleActionSlots !== false).some((initiative) => !initiativeMatchesMode(initiative, scene.initiativeTextOrder)));
}

function modeInitiative(scene = {}) {
  return initiativeTextOrderEnabled(scene.initiativeTextOrder) ? 'labels' : 'valeurs numeriques';
}

function FenetreInitiativesIncompatibles({ participants, scene, onChanger, onSortir }) {
  const noms = participants.map((participant) => participant.name).join(', ');
  return (
    <Fenetre title="Initiatives a corriger" onClose={() => {}} header={<div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}><h2 style={{ margin: 0 }}>Initiatives a corriger</h2></div>}>
      <div className="stack">
        <p className="muted compact-help">Cette scene utilise maintenant les {modeInitiative(scene)}. Ces initiatives ne correspondent plus : {noms}.</p>
        <div className="grid2">
          <button className="primary" type="button" onClick={onChanger}>Changer les initiatives</button>
          <button className="danger-btn" type="button" onClick={onSortir}>Sortir de l'initiative</button>
        </div>
      </div>
    </Fenetre>
  );
}

export default function App() {
  const campaign = useCampaign();
  const { scenes, templateStore, setTemplateStore, campaignName, scene, restorePoints, dark, active, blocked, nextStartsRound, nextClass, roundEffect, actions } = campaign;
  const characters = useCharacterInteractions(scene, actions);
  const templates = useTemplates(templateStore, setTemplateStore);
  const [currentView, setCurrentView] = useState('hub');
  const [openMenu, setOpenMenu] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [notice, setNotice] = useState(null);
  const [clockModalOpen, setClockModalOpen] = useState(false);
  const [globalSheetOpen, setGlobalSheetOpen] = useState(false);
  const [initiativeEntryOpen, setInitiativeEntryOpen] = useState(false);
  const [initiativeEntryScopeIds, setInitiativeEntryScopeIds] = useState(null);
  const [initiativeAdjustOpen, setInitiativeAdjustOpen] = useState(false);
  const [initiativeMismatch, setInitiativeMismatch] = useState(null);
  const [declarationActionsOpen, setDeclarationActionsOpen] = useState(false);
  const [pendingNextAfterInitiativeAdjust, setPendingNextAfterInitiativeAdjust] = useState(false);
  const [templateTarget, setTemplateTarget] = useState(null);
  const [editingTemplateId, setEditingTemplateId] = useState('');
  const [templateError, setTemplateError] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [timerDoneOpen, setTimerDoneOpen] = useState(false);
  const [sceneStatusOpen, setSceneStatusOpen] = useState(false);
  const previousRoundRef = useRef(scene.round);
  const declarationAutoOpenRef = useRef('');
  const timerDoneRef = useRef(false);
  const skipInitiativeAdjustPromptRef = useRef(false);

  const temporaliteSouple = scene.temporalite === temporalityModes.FLEXIBLE;
  const temporalitePhases = scene.temporalite === temporalityModes.PHASES;
  const temporaliteDeclaration = isDeclarationMode(scene);
  const stageDeclaration = temporaliteDeclaration ? declarationStage(scene) : '';
  const declarationEnDeclaration = temporaliteDeclaration && stageDeclaration === declarationStages.DECLARATION;
  const phaseAttendRelanceInitiative = temporalitePhases && phasesAttendRelanceInitiative(scene);
  const optionsInitiative = {
    categoryOrder: scene.categoryOrder || defaultCategoryOrder,
    equalityRule: scene.equalityRule || defaultEqualityRule,
    initiativeOrder: scene.initiativeOrder || defaultInitiativeOrder,
    initiativeTextOrder: scene.initiativeTextOrder,
    multipleActionSlots: scene.multipleActionSlots !== false,
  };

  const phaseParticipants = temporalitePhases && !phaseAttendRelanceInitiative
    ? participantsPhaseScene(scene)
    : [];
  const phaseActiveId = temporalitePhases ? phaseParticipants.find((participant) => participant.id === scene.activeId)?.id || '' : scene.activeId;
  const phaseActive = temporalitePhases ? phaseParticipants.find((participant) => participant.id === phaseActiveId) || null : null;
  const phaseSuivanteDisponible = temporalitePhases && !phaseAttendRelanceInitiative && phaseSuivanteDisponibleScene(scene);
  const phaseEnFin = temporalitePhases && phaseParticipants.length > 0 && phaseActiveId === phaseParticipants.at(-1)?.id;
  const phaseDemarreNouveauRound = temporalitePhases && phaseEnFin && !phaseSuivanteDisponible;
  const toutLeMondeAJoueSouple = temporaliteSouple && tousCreneauxSouplesJoues(scene);
  const globalAutoTick = roundEffect === 'next' && !!scene.globalTracker?.enabled && !!scene.globalTracker?.auto;
  const creneauxClassiques = !temporaliteSouple && !temporalitePhases ? ordreCreneauxClassique(scene.participants, optionsInitiative) : [];
  const currentIndex = !temporaliteSouple && !temporalitePhases ? indexCreneauActif(scene, creneauxClassiques) : scene.participants.findIndex((participant) => participant.id === scene.activeId);
  const creneauClassiqueActif = creneauxClassiques[currentIndex] || null;
  const participantAjustementInitiative = temporalitePhases ? phaseActive : creneauClassiqueActif || active;
  const phaseCurrentIndex = phaseParticipants.findIndex((participant) => participant.id === phaseActiveId);
  const libelleRoundCourant = scene.round === 0 ? 'Surprise' : `R${scene.round}`;
  const roundDepartScene = [0, 1].includes(Number(scene.startRound)) ? Number(scene.startRound) : 0;
  const retourPreparationVisible = scene.round >= 0 && (declarationEnDeclaration ? scene.round === roundDepartScene : temporaliteSouple ? (scene.historiqueSouple || []).length === 0 && scene.round === roundDepartScene : temporalitePhases ? scene.round === roundDepartScene && Number(scene.phase || 1) <= 1 && (phaseCurrentIndex <= 0 || !phaseParticipants.length) : scene.round === roundDepartScene && currentIndex <= 0);
  const retourPossible = scene.round < 0 ? false : declarationEnDeclaration ? scene.round === roundDepartScene : temporaliteSouple ? (scene.historiqueSouple || []).length > 0 || scene.round === scene.startRound : temporalitePhases ? phaseCurrentIndex > 0 || (scene.round === scene.startRound && Number(scene.phase || 1) <= 1 && (phaseCurrentIndex <= 0 || !phaseParticipants.length)) : scene.participants.length > 0 && (scene.round > 0 || currentIndex > 0);

  const participantsPourEgalites = temporalitePhases ? phaseParticipants : scene.participants;
  const idActifPourEgalites = temporalitePhases ? phaseActiveId : scene.activeId;
  const activeGroup = !temporaliteSouple && idActifPourEgalites ? groupeEgalitePourParticipant(participantsPourEgalites, idActifPourEgalites, optionsInitiative) : [];
  const editingTemplate = editingTemplateId ? templates.getTemplate(editingTemplateId) : null;

  useEffect(() => {
    if (currentView !== 'scene' || !scene.activeId) return;
    const element = document.querySelector(`[data-participant-id="${scene.activeId}"]`);
    element?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentView, scene.activeId]);

  useEffect(() => {
    if (currentView !== 'scene' || initiativeEntryOpen || initiativeMismatch) return;
    const incompatibles = participantsInitiativeIncompatible(scene);
    if (incompatibles.length) setInitiativeMismatch({ sceneId: scene.id, ids: incompatibles.map((participant) => participant.id) });
  }, [currentView, initiativeEntryOpen, initiativeMismatch, scene]);

  useEffect(() => {
    if (clockModalOpen && blocked.length === 0) setClockModalOpen(false);
  }, [blocked.length, clockModalOpen]);

  useEffect(() => {
    const roundAvant = previousRoundRef.current;
    previousRoundRef.current = scene.round;
    if (currentView === 'scene' && scene.round > roundAvant && scene.temporalite === temporalityModes.PHASES && phasesAttendRelanceInitiative(scene)) setInitiativeEntryOpen(true);
  }, [currentView, scene.phaseRerollEachRound, scene.round, scene.temporalite]);

  useEffect(() => {
    const clef = `${scene.id}:${scene.round}:${stageDeclaration}`;
    if (
      currentView === 'scene'
      && temporaliteDeclaration
      && declarationEnDeclaration
      && scene.round >= 0
      && scene.participants.length > 0
      && !phaseAttendRelanceInitiative
      && !initiativeEntryOpen
      && !initiativeMismatch
      && declarationAutoOpenRef.current !== clef
    ) {
      declarationAutoOpenRef.current = clef;
      setDeclarationActionsOpen(true);
    }
  }, [currentView, declarationEnDeclaration, initiativeEntryOpen, initiativeMismatch, phaseAttendRelanceInitiative, scene.id, scene.participants.length, scene.round, stageDeclaration, temporaliteDeclaration]);

  useEffect(() => {
    const compteur = scene.globalTracker;
    if (scene.round < 0 || !compteur?.enabled || compteur.mode !== 'timer') { timerDoneRef.current = false; return undefined; }
    const duree = Math.max(1, Number(compteur.max || 60)) * 1000;
    const verifier = () => {
      const elapsed = Math.max(0, Number(compteur.elapsedMs || 0)) + (compteur.running && compteur.startedAt ? Math.max(0, Date.now() - Number(compteur.startedAt)) : 0);
      if (elapsed < duree) { timerDoneRef.current = false; return; }
      if (timerDoneRef.current) return;
      timerDoneRef.current = true;
      actions.updateGlobalTracker({ running: false, startedAt: null, elapsedMs: duree });
      setTimerDoneOpen(true);
    };
    verifier();
    if (!compteur.running) return undefined;
    const id = window.setInterval(verifier, 500);
    return () => window.clearInterval(id);
  }, [actions, scene.globalTracker, scene.round]);

  const nextTurn = (direction) => {
    if (direction < 0 && !retourPossible) return;
    if (temporaliteSouple && direction > 0 && !toutLeMondeAJoueSouple) return;
    if (temporalitePhases && direction > 0 && !phaseParticipants.length && !phaseSuivanteDisponible) return;
    if (direction > 0 && blocked.length) { setClockModalOpen(true); return; }
    if (direction > 0 && declarationEnDeclaration && scene.round >= 0 && scene.participants.length > 0) {
      setDeclarationActionsOpen(true);
      return;
    }
    if (direction > 0 && scene.promptInitiativeOnNext && !declarationEnDeclaration && !temporaliteSouple && !(temporalitePhases && isCheckedPhaseMode(scene)) && scene.round >= 0 && participantAjustementInitiative && !skipInitiativeAdjustPromptRef.current) {
      setInitiativeAdjustOpen(true);
      return;
    }
    skipInitiativeAdjustPromptRef.current = false;
    actions.nextTurn(direction);
  };

  useEffect(() => {
    if (!pendingNextAfterInitiativeAdjust) return;
    setPendingNextAfterInitiativeAdjust(false);
    skipInitiativeAdjustPromptRef.current = true;
    nextTurn(1);
  }, [pendingNextAfterInitiativeAdjust, scene.participants]);

  const validerAjustementInitiative = (valeur) => {
    if (participantAjustementInitiative && String(valeur ?? '').trim()) actions.adjustParticipantInitiative(participantAjustementInitiative.id, valeur, participantAjustementInitiative.actionSlotId || '');
    setInitiativeAdjustOpen(false);
    setPendingNextAfterInitiativeAdjust(true);
  };
  const passerAjustementInitiative = () => {
    setInitiativeAdjustOpen(false);
    skipInitiativeAdjustPromptRef.current = true;
    nextTurn(1);
  };

  const marquerAJoue = (participantId) => actions.markFlexiblePlayed(participantId);
  const annulerAJoue = (participantId) => actions.unmarkFlexiblePlayed(participantId);
  const openAddCharacter = () => { setOpenMenu(false); setAddSheetOpen(true); };
  const openInitiativeEntry = () => { setOpenMenu(false); setInitiativeEntryScopeIds(null); setInitiativeEntryOpen(true); };
  const createBlankCharacter = (options) => { characters.addCharacter(createBlankParticipant(), options); setAddSheetOpen(false); };
  const createFromTemplate = (templateId, options = { placement: 'reserve' }) => { const participant = templates.createParticipantFromTemplate(templateId); if (!participant) return; characters.addCharacter(participant, options); setAddSheetOpen(false); };
  const newScene = () => { actions.newScene(); setOpenMenu(false); };
  const chooseScene = (index) => {
    const cible = scenes[index];
    const incompatibles = participantsInitiativeIncompatible(cible);
    actions.setSceneIndex(index);
    setCurrentView('scene');
    setInitiativeMismatch(incompatibles.length ? { sceneId: cible?.id, ids: incompatibles.map((participant) => participant.id) } : null);
  };
  const importCampaign = async (file) => { const result = await actions.importCampaign(file); if (result?.ok === false) { setNotice({ title: 'Import impossible', message: result.message || 'Le fichier n’a pas pu être lu. Essaie avec un export .cad récent, et note le nom du fichier si le problème revient.' }); return; } setOpenMenu(false); characters.closeCharacterPanels(); setCurrentView('hub'); setNotice({ title: 'Import terminé', message: 'La campagne a bien été chargée.' }); };
  const importTemplatesFromCampaign = async (file) => { const result = await actions.importTemplatesFromCampaign(file); if (result?.ok === false) { setNotice({ title: 'Import impossible', message: result.message }); return; } setNotice({ title: 'Templates importés', message: `${result.added} ajouté(s), ${result.skipped} ignoré(s) car déjà présents.` }); };
  const createTemplateInCategory = (category) => { const template = templates.createTemplateInCategory(category); if (template) setEditingTemplateId(template.id); };
  const addTemplateCategory = (category) => { const result = templates.addCategory(category); if (result?.ok === false) setNotice({ title: 'Catégorie impossible', message: result.message }); return result; };
  const renameTemplateCategory = (category, nextName) => { const result = templates.renameCategory(category, nextName); if (result?.ok === false) setNotice({ title: 'Renommage impossible', message: result.message }); return result; };
  const deleteTemplateCategory = (category) => { const result = templates.deleteCategory(category); if (result?.ok === false) setNotice({ title: 'Suppression impossible', message: result.message }); return result; };
  const duplicateTemplate = (templateId) => { const duplicate = templates.duplicateTemplate(templateId); if (duplicate) setEditingTemplateId(duplicate.id); };
  const saveEditedTemplate = (participant) => { if (!editingTemplateId) return; templates.updateTemplateParticipant(editingTemplateId, participant, editingTemplate.category); setEditingTemplateId(''); };
  const deleteEditedTemplate = () => { if (!editingTemplateId) return; templates.deleteTemplate(editingTemplateId); setEditingTemplateId(''); };
  const resetDemo = () => { actions.resetDemo(); setOpenMenu(false); characters.closeCharacterPanels(); setCurrentView('hub'); };
  const restoreScene = (pointId) => { actions.restoreScene(pointId); setOpenMenu(false); characters.closeCharacterPanels(); };
  const returnToPreparation = () => { actions.returnToPreparation(); setOpenMenu(false); characters.closeCharacterPanels(); };
  const advanceRound = () => { actions.advanceRound(); setOpenMenu(false); characters.closeCharacterPanels(); };
  const resetSceneTrackers = () => { actions.resetSceneTrackers(); setOpenMenu(false); characters.closeCharacterPanels(); };
  const clearSceneStatuses = () => { actions.clearSceneStatuses(); setOpenMenu(false); characters.closeCharacterPanels(); };
  const toggleGlobalRealtime = () => { const compteur = scene.globalTracker; if (scene.round < 0) return; if (!['stopwatch', 'timer'].includes(compteur?.mode)) return; const elapsed = Math.max(0, Number(compteur.elapsedMs || 0)) + (compteur.running && compteur.startedAt ? Math.max(0, Date.now() - Number(compteur.startedAt)) : 0); actions.updateGlobalTracker(compteur.running ? { running: false, startedAt: null, elapsedMs: elapsed } : { running: true, startedAt: Date.now() }); };
  const restartTimer = () => { actions.updateGlobalTracker({ running: true, startedAt: Date.now(), elapsedMs: 0 }); timerDoneRef.current = false; setTimerDoneOpen(false); };
  const resetTimer = () => { actions.updateGlobalTracker({ running: false, startedAt: null, elapsedMs: 0 }); timerDoneRef.current = false; setTimerDoneOpen(false); };
  const openTimerMenu = () => { setTimerDoneOpen(false); setOpenMenu(true); };
  const exportCampaign = async (name) => { try { const result = await actions.exportCampaign(name); if (result?.ok) setNotice({ title: 'Export terminé', message: 'La campagne a bien été exportée.' }); if (result?.ok === false && !result.cancelled) setNotice({ title: 'Export impossible', message: result.message || 'Le navigateur a refusé l’enregistrement. Réessaie depuis Opera ou choisis un autre emplacement.' }); return result; } catch (error) { setNotice({ title: 'Export impossible', message: `Le navigateur a interrompu l’export : ${error?.message || 'erreur inconnue'}.` }); return { ok: false, message: error?.message }; } };
  const openTemplateSave = (participant) => { setTemplateTarget(participant); setTemplateError(null); };
  const saveTemplate = (data) => { if (!templateTarget) return; const result = templates.saveParticipantAsTemplate(templateTarget, data); if (!result.ok) { setTemplateError({ kind: result.kind, message: result.message }); return; } setTemplateTarget(null); setTemplateError(null); setNotice({ title: result.overwritten ? 'Template remplacé' : 'Template enregistré', message: `${result.template.name} est disponible dans la catégorie ${result.template.category}.` }); };
  const findClock = (participantId, trackerId) => { const participant = [...scene.participants, ...(scene.reserve || [])].find((item) => item.id === participantId); return participant?.trackers.find((item) => item.id === trackerId); };
  const resetClock = (participantId, trackerId) => { const tracker = findClock(participantId, trackerId); if (!tracker) return; actions.trackerChange(participantId, trackerId, { ...tracker, current: 0 }); };
  const deleteClock = (participantId, trackerId) => actions.deleteTracker(participantId, trackerId);
  const participantsIncompatibles = initiativeMismatch?.sceneId === scene.id
    ? scene.participants.filter((participant) => initiativeMismatch.ids.includes(participant.id))
    : [];
  const changerInitiativesIncompatibles = () => {
    setInitiativeEntryScopeIds(initiativeMismatch?.ids || null);
    setInitiativeMismatch(null);
    setInitiativeEntryOpen(true);
  };
  const sortirInitiativesIncompatibles = () => {
    actions.moveParticipantsToReserve(initiativeMismatch?.ids || []);
    setInitiativeMismatch(null);
  };
  const fermerSaisieInitiatives = () => {
    setInitiativeEntryOpen(false);
    setInitiativeEntryScopeIds(null);
  };
  const validerActionsDeclarees = (declarations) => {
    actions.applyDeclarationChoices(declarations);
    setDeclarationActionsOpen(false);
  };

  const phaseVideAvecSuivante = temporalitePhases && !phaseParticipants.length && phaseSuivanteDisponible;
  const nextLabel = scene.round < 0 ? 'Commencer' : phaseAttendRelanceInitiative ? 'Saisir les initiatives' : declarationEnDeclaration ? 'Déclarer les actions' : temporaliteSouple ? toutLeMondeAJoueSouple ? 'Nouveau round' : 'Mode souple : choisir dans la liste' : blocked.length ? 'Gérer horloge bloquante' : temporalitePhases ? phaseVideAvecSuivante ? 'Phase suivante' : !phaseParticipants.length ? 'Aucun participant actif' : phaseEnFin && phaseSuivanteDisponible ? 'Phase suivante' : phaseDemarreNouveauRound ? 'Nouveau round' : 'Participant suivant' : nextStartsRound ? 'Nouveau round' : 'Participant suivant';
  const classeSuivantEffective = scene.round < 0 ? 'next-round' : temporaliteSouple && toutLeMondeAJoueSouple ? 'next-round' : blocked.length ? 'blocked' : temporalitePhases ? phaseDemarreNouveauRound ? 'next-round' : phaseVideAvecSuivante || (phaseEnFin && phaseSuivanteDisponible) ? 'next-phase' : '' : nextClass;
  const suivantDesactive = scene.round < 0 ? false : declarationEnDeclaration ? scene.participants.length === 0 : (temporaliteSouple && !toutLeMondeAJoueSouple) || (temporalitePhases && !phaseParticipants.length && !phaseSuivanteDisponible);
  const libelleBas = scene.round < 0 ? 'Commencer' : phaseAttendRelanceInitiative ? 'Init requise' : declarationEnDeclaration ? 'Déclarer' : temporaliteSouple ? toutLeMondeAJoueSouple ? `Nouveau round · R${scene.round + 1}` : 'Choisir' : temporalitePhases ? phaseDemarreNouveauRound ? `Nouveau round · R${scene.round + 1}` : phaseVideAvecSuivante || (phaseEnFin && phaseSuivanteDisponible) ? 'Phase suivante' : `Suivant · P${scene.phase}` : nextStartsRound ? `Nouveau round · R${scene.round + 1}` : `Suivant · ${libelleRoundCourant}`;

  const fenetresCommunes = <>
    <FenetresSuperposees campaignName={campaignName} scene={scene} restorePoints={restorePoints} dark={dark} characters={characters} templates={templates} actions={actions} etatInterface={{ addSheetOpen, openMenu: currentView === 'scene' && openMenu, notice, globalSheetOpen, clockModalOpen, initiativeEntryOpen: currentView === 'scene' && initiativeEntryOpen, initiativeEntryScopeIds }} commandesInterface={{ ouvrirAjoutPersonnage: openAddCharacter, ouvrirSaisieInitiatives: openInitiativeEntry, ouvrirHubCampagne: () => setCurrentView('hub'), ouvrirCompteurGlobal: () => setGlobalSheetOpen(true), ouvrirEtatScene: () => setSceneStatusOpen(true), fermerAjoutPersonnage: () => setAddSheetOpen(false), fermerMenu: () => setOpenMenu(false), fermerNotice: () => setNotice(null), fermerCompteurGlobal: () => setGlobalSheetOpen(false), fermerResolutionHorloge: () => setClockModalOpen(false), fermerSaisieInitiatives, ouvrirSauvegardeTemplate: openTemplateSave, creerPersonnageVierge: createBlankCharacter, creerDepuisTemplate: createFromTemplate, restaurerScene: restoreScene, retourPreparation: returnToPreparation, avancerRound: advanceRound, resetSuivisScene: resetSceneTrackers, effacerEtatsScene: clearSceneStatuses }} compteurGlobal={{ horlogesBloquantes: blocked }} resolutionHorloge={{ resetClock, deleteClock }} templatesUi={{ templateTarget, templateError, fermerSauvegardeTemplate: () => setTemplateTarget(null), enregistrerTemplate: saveTemplate }} />
    {initiativeAdjustOpen && participantAjustementInitiative && <FenetreAjustementInitiative participant={participantAjustementInitiative} valeurInitiale={participantAjustementInitiative.initiative} initiativeTextOrder={scene.initiativeTextOrder} onFermer={() => setInitiativeAdjustOpen(false)} onValider={validerAjustementInitiative} onPasser={passerAjustementInitiative} />}
    {declarationActionsOpen && <FenetreDeclarationActions scene={scene} optionsInitiative={optionsInitiative} onFermer={() => setDeclarationActionsOpen(false)} onValider={validerActionsDeclarees} />}
    {participantsIncompatibles.length > 0 && <FenetreInitiativesIncompatibles scene={scene} participants={participantsIncompatibles} onChanger={changerInitiativesIncompatibles} onSortir={sortirInitiativesIncompatibles} />}
    {exportOpen && <FenetreExportCampagne nomInitial={campaignName} onFermer={() => setExportOpen(false)} onExporter={exportCampaign} />}
    {timerDoneOpen && <Fenetre title="Minuteur terminé" onClose={() => setTimerDoneOpen(false)}><div className="stack"><p className="muted compact-help">Le minuteur est arrivé à zéro.</p><div className="grid2"><button className="primary" onClick={restartTimer}>Relancer</button><button className="small-btn" onClick={resetTimer}>Reset</button></div><button className="small-btn" onClick={openTimerMenu}>Ouvrir le menu</button></div></Fenetre>}
    {editingTemplate && <FenetreEditionFiche participant={editingTemplate.participant} initiativeTextOrder={scene.initiativeTextOrder} phaseActionMode={scene.phaseActionMode} phaseCount={scene.phaseCount} multipleActionSlots={scene.multipleActionSlots !== false} trackerTemplates={templates.trackerTemplates} title={`Modifier le template · ${editingTemplate.name}`} saveTemplateVisible={false} deleteLabel="Supprimer le template" onClose={() => setEditingTemplateId('')} onSave={saveEditedTemplate} onDelete={deleteEditedTemplate} />}
    {sceneStatusOpen && <FenetreEtat participant={{ name: scene.title }} defaultAdvanceOn="round" afficherChoixEvolution={false} afficherInactif={false} statusTemplates={templates.sceneStatusTemplates} onFermer={() => setSceneStatusOpen(false)} onValider={(data) => { actions.addSceneStatus(data); setSceneStatusOpen(false); }} />}
  </>;

  if (currentView === 'hub') return <div className={`app ${dark ? 'dark' : ''}`}><HubCampagne campaignName={campaignName} scene={scene} scenes={scenes} templates={templates.templates} trackerTemplates={templates.trackerTemplates} statusTemplates={templates.statusTemplates} sceneCounterTemplates={templates.sceneCounterTemplates} sceneStatusTemplates={templates.sceneStatusTemplates} ruleTemplates={templates.ruleTemplates} templateCategories={templates.categories} dark={dark} onChangerTheme={actions.setDark} onChoisirScene={chooseScene} onNouvelleScene={newScene} onModifierScene={actions.updateSceneMeta} onDupliquerScene={actions.duplicateScene} onSupprimerScene={actions.deleteScene} onModifierReglesInitiative={actions.updateCampaignInitiativeRules} onExporter={() => setExportOpen(true)} onImporter={importCampaign} onReinitialiser={resetDemo} onAjouterTemplateCategorie={createTemplateInCategory} onAjouterCategorieTemplate={addTemplateCategory} onRenommerCategorieTemplate={renameTemplateCategory} onSupprimerCategorieTemplate={deleteTemplateCategory} onDeplacerCategorieTemplate={templates.moveCategory} onChangerCategorieTemplate={templates.setTemplateCategory} onEditerTemplate={setEditingTemplateId} onDupliquerTemplate={duplicateTemplate} onSupprimerTemplate={templates.deleteTemplate} onAjouterTemplateSuivi={templates.createTrackerTemplate} onModifierTemplateSuivi={templates.updateTrackerTemplate} onDupliquerTemplateSuivi={templates.duplicateTrackerTemplate} onSupprimerTemplateSuivi={templates.deleteTrackerTemplate} onAjouterTemplateEtat={templates.createStatusTemplate} onModifierTemplateEtat={templates.updateStatusTemplate} onDupliquerTemplateEtat={templates.duplicateStatusTemplate} onSupprimerTemplateEtat={templates.deleteStatusTemplate} onAjouterTemplateCompteurScene={templates.createSceneCounterTemplate} onModifierTemplateCompteurScene={templates.updateSceneCounterTemplate} onDupliquerTemplateCompteurScene={templates.duplicateSceneCounterTemplate} onSupprimerTemplateCompteurScene={templates.deleteSceneCounterTemplate} onAjouterTemplateEtatScene={templates.createSceneStatusTemplate} onModifierTemplateEtatScene={templates.updateSceneStatusTemplate} onDupliquerTemplateEtatScene={templates.duplicateSceneStatusTemplate} onSupprimerTemplateEtatScene={templates.deleteSceneStatusTemplate} onAppliquerTemplateRegles={actions.updateCampaignInitiativeRules} onEnregistrerTemplateRegles={templates.saveRuleTemplate} onDupliquerTemplateRegles={templates.duplicateRuleTemplate} onSupprimerTemplateRegles={templates.deleteRuleTemplate} onImporterTemplates={importTemplatesFromCampaign} />{fenetresCommunes}</div>;

  return <div className={`app ${dark ? 'dark' : ''}`}><div className="shell"><EnteteScene scene={scene} actif={declarationEnDeclaration ? null : temporalitePhases ? phaseActive : active} groupeActif={activeGroup} horlogesBloquantes={blocked} effetRound={roundEffect} compteurGlobalAuto={globalAutoTick} classeSuivant={classeSuivantEffective} libelleSuivant={nextLabel} temporaliteSouple={temporaliteSouple} temporalitePhases={temporalitePhases} temporaliteDeclaration={temporaliteDeclaration} suivantDesactive={suivantDesactive} retourDesactive={!retourPossible} dark={dark} onRetourHub={() => setCurrentView('hub')} onTourPrecedent={() => nextTurn(-1)} onTourSuivant={() => nextTurn(1)} onRetourPreparation={retourPreparationVisible ? returnToPreparation : null} onModifierCompteurGlobal={actions.stepGlobal} onToggleCompteurTemps={toggleGlobalRealtime} onRetirerEtatScene={actions.removeSceneStatus} /><main><ListeInitiative scene={scene} participants={scene.participants} actifId={temporalitePhases ? phaseActiveId : scene.activeId} interactions={characters} temporaliteSouple={temporaliteSouple} temporalitePhases={temporalitePhases} temporaliteDeclaration={temporaliteDeclaration} phaseAttendRelanceInitiative={phaseAttendRelanceInitiative} onMarquerAJoue={marquerAJoue} onAnnulerAJoue={annulerAJoue} /><ReserveHorsInitiative scene={scene} interactions={characters} onModifierNotes={(notes) => actions.updateSceneField('reserveNotes', notes)} /></main></div><BarreActionBas dark={dark} classeSuivant={classeSuivantEffective} prochainRound={declarationEnDeclaration ? false : temporaliteSouple ? toutLeMondeAJoueSouple : temporalitePhases ? phaseDemarreNouveauRound : nextStartsRound} round={scene.round} horlogeBloquee={blocked.length > 0} suivantDesactive={suivantDesactive} retourDesactive={!retourPossible} libelleSuivant={libelleBas} onRetourHub={() => setCurrentView('hub')} onTourPrecedent={() => nextTurn(-1)} onTourSuivant={() => nextTurn(1)} onRetourPreparation={retourPreparationVisible ? returnToPreparation : null} onSaisirInitiatives={openInitiativeEntry} onOuvrirMenu={() => setOpenMenu(true)} />{fenetresCommunes}</div>;
}
