import { useEffect, useRef, useState } from 'react';
import { phasesAttendRelanceInitiative } from './actions/tempoState.js';
import { temporalityModes } from './constants.js';
import { isInitiativeCostMode, rulesAllowMultipleSlots } from './domain/initiativeCost.js';
import { initiativeMatchesMode } from './domain/initiativeTextOrder.js';
import { globalTrackerTimerState } from './domain/globalTracker.js';
import { AppOverlays } from './interface/app/AppOverlays.jsx';
import { buildSceneUiState } from './interface/app/sceneUiState.js';
import { HubCampagne } from './interface/campaign/HubCampagne.jsx';
import { BarreActionBas } from './interface/scene/BarreActionBas.jsx';
import { EnteteScene } from './interface/scene/EnteteScene.jsx';
import { ListeInitiative } from './interface/scene/ListeInitiative.jsx';
import { ReserveHorsInitiative } from './interface/scene/ReserveHorsInitiative.jsx';
import { useCampaign } from './hooks/useCampaign.js';
import { useCharacterInteractions } from './hooks/useCharacterInteractions.js';
import { useTemplates } from './hooks/useTemplates.js';
import { createBlankParticipant } from './templates.js';

const VIEW_STORAGE_KEY = 'cadence:interface:view:v1';

function initialView() {
  try {
    return window.sessionStorage.getItem(VIEW_STORAGE_KEY) === 'scene' ? 'scene' : 'hub';
  } catch {
    return 'hub';
  }
}

function initiativesDeclarees(participant = {}, multipleActionSlots = true) {
  const slots = Array.isArray(participant.actionSlots) && participant.actionSlots.length
    ? participant.actionSlots
    : [{ initiative: participant.initiative }];
  return (multipleActionSlots ? slots : slots.slice(0, 1)).map((slot) => slot?.initiative ?? participant.initiative);
}

function participantsInitiativeIncompatible(scene = {}) {
  if (scene.temporalite === temporalityModes.FLEXIBLE && scene.flexibleUseInitiative === false) return [];
  return (scene.participants || []).filter((participant) => initiativesDeclarees(participant, rulesAllowMultipleSlots(scene)).some((initiative) => !initiativeMatchesMode(initiative, scene.initiativeTextOrder)));
}

export default function App() {
  const campaign = useCampaign();
  const { scenes, templateStore, setTemplateStore, campaignName, campaignEntries, activeCampaignEntryId, pendingFileChoice, fileSaveStatus, scene, restorePoints, dark, active, blocked, nextStartsRound, nextClass, roundEffect, actions } = campaign;
  const characters = useCharacterInteractions(scene, actions);
  const templates = useTemplates(templateStore, setTemplateStore);
  const [currentView, setCurrentView] = useState(initialView);
  const [openMenu, setOpenMenu] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [notice, setNotice] = useState(null);
  const [clockModalOpen, setClockModalOpen] = useState(false);
  const [globalSheetOpen, setGlobalSheetOpen] = useState(false);
  const [initiativeEntryOpen, setInitiativeEntryOpen] = useState(false);
  const [initiativeEntryScopeIds, setInitiativeEntryScopeIds] = useState(null);
  const [initiativeEntryInitialLaunch, setInitiativeEntryInitialLaunch] = useState(false);
  const [initiativeAdjustOpen, setInitiativeAdjustOpen] = useState(false);
  const [initiativeCostOpen, setInitiativeCostOpen] = useState(false);
  const [initiativeMismatch, setInitiativeMismatch] = useState(null);
  const [declarationActionsOpen, setDeclarationActionsOpen] = useState(false);
  const [declarationAdditionTargetId, setDeclarationAdditionTargetId] = useState('');
  const [pendingNextAfterInitiativeAdjust, setPendingNextAfterInitiativeAdjust] = useState(false);
  const [templateTarget, setTemplateTarget] = useState(null);
  const [editingTemplateId, setEditingTemplateId] = useState('');
  const [templatePanelOpen, setTemplatePanelOpen] = useState(false);
  const [templateSwitchRequest, setTemplateSwitchRequest] = useState(null);
  const [templateError, setTemplateError] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [timerDoneOpen, setTimerDoneOpen] = useState(false);
  const [sceneStatusOpen, setSceneStatusOpen] = useState(false);
  const previousRoundRef = useRef(scene.round);
  const declarationAutoOpenRef = useRef('');
  const timerDoneRef = useRef(false);
  const skipInitiativeAdjustPromptRef = useRef(false);
  const fileChoiceActionRef = useRef(false);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(VIEW_STORAGE_KEY, currentView);
    } catch {
      // La navigation reste fonctionnelle si le stockage de session est indisponible.
    }
  }, [currentView]);

  const ui = buildSceneUiState({ scene, active, blocked, nextStartsRound, nextClass, roundEffect });
  const { temporaliteSouple, temporalitePhases, temporaliteDeclaration, coutInitiativeActif, horlogesBloquantesActives, stageDeclaration, declarationEnDeclaration, phaseAttendRelanceInitiative, optionsInitiative, utiliserInitiative, phaseParticipants, phaseActiveId, phaseActive, phaseSuivanteDisponible, phaseDemarreNouveauRound, toutLeMondeAJoueSouple, globalAutoTick, participantAjustementInitiative, retourPreparationVisible, retourPossible, activeGroup, attendRelanceInitiativeCout, nextLabel, classeSuivantEffective, suivantDesactive, libelleBas } = ui;
  const editingTemplate = editingTemplateId ? templates.getTemplate(editingTemplateId) : null;
  const templatePanelVisible = !!editingTemplate || templatePanelOpen;
  const fermerEditeursTemplates = () => {
    setEditingTemplateId('');
    setTemplatePanelOpen(false);
    setTemplateSwitchRequest(null);
  };

  useEffect(() => {
    if (currentView !== 'scene' || !scene.activeId) return;
    const element = document.querySelector(`[data-participant-id="${scene.activeId}"]`);
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const bottomLimit = window.innerHeight - 110;
    if (rect.bottom > bottomLimit) element.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentView, scene.activeId]);

  useEffect(() => {
    if (currentView !== 'scene' || initiativeEntryOpen || initiativeMismatch) return;
    const incompatibles = participantsInitiativeIncompatible(scene);
    if (incompatibles.length) setInitiativeMismatch({ sceneId: scene.id, ids: incompatibles.map((participant) => participant.id) });
  }, [currentView, initiativeEntryOpen, initiativeMismatch, scene]);

  useEffect(() => {
    if (clockModalOpen && horlogesBloquantesActives.length === 0) setClockModalOpen(false);
  }, [clockModalOpen, horlogesBloquantesActives.length]);

  useEffect(() => {
    const roundAvant = previousRoundRef.current;
    previousRoundRef.current = scene.round;
    if (currentView === 'scene' && scene.round > roundAvant && ((scene.temporalite === temporalityModes.PHASES && phasesAttendRelanceInitiative(scene)) || (isInitiativeCostMode(scene) && scene.phaseRerollEachRound && !scene.activeId))) setInitiativeEntryOpen(true);
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
    const verifier = () => {
      const etat = globalTrackerTimerState(compteur);
      if (!etat.complete) { timerDoneRef.current = false; return; }
      if (timerDoneRef.current) return;
      timerDoneRef.current = true;
      if (compteur.limitMode === 'restart') {
        actions.updateGlobalTracker({ running: true, startedAt: Date.now(), elapsedMs: etat.elapsedMs % etat.durationMs });
        timerDoneRef.current = false;
        return;
      }
      if (compteur.limitMode === 'loop') return;
      if (compteur.limitMode === 'overflow') return;
      actions.updateGlobalTracker({ running: false, startedAt: null, elapsedMs: etat.durationMs });
      setTimerDoneOpen(true);
    };
    verifier();
    if (!compteur.running) return undefined;
    const id = window.setInterval(verifier, 500);
    return () => window.clearInterval(id);
  }, [actions, scene.globalTracker, scene.round]);

  const nextTurn = (direction) => {
    if (direction < 0 && !retourPossible) return;
    if (direction > 0 && horlogesBloquantesActives.length) { setClockModalOpen(true); return; }
    if (direction > 0 && scene.round < 0 && (utiliserInitiative || scene.preparationSurprise)) {
      setInitiativeEntryScopeIds(null);
      setInitiativeEntryInitialLaunch(true);
      setInitiativeEntryOpen(true);
      return;
    }
    if (direction > 0 && declarationEnDeclaration && scene.round >= 0 && scene.participants.length > 0) {
      setDeclarationActionsOpen(true);
      return;
    }
    if (temporaliteSouple && direction > 0 && scene.round >= 0 && !toutLeMondeAJoueSouple) return;
    if (temporalitePhases && direction > 0 && !phaseParticipants.length && !phaseSuivanteDisponible) return;
    if (direction > 0 && coutInitiativeActif && scene.round >= 0 && participantAjustementInitiative && !attendRelanceInitiativeCout) {
      setInitiativeCostOpen(true);
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
  const openInitiativeEntry = () => { setOpenMenu(false); setInitiativeEntryScopeIds(null); setInitiativeEntryInitialLaunch(false); setInitiativeEntryOpen(true); };
  const ouvrirDeclarationAjoutSiBesoin = (participant, options) => {
    if (participant && options?.placement !== 'reserve' && temporaliteSouple && temporaliteDeclaration && scene.round >= 0) {
      setDeclarationActionsOpen(false);
      setDeclarationAdditionTargetId(participant.id);
    }
  };
  const validerCoutInitiative = (cost) => {
    setInitiativeCostOpen(false);
    actions.applyInitiativeCost(cost);
  };
  const terminerRoundPersonnage = () => {
    setInitiativeCostOpen(false);
    actions.applyInitiativeCost(null);
  };
  const optionsAjoutPersonnage = (options) => ({ ...options, editAfterAdd: !(options?.placement !== 'reserve' && temporaliteSouple && temporaliteDeclaration && scene.round >= 0) });
  const createBlankCharacter = (options) => { const participant = characters.addCharacter(createBlankParticipant(), optionsAjoutPersonnage(options)); ouvrirDeclarationAjoutSiBesoin(participant, options); setAddSheetOpen(false); };
  const createFromTemplate = (templateId, options = { placement: 'reserve' }) => { const participant = templates.createParticipantFromTemplate(templateId); if (!participant) return; const added = characters.addCharacter(participant, optionsAjoutPersonnage(options)); ouvrirDeclarationAjoutSiBesoin(added, options); setAddSheetOpen(false); };
  const newScene = () => { actions.newScene(); setOpenMenu(false); };
  const chooseScene = (index) => {
    const cible = scenes[index];
    const incompatibles = participantsInitiativeIncompatible(cible);
    actions.setSceneIndex(index);
    fermerEditeursTemplates();
    setCurrentView('scene');
    setInitiativeMismatch(incompatibles.length ? { sceneId: cible?.id, ids: incompatibles.map((participant) => participant.id) } : null);
  };
  const retourHub = () => {
    setOpenMenu(false);
    characters.closeCharacterPanels();
    setCurrentView('hub');
  };
  const importCampaign = async (file, options = {}) => { const result = await actions.importCampaign(file, options); if (result?.ok === false) { setNotice({ title: 'Import impossible', message: result.message || 'Le fichier n’a pas pu être lu. Essaie avec un export .cad récent, et note le nom du fichier si le problème revient.' }); return; } setOpenMenu(false); characters.closeCharacterPanels(); setCurrentView('hub'); if (!result?.needsFileChoice) setNotice({ title: 'Campagne chargée', message: '' }); };
  const importCampaignDirectory = async () => { const result = await actions.importCampaignDirectory(); if (result?.ok === false && !result.cancelled) { setNotice({ title: 'Dossier impossible', message: result.message || 'Cadence n’a pas pu ouvrir ce dossier.' }); return; } if (result?.ok) setNotice({ title: 'Campagnes chargées', message: `${result.count} campagne(s) disponible(s) dans le menu.` }); };
  const chooseCampaignEntry = (id) => { const result = actions.selectCampaignEntry(id); if (result?.ok === false) setNotice({ title: 'Campagne introuvable', message: result.message }); };
  const workOnLoadedFile = async () => { const result = await actions.useLoadedCampaignFile(); if (result?.ok === false) setNotice({ title: 'Fichier non lié', message: result.message }); else setNotice({ title: 'Campagne chargée', message: '' }); };
  const workOnCampaignCopy = async () => { if (fileChoiceActionRef.current) return; fileChoiceActionRef.current = true; const result = await actions.saveLoadedCampaignAsCopy(); fileChoiceActionRef.current = false; if (result?.ok === false && !result.cancelled) setNotice({ title: 'Copie impossible', message: result.message }); else if (result?.ok) setNotice({ title: 'Campagne chargée', message: '' }); };
  const importTemplatesFromCampaign = async (file) => { const result = await actions.importTemplatesFromCampaign(file); if (result?.ok === false) { setNotice({ title: 'Import impossible', message: result.message }); return; } setNotice({ title: 'Templates importés', message: `${result.added} ajouté(s), ${result.skipped} ignoré(s) car déjà présents.` }); };
  const ouvrirEditionTemplatePersonnage = (templateId) => { setTemplatePanelOpen(true); setTemplateSwitchRequest(null); setEditingTemplateId(templateId); };
  const fermerEditionTemplatePersonnage = () => { setEditingTemplateId(''); setTemplateSwitchRequest(null); };
  const createTemplateInCategory = (category) => { const template = templates.createTemplateInCategory(category); if (template) ouvrirEditionTemplatePersonnage(template.id); };
  const addTemplateCategory = (category) => { const result = templates.addCategory(category); if (result?.ok === false) setNotice({ title: 'Catégorie impossible', message: result.message }); return result; };
  const renameTemplateCategory = (category, nextName) => { const result = templates.renameCategory(category, nextName); if (result?.ok === false) setNotice({ title: 'Renommage impossible', message: result.message }); return result; };
  const deleteTemplateCategory = (category) => { const result = templates.deleteCategory(category); if (result?.ok === false) setNotice({ title: 'Suppression impossible', message: result.message }); return result; };
  const duplicateTemplate = (templateId) => { const duplicate = templates.duplicateTemplate(templateId); if (duplicate) ouvrirEditionTemplatePersonnage(duplicate.id); };
  const saveEditedTemplate = (participant, category) => { if (!editingTemplateId) return; templates.updateTemplateParticipant(editingTemplateId, participant, category || editingTemplate.category); setEditingTemplateId(''); setTemplateSwitchRequest(null); };
  const deleteEditedTemplate = () => { if (!editingTemplateId) return; templates.deleteTemplate(editingTemplateId); setEditingTemplateId(''); setTemplateSwitchRequest(null); };
  const validerChangementDepuisTemplatePersonnage = (participant, category) => {
    const request = templateSwitchRequest;
    if (editingTemplateId) templates.updateTemplateParticipant(editingTemplateId, participant, category || editingTemplate.category);
    setEditingTemplateId('');
    setTemplateSwitchRequest(null);
    request?.execute?.();
  };
  const abandonnerChangementDepuisTemplatePersonnage = () => {
    const request = templateSwitchRequest;
    setEditingTemplateId('');
    setTemplateSwitchRequest(null);
    request?.execute?.();
  };
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
    setInitiativeEntryInitialLaunch(false);
  };
  const validerSaisieInitiatives = (valuesById, surprisedIds, departagesById) => {
    if (initiativeEntryInitialLaunch) actions.startSceneWithInitiatives(valuesById, surprisedIds, departagesById);
    else actions.applyInitiativeRolls(valuesById, departagesById);
  };
  const validerActionsDeclarees = (declarations) => {
    actions.applyDeclarationChoices(declarations);
    setDeclarationActionsOpen(false);
  };
  const validerDeclarationAjout = (declarations) => {
    const action = declarations[declarationAdditionTargetId];
    if (action) actions.updateDeclaration(declarationAdditionTargetId, action);
    setDeclarationAdditionTargetId('');
  };

  const fenetresCommunes = <AppOverlays
    campaignName={campaignName}
    scene={scene}
    restorePoints={restorePoints}
    dark={dark}
    currentView={currentView}
    characters={characters}
    templates={templates}
    actions={actions}
    ui={ui}
    overlayState={{ addSheetOpen, openMenu, notice, globalSheetOpen, clockModalOpen, initiativeEntryOpen, initiativeEntryScopeIds, initiativeEntryInitialLaunch, initiativeAdjustOpen, initiativeCostOpen, declarationActionsOpen, declarationAdditionTargetId, exportOpen, timerDoneOpen, pendingFileChoice, sceneStatusOpen, participantsIncompatibles }}
    overlayActions={{
      openAddCharacter,
      openInitiativeEntry,
      retourHub,
      ouvrirCompteurGlobal: () => setGlobalSheetOpen(true),
      ouvrirEtatScene: () => setSceneStatusOpen(true),
      fermerAjoutPersonnage: () => setAddSheetOpen(false),
      fermerMenu: () => setOpenMenu(false),
      fermerNotice: () => setNotice(null),
      fermerCompteurGlobal: () => setGlobalSheetOpen(false),
      fermerResolutionHorloge: () => setClockModalOpen(false),
      fermerEtatScene: () => setSceneStatusOpen(false),
      validerEtatScene: (data) => { actions.addSceneStatus(data); setSceneStatusOpen(false); },
    }}
    templateState={{ editingTemplate, templateTarget, templateError, templateSwitchRequest }}
    templateActions={{
      openTemplateSave,
      fermerSauvegardeTemplate: () => setTemplateTarget(null),
      saveTemplate,
      annulerChangementTemplate: () => setTemplateSwitchRequest(null),
      abandonnerChangementDepuisTemplatePersonnage,
      validerChangementDepuisTemplatePersonnage,
      fermerEditionTemplatePersonnage,
      saveEditedTemplate,
      deleteEditedTemplate,
    }}
    timerActions={{
      fermerTimerDone: () => setTimerDoneOpen(false),
      restartTimer,
      resetTimer,
      openTimerMenu,
    }}
    campaignFileActions={{
      fermerExport: () => setExportOpen(false),
      exportCampaign,
      workOnLoadedFile,
      workOnCampaignCopy,
    }}
    initiativeActions={{
      fermerSaisieInitiatives,
      validerSaisieInitiatives,
      fermerAjustementInitiative: () => setInitiativeAdjustOpen(false),
      validerAjustementInitiative,
      passerAjustementInitiative,
      fermerCoutInitiative: () => setInitiativeCostOpen(false),
      validerCoutInitiative,
      terminerRoundPersonnage,
      fermerDeclarationActions: () => setDeclarationActionsOpen(false),
      validerActionsDeclarees,
      fermerDeclarationAjout: () => setDeclarationAdditionTargetId(''),
      validerDeclarationAjout,
      changerInitiativesIncompatibles,
      sortirInitiativesIncompatibles,
    }}
    sceneActions={{
      createBlankCharacter,
      createFromTemplate,
      restoreScene,
      returnToPreparation,
      advanceRound,
      resetSceneTrackers,
      clearSceneStatuses,
    }}
    clockActions={{ resetClock, deleteClock }}
  />;


  if (currentView === 'hub') return <div className={`app hub-app ${dark ? 'dark' : ''} ${templatePanelVisible ? 'has-template-panel' : ''}`}><HubCampagne campaignName={campaignName} scene={scene} scenes={scenes} templates={templates.templates} trackerTemplates={templates.trackerTemplates} statusTemplates={templates.statusTemplates} sceneCounterTemplates={templates.sceneCounterTemplates} sceneStatusTemplates={templates.sceneStatusTemplates} ruleTemplates={templates.rulePresets} templateCategories={templates.categories} campaignEntries={campaignEntries} activeCampaignEntryId={activeCampaignEntryId} fileSaveStatus={fileSaveStatus} dark={dark} onChangerTheme={actions.setDark} onChoisirScene={chooseScene} onNouvelleScene={newScene} onModifierScene={actions.updateSceneMeta} onDupliquerScene={actions.duplicateScene} onSupprimerScene={actions.deleteScene} onModifierReglesInitiative={actions.updateCampaignInitiativeRules} onChoisirCampagne={chooseCampaignEntry} onExporter={() => setExportOpen(true)} onImporter={importCampaign} onReinitialiser={resetDemo} onAjouterTemplateCategorie={createTemplateInCategory} onAjouterCategorieTemplate={addTemplateCategory} onRenommerCategorieTemplate={renameTemplateCategory} onSupprimerCategorieTemplate={deleteTemplateCategory} onDeplacerCategorieTemplate={templates.moveCategory} onChangerCategorieTemplate={templates.setTemplateCategory} onEditerTemplate={ouvrirEditionTemplatePersonnage} onDupliquerTemplate={duplicateTemplate} onSupprimerTemplate={templates.deleteTemplate} onAjouterTemplateSuivi={templates.createTrackerTemplate} onModifierTemplateSuivi={templates.updateTrackerTemplate} onDupliquerTemplateSuivi={templates.duplicateTrackerTemplate} onSupprimerTemplateSuivi={templates.deleteTrackerTemplate} onAjouterTemplateEtat={templates.createStatusTemplate} onModifierTemplateEtat={templates.updateStatusTemplate} onDupliquerTemplateEtat={templates.duplicateStatusTemplate} onSupprimerTemplateEtat={templates.deleteStatusTemplate} onAjouterTemplateCompteurScene={templates.createSceneCounterTemplate} onModifierTemplateCompteurScene={templates.updateSceneCounterTemplate} onDupliquerTemplateCompteurScene={templates.duplicateSceneCounterTemplate} onSupprimerTemplateCompteurScene={templates.deleteSceneCounterTemplate} onAjouterTemplateEtatScene={templates.createSceneStatusTemplate} onModifierTemplateEtatScene={templates.updateSceneStatusTemplate} onDupliquerTemplateEtatScene={templates.duplicateSceneStatusTemplate} onSupprimerTemplateEtatScene={templates.deleteSceneStatusTemplate} onAppliquerTemplateRegles={actions.updateCampaignInitiativeRules} onEnregistrerTemplateRegles={templates.saveRuleTemplate} onDupliquerTemplateRegles={templates.duplicateRuleTemplate} onSupprimerTemplateRegles={templates.deleteRuleTemplate} onImporterTemplates={importTemplatesFromCampaign} onFermerEditeursTemplates={fermerEditeursTemplates} templatePersonnageId={editingTemplateId} templatePersonnageOuvert={!!editingTemplate} onFermerEditionTemplatePersonnage={fermerEditionTemplatePersonnage} onDemanderChangementDepuisTemplatePersonnage={setTemplateSwitchRequest} onTemplatePanelOpenChange={setTemplatePanelOpen} />{fenetresCommunes}</div>;

  return <div className={`app scene-app ${dark ? 'dark' : ''} ${characters.selected ? 'has-character-panel' : ''}`}><div className="shell"><EnteteScene scene={scene} actif={declarationEnDeclaration ? null : temporalitePhases ? phaseActive : active} groupeActif={activeGroup} horlogesBloquantes={horlogesBloquantesActives} effetRound={roundEffect} compteurGlobalAuto={globalAutoTick} classeSuivant={classeSuivantEffective} libelleSuivant={nextLabel} temporaliteSouple={temporaliteSouple} temporalitePhases={temporalitePhases} temporaliteDeclaration={temporaliteDeclaration} suivantDesactive={suivantDesactive} retourDesactive={!retourPossible} dark={dark} onRetourHub={retourHub} onTourPrecedent={() => nextTurn(-1)} onTourSuivant={() => nextTurn(1)} onRetourPreparation={retourPreparationVisible ? returnToPreparation : null} onModifierCompteurGlobal={actions.stepGlobal} onToggleCompteurTemps={toggleGlobalRealtime} onToggleSurprisePreparation={(active) => actions.updateSceneField('preparationSurprise', active)} onRetirerEtatScene={actions.removeSceneStatus} /><main className={`scene-main ${scene.reserve?.length ? 'with-reserve' : ''}`}><ListeInitiative scene={scene} participants={scene.participants} actifId={temporalitePhases ? phaseActiveId : scene.activeId} interactions={characters} temporaliteSouple={temporaliteSouple} temporalitePhases={temporalitePhases} temporaliteDeclaration={temporaliteDeclaration} phaseAttendRelanceInitiative={phaseAttendRelanceInitiative} onMarquerAJoue={marquerAJoue} onAnnulerAJoue={annulerAJoue} /><ReserveHorsInitiative scene={scene} interactions={characters} onModifierNotes={(notes) => actions.updateSceneField('reserveNotes', notes)} onAvancerReserve={actions.advanceReserveRound} /></main></div><BarreActionBas dark={dark} classeSuivant={classeSuivantEffective} prochainRound={declarationEnDeclaration ? false : temporaliteSouple ? toutLeMondeAJoueSouple : temporalitePhases ? phaseDemarreNouveauRound : nextStartsRound} round={scene.round} horlogeBloquee={horlogesBloquantesActives.length > 0} suivantDesactive={suivantDesactive} retourDesactive={!retourPossible} libelleSuivant={libelleBas} onRetourHub={retourHub} onTourPrecedent={() => nextTurn(-1)} onTourSuivant={() => nextTurn(1)} onRetourPreparation={retourPreparationVisible ? returnToPreparation : null} onAjouterParticipant={openAddCharacter} onSaisirInitiatives={openInitiativeEntry} onOuvrirMenu={() => setOpenMenu(true)} />{fenetresCommunes}</div>;
}
