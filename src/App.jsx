import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { phasesAttendRelanceInitiative } from './actions/tempoState.js';
import { temporalityModes } from './constants.js';
import { isInitiativeCostMode, rulesAllowMultipleSlots } from './domain/initiativeCost.js';
import { initiativeMatchesMode } from './domain/initiativeTextOrder.js';
import { activeGlobalTrackerThresholds, globalTrackerTimerState } from './domain/globalTracker.js';
import { buildSceneUiState } from './interface/app/sceneUiState.js';
import { useCampaign } from './hooks/useCampaign.js';
import { useCharacterInteractions } from './hooks/useCharacterInteractions.js';
import { useTemplates } from './hooks/useTemplates.js';
import { useRandomSystem } from './random-system/useRandomSystem.js';
import { createBlankParticipant } from './templates.js';
import { activateWaitingServiceWorker, primePwaShellCache, registerCadencePwa } from './pwa.js';
import { t } from './i18n/index.js';
import { rulePresetCatalog, rulePresetFamilies } from './rulePresets.js';
import { keepScreenAwakeWhileForeground } from './screenWakeLock.js';
import { teinteEtats } from './interface/commun/ComposantsCommuns.jsx';
import { MenuOptions } from './interface/app/MenuOptions.jsx';
import { HubCampagne } from './interface/campaign/HubCampagne.jsx';
import { getCadenceLogo } from './uiAssets.js';
import {
  PERFORMANCE_PREFERENCE_STORAGE_KEY,
  detectHardwarePerformanceRisk,
  nextSlowPerformanceSamples,
  normalizePerformancePreference,
  performanceLevels,
  resolvePerformanceLevel,
  shouldCountSlowPerformanceMeasure,
} from './performanceMode.js';

const AppOverlays = lazy(() => import('./interface/app/AppOverlays.jsx').then((module) => ({ default: module.AppOverlays })));
const FirstRunOnboarding = lazy(() => import('./interface/app/FirstRunOnboarding.jsx').then((module) => ({ default: module.FirstRunOnboarding })));
const SceneView = lazy(() => import('./interface/scene/SceneView.jsx').then((module) => ({ default: module.SceneView })));

const VIEW_STORAGE_KEY = 'cadence:interface:view:v1';
const INITIAL_LOADING_MIN_MS = 180;
const APP_SKIN = 'cadence';

function attributsApp(dark, performanceLevel = performanceLevels.NORMAL) {
  return {
    'data-skin': APP_SKIN,
    'data-theme': APP_SKIN,
    'data-mode': dark ? 'dark' : 'light',
    'data-performance': performanceLevel,
  };
}

function PanneauChargement({ dark, texte = t('common.loading') }) {
  const logo = getCadenceLogo(dark);
  return (
    <div className="loading-view">
      <div className="loading-mark">
        <img src={logo} alt="Cadence" />
      </div>
      <strong>{texte}</strong>
    </div>
  );
}

function ChargementVue({ dark, texte = t('common.loading'), performanceLevel = performanceLevels.NORMAL }) {
  return <div className={`app ${dark ? 'dark' : ''}`} {...attributsApp(dark, performanceLevel)}><PanneauChargement dark={dark} texte={texte} /></div>;
}

function initialView() {
  try {
    return window.sessionStorage.getItem(VIEW_STORAGE_KEY) === 'scene' ? 'scene' : 'hub';
  } catch {
    return 'hub';
  }
}

function storedPerformancePreference() {
  try {
    return normalizePerformancePreference(window.localStorage.getItem(PERFORMANCE_PREFERENCE_STORAGE_KEY));
  } catch {
    return normalizePerformancePreference();
  }
}

function hardwarePerformanceRisk() {
  if (typeof window === 'undefined') return false;
  const reducedMotion = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  return detectHardwarePerformanceRisk({
    deviceMemory: navigator.deviceMemory,
    hardwareConcurrency: navigator.hardwareConcurrency,
    reducedMotion,
  });
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
  const { scenes, templateStore, setTemplateStore, randomSystemState, campaignName, campaignEntries, pendingFileChoice, fileSaveStatus, scene, restorePoints, dark, active, blocked, nextStartsRound, nextClass, roundEffect, rulePresetSnapshot, firstRunOnboardingNeeded, themeState, actions } = campaign;
  const characters = useCharacterInteractions(scene, actions);
  const templates = useTemplates(templateStore, setTemplateStore);
  const randomSystem = useRandomSystem({ state: randomSystemState, setState: actions.setRandomSystemState });
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
  const [resetConfirmationOpen, setResetConfirmationOpen] = useState(false);
  const [timerDoneOpen, setTimerDoneOpen] = useState(false);
  const [sceneStatusOpen, setSceneStatusOpen] = useState(false);
  const [quickRollOpen, setQuickRollOpen] = useState(false);
  const [pwaUpdateAvailable, setPwaUpdateAvailable] = useState(false);
  const [chargementInitialVisible, setChargementInitialVisible] = useState(true);
  const [sceneVisualTick, setSceneVisualTick] = useState(0);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [performancePreference, setPerformancePreferenceState] = useState(storedPerformancePreference);
  const [automaticPerformanceLow, setAutomaticPerformanceLow] = useState(false);
  const [hardwareRisk] = useState(hardwarePerformanceRisk);
  const previousRoundRef = useRef(scene.round);
  const declarationAutoOpenRef = useRef('');
  const timerDoneRef = useRef(false);
  const skipInitiativeAdjustPromptRef = useRef(false);
  const fileChoiceActionRef = useRef(false);
  const pwaRegistrationRef = useRef(null);
  const pwaReloadRequestedRef = useRef(false);
  const slowPerformanceSamplesRef = useRef([]);
  const pendingTurnMeasureRef = useRef(0);
  const performanceLevel = resolvePerformanceLevel(performancePreference, automaticPerformanceLow);
  const performanceLow = performanceLevel === performanceLevels.LOW;
  const setPerformancePreference = useCallback((value) => {
    setPerformancePreferenceState(normalizePerformancePreference(value));
    setAutomaticPerformanceLow(false);
    slowPerformanceSamplesRef.current = [];
  }, []);
  const ouvrirOptions = useCallback(() => setOptionsOpen(true), []);
  const fermerOptions = useCallback(() => setOptionsOpen(false), []);
  const recordPerformanceMeasure = useCallback((kind, durationMs) => {
    if (!shouldCountSlowPerformanceMeasure(kind, durationMs, hardwareRisk)) return;
    const next = nextSlowPerformanceSamples(slowPerformanceSamplesRef.current, Date.now(), hardwareRisk);
    slowPerformanceSamplesRef.current = next.samples;
    if (next.activate) setAutomaticPerformanceLow(true);
  }, [hardwareRisk]);

  useEffect(() => {
    const timer = window.setTimeout(() => setChargementInitialVisible(false), INITIAL_LOADING_MIN_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => keepScreenAwakeWhileForeground(), []);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(VIEW_STORAGE_KEY, currentView);
    } catch {
      // La navigation reste fonctionnelle si le stockage de session est indisponible.
    }
  }, [currentView]);

  useEffect(() => {
    try {
      window.localStorage.setItem(PERFORMANCE_PREFERENCE_STORAGE_KEY, performancePreference);
    } catch {
      // Le mode performance reste utilisable meme sans stockage local.
    }
  }, [performancePreference]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', !!dark);
    root.dataset.skin = APP_SKIN;
    root.dataset.theme = APP_SKIN;
    root.dataset.mode = dark ? 'dark' : 'light';
    root.dataset.performance = performanceLevel;

    return () => {
      root.classList.remove('dark');
      delete root.dataset.skin;
      delete root.dataset.theme;
      delete root.dataset.mode;
      delete root.dataset.performance;
    };
  }, [dark, performanceLevel]);

  useEffect(() => {
    if (!import.meta.env.PROD) return undefined;
    let cancelled = false;
    const primeShell = () => { primePwaShellCache().catch(() => {}); };
    if (document.readyState === 'complete') primeShell();
    else window.addEventListener('load', primeShell, { once: true });

    const handleControllerChange = () => {
      if (!pwaReloadRequestedRef.current) return;
      pwaReloadRequestedRef.current = false;
      window.location.reload();
    };
    navigator.serviceWorker?.addEventListener('controllerchange', handleControllerChange);

    registerCadencePwa((registration) => {
      if (cancelled) return;
      pwaRegistrationRef.current = registration;
      setPwaUpdateAvailable(true);
    }).then((registration) => {
      if (!cancelled && registration) pwaRegistrationRef.current = registration;
    }).catch(() => {});

    return () => {
      cancelled = true;
      window.removeEventListener('load', primeShell);
      navigator.serviceWorker?.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  const ui = useMemo(() => buildSceneUiState({ scene, active, blocked, nextStartsRound, nextClass, roundEffect }), [active, blocked, nextClass, nextStartsRound, roundEffect, scene]);
  const { temporaliteSouple, temporalitePhases, temporaliteDeclaration, coutInitiativeActif, horlogesBloquantesActives, stageDeclaration, declarationEnDeclaration, phaseAttendRelanceInitiative, optionsInitiative, utiliserInitiative, phaseParticipants, phaseActiveId, phaseActive, phaseSuivanteDisponible, phaseDemarreNouveauRound, toutLeMondeAJoueSouple, globalAutoTick, participantAjustementInitiative, retourPreparationVisible, retourPossible, activeGroup, attendRelanceInitiativeCout, nextLabel, classeSuivantEffective, suivantDesactive, libelleBas } = ui;
  const editingTemplate = useMemo(() => editingTemplateId ? templates.getTemplate(editingTemplateId) : null, [editingTemplateId, templates]);
  const templatePanelVisible = !!editingTemplate || templatePanelOpen;
  const fermerEditeursTemplates = useCallback(() => {
    setEditingTemplateId('');
    setTemplatePanelOpen(false);
    setTemplateSwitchRequest(null);
  }, []);
  const rechargerMiseAJourPwa = useCallback(() => {
    const registration = pwaRegistrationRef.current;
    if (!registration?.waiting) return;
    pwaReloadRequestedRef.current = true;
    setPwaUpdateAvailable(false);
    activateWaitingServiceWorker(registration);
  }, []);
  const pwaUpdateBanner = pwaUpdateAvailable ? (
    <div className="pwa-update-banner" role="status" aria-live="polite">
      <div>
        <strong>{t('app.pwa.updateReady')}</strong>
        <p>{t('app.pwa.updateHelp')}</p>
      </div>
      <button className="small-btn suggested" type="button" onClick={rechargerMiseAJourPwa}>{t('errors.reload')}</button>
    </div>
  ) : null;

  useEffect(() => {
    if (currentView !== 'scene' || scene.round < 0 || !scene.activeId) return;
    const element = document.querySelector(`[data-participant-id="${scene.activeId}"]`);
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const bottomLimit = window.innerHeight - 110;
    if (rect.bottom > bottomLimit) element.scrollIntoView({ block: 'nearest', behavior: performanceLow ? 'auto' : 'smooth' });
  }, [currentView, performanceLow, scene.activeId, scene.round]);

  useEffect(() => {
    if (currentView !== 'scene') return undefined;
    const renderStartedAt = performance.now();
    const turnStartedAt = pendingTurnMeasureRef.current;
    const frame = requestAnimationFrame(() => {
      recordPerformanceMeasure('render', performance.now() - renderStartedAt);
      if (turnStartedAt) {
        recordPerformanceMeasure('turn', performance.now() - turnStartedAt);
        pendingTurnMeasureRef.current = 0;
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [currentView, recordPerformanceMeasure, scene.activeId, scene.activeSlotId, scene.id, scene.phase, scene.round]);

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

  useEffect(() => {
    const compteur = scene.globalTracker;
    if (currentView !== 'scene' || !compteur?.enabled || !compteur.running || !['timer', 'stopwatch'].includes(compteur.mode)) return undefined;
    const intervalMs = performanceLow ? 4000 : 1000;
    let expectedAt = performance.now() + intervalMs;
    const id = window.setInterval(() => {
      const now = performance.now();
      recordPerformanceMeasure('timerTick', Math.max(0, now - expectedAt));
      expectedAt = now + intervalMs;
      setSceneVisualTick((value) => value + 1);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [currentView, performanceLow, recordPerformanceMeasure, scene.globalTracker?.enabled, scene.globalTracker?.mode, scene.globalTracker?.running]);

  const nextTurn = useCallback((direction) => {
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
    pendingTurnMeasureRef.current = performance.now();
    actions.nextTurn(direction);
  }, [actions, attendRelanceInitiativeCout, coutInitiativeActif, declarationEnDeclaration, horlogesBloquantesActives.length, participantAjustementInitiative, phaseParticipants.length, phaseSuivanteDisponible, retourPossible, scene.participants.length, scene.round, scene.preparationSurprise, temporalitePhases, temporaliteSouple, toutLeMondeAJoueSouple, utiliserInitiative]);

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

  const marquerAJoue = useCallback((participantId) => actions.markFlexiblePlayed(participantId), [actions]);
  const annulerAJoue = useCallback((participantId) => actions.unmarkFlexiblePlayed(participantId), [actions]);
  const openAddCharacter = useCallback(() => { setOpenMenu(false); setAddSheetOpen(true); }, []);
  const openInitiativeEntry = useCallback(() => { setOpenMenu(false); setInitiativeEntryScopeIds(null); setInitiativeEntryInitialLaunch(false); setInitiativeEntryOpen(true); }, []);
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
  const retourHub = useCallback(() => {
    setOpenMenu(false);
    characters.closeCharacterPanels();
    setCurrentView('hub');
  }, [characters]);
  const importCampaign = async (file, options = {}) => { const result = await actions.importCampaign(file, options); if (result?.ok === false) { setNotice({ title: t('app.notice.importImpossible.title'), message: result.message || t('app.notice.importImpossible.message') }); return; } setOpenMenu(false); characters.closeCharacterPanels(); setCurrentView('hub'); if (!result?.needsFileChoice) setNotice({ title: t('app.notice.campaignLoaded.title'), message: '' }); };
  const workOnLoadedFile = async () => { const result = await actions.useLoadedCampaignFile(); if (result?.ok === false) setNotice({ title: t('app.notice.fileUnlinked.title'), message: result.message }); else setNotice({ title: t('app.notice.campaignLoaded.title'), message: '' }); };
  const workOnCampaignCopy = async () => { if (fileChoiceActionRef.current) return; fileChoiceActionRef.current = true; const result = await actions.saveLoadedCampaignAsCopy(); fileChoiceActionRef.current = false; if (result?.ok === false && !result.cancelled) setNotice({ title: t('app.notice.copyImpossible.title'), message: result.message }); else if (result?.ok) setNotice({ title: t('app.notice.campaignLoaded.title'), message: '' }); };
  const importTemplatesFromCampaign = async (file) => { const result = await actions.importTemplatesFromCampaign(file); if (result?.ok === false) { setNotice({ title: t('app.notice.importImpossible.title'), message: result.message }); return; } setNotice({ title: t('app.notice.libraryImported.title'), message: t('app.notice.libraryImported.message', { templates: result.added, kits: (result.kitsAdded || 0) + (result.kitsUpdated || 0) }) }); };
  const exportTemplateLibrary = async () => { const result = await actions.exportTemplateLibrary?.(); if (result?.ok) setNotice({ title: t('app.notice.exportDone.title'), message: t('app.notice.libraryExported.message') }); if (result?.ok === false && !result.cancelled) setNotice({ title: t('app.notice.exportImpossible.title'), message: result.message || t('app.notice.exportImpossible.message') }); };
  const ouvrirEditionTemplatePersonnage = (templateId) => { setTemplatePanelOpen(true); setTemplateSwitchRequest(null); setEditingTemplateId(templateId); };
  const fermerEditionTemplatePersonnage = () => { setEditingTemplateId(''); setTemplateSwitchRequest(null); };
  const createTemplateInCategory = (category) => { const template = templates.createTemplateInCategory(category); if (template) ouvrirEditionTemplatePersonnage(template.id); };
  const addTemplateCategory = (category) => { const result = templates.addCategory(category); if (result?.ok === false) setNotice({ title: t('app.notice.categoryImpossible.title'), message: result.message }); return result; };
  const renameTemplateCategory = (category, nextName) => { const result = templates.renameCategory(category, nextName); if (result?.ok === false) setNotice({ title: t('app.notice.renameImpossible.title'), message: result.message }); return result; };
  const deleteTemplateCategory = (category) => { const result = templates.deleteCategory(category); if (result?.ok === false) setNotice({ title: t('app.notice.deleteImpossible.title'), message: result.message }); return result; };
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
  const loadTestCampaign = () => { actions.loadTestCampaign?.(); setOpenMenu(false); characters.closeCharacterPanels(); setCurrentView('hub'); };
  const startFirstRunPreset = (preset) => {
    const result = actions.startFirstRunCampaign(preset);
    if (result?.ok !== false) setCurrentView('scene');
    return result;
  };
  const startFirstRunCustomRules = () => {
    const result = actions.startFirstRunCustomCampaign();
    if (result?.ok !== false) setCurrentView('scene');
    return result;
  };
  const askResetCadence = () => { setResetConfirmationOpen(true); setOpenMenu(false); characters.closeCharacterPanels(); };
  const resetCadence = () => {
    actions.resetCadence();
    setResetConfirmationOpen(false);
    setExportOpen(false);
    setOpenMenu(false);
    setAddSheetOpen(false);
    setGlobalSheetOpen(false);
    setClockModalOpen(false);
    setInitiativeEntryOpen(false);
    setInitiativeAdjustOpen(false);
    setInitiativeCostOpen(false);
    setDeclarationActionsOpen(false);
    setDeclarationAdditionTargetId('');
    setTimerDoneOpen(false);
    setSceneStatusOpen(false);
    setNotice(null);
    setEditingTemplateId('');
    setTemplatePanelOpen(false);
    setTemplateSwitchRequest(null);
    characters.closeCharacterPanels();
    setCurrentView('hub');
  };
  const restoreScene = (pointId) => { actions.restoreScene(pointId); setOpenMenu(false); characters.closeCharacterPanels(); };
  const returnToPreparation = useCallback(() => { actions.returnToPreparation(); setOpenMenu(false); characters.closeCharacterPanels(); }, [actions, characters]);
  const returnToPreparationWithOptions = (options) => { actions.returnToPreparationWithOptions(options); setOpenMenu(false); characters.closeCharacterPanels(); };
  const advanceRound = () => { actions.advanceRound(); setOpenMenu(false); characters.closeCharacterPanels(); };
  const decreaseRound = () => { actions.changeRoundNumber(-1); setOpenMenu(false); characters.closeCharacterPanels(); };
  const changeRoundNumberWithAutomations = (delta, options) => { actions.changeRoundNumberWithAutomations(delta, options); setOpenMenu(false); characters.closeCharacterPanels(); };
  const advanceAllAutomations = () => { actions.advanceAllAutomations(); setOpenMenu(false); characters.closeCharacterPanels(); };
  const rewindAllAutomations = () => { actions.rewindAllAutomations(); setOpenMenu(false); characters.closeCharacterPanels(); };
  const resetSceneTrackers = () => { actions.resetSceneTrackers(); setOpenMenu(false); characters.closeCharacterPanels(); };
  const clearSceneStatuses = () => { actions.clearSceneStatuses(); setOpenMenu(false); characters.closeCharacterPanels(); };
  const endTemporaryEffects = () => { actions.endTemporaryEffects(); setOpenMenu(false); characters.closeCharacterPanels(); };
  const toggleGlobalRealtime = useCallback(() => { const compteur = scene.globalTracker; if (scene.round < 0) return; if (!['stopwatch', 'timer'].includes(compteur?.mode)) return; const elapsed = Math.max(0, Number(compteur.elapsedMs || 0)) + (compteur.running && compteur.startedAt ? Math.max(0, Date.now() - Number(compteur.startedAt)) : 0); actions.updateGlobalTracker(compteur.running ? { running: false, startedAt: null, elapsedMs: elapsed } : { running: true, startedAt: Date.now() }); }, [actions, scene.globalTracker, scene.round]);
  const restartTimer = () => { actions.updateGlobalTracker({ running: true, startedAt: Date.now(), elapsedMs: 0 }); timerDoneRef.current = false; setTimerDoneOpen(false); };
  const resetTimer = () => { actions.updateGlobalTracker({ running: false, startedAt: null, elapsedMs: 0 }); timerDoneRef.current = false; setTimerDoneOpen(false); };
  const openTimerMenu = () => { setTimerDoneOpen(false); setOpenMenu(true); };
  const exportCampaign = async (name) => { try { const result = await actions.exportCampaign(name); if (result?.ok) setNotice({ title: t('app.notice.exportDone.title'), message: t('app.notice.exportDone.message') }); if (result?.ok === false && !result.cancelled) setNotice({ title: t('app.notice.exportImpossible.title'), message: result.message || t('app.notice.exportImpossible.message') }); return result; } catch (error) { setNotice({ title: t('app.notice.exportImpossible.title'), message: t('app.notice.exportInterrupted.message', { message: error?.message || t('app.notice.unknownError') }) }); return { ok: false, message: error?.message }; } };
  const exportBeforeReset = async () => {
    try {
      return await actions.exportCampaign(campaignName);
    } catch (error) {
      return { ok: false, message: error?.message };
    }
  };
  const openTemplateSave = (participant) => { setTemplateTarget(participant); setTemplateError(null); };
  const saveTemplate = (data) => { if (!templateTarget) return; const result = templates.saveParticipantAsTemplate(templateTarget, data); if (!result.ok) { setTemplateError({ kind: result.kind, message: result.message }); return; } setTemplateTarget(null); setTemplateError(null); setNotice({ title: result.overwritten ? t('app.notice.templateReplaced.title') : t('app.notice.templateSaved.title'), message: t('app.notice.templateSaved.message', { name: result.template.name, category: result.template.category }) }); };
  const findClock = (participantId, trackerId) => { const participant = [...scene.participants, ...(scene.reserve || [])].find((item) => item.id === participantId); return participant?.trackers.find((item) => item.id === trackerId); };
  const resetClock = (participantId, trackerId) => { const tracker = findClock(participantId, trackerId); if (!tracker) return; actions.trackerChange(participantId, trackerId, { ...tracker, current: 0 }); };
  const deleteClock = (participantId, trackerId) => actions.deleteTracker(participantId, trackerId);
  const participantsIncompatibles = useMemo(() => initiativeMismatch?.sceneId === scene.id
    ? scene.participants.filter((participant) => initiativeMismatch.ids.includes(participant.id))
    : [], [initiativeMismatch, scene.id, scene.participants]);
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
  const validerSaisieInitiatives = (valuesById, surprisedIds, departagesById, initiativeBonusesById) => {
    if (initiativeEntryInitialLaunch) actions.startSceneWithInitiatives(valuesById, surprisedIds, departagesById, initiativeBonusesById);
    else actions.applyInitiativeRolls(valuesById, departagesById, initiativeBonusesById);
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

  const overlayVisible = !!(
    addSheetOpen
    || openMenu
    || notice
    || globalSheetOpen
    || clockModalOpen
    || initiativeEntryOpen
    || initiativeAdjustOpen
    || initiativeCostOpen
    || declarationActionsOpen
    || declarationAdditionTargetId
    || exportOpen
    || resetConfirmationOpen
    || timerDoneOpen
    || pendingFileChoice
    || sceneStatusOpen
    || quickRollOpen
    || participantsIncompatibles.length
    || editingTemplate
    || templateTarget
    || characters.selected
    || characters.editing
    || characters.statusTarget
    || characters.joinTarget
    || characters.lateInitiativeParticipant
    || characters.initiativeEditParticipant
  );

  const fenetresCommunes = overlayVisible ? (
    <Suspense fallback={null}>
      <AppOverlays
        campaignName={campaignName}
        scene={scene}
        randomSystem={randomSystem}
        restorePoints={restorePoints}
        dark={dark}
        themeState={themeState}
        onThemeModeChange={actions.setThemeMode}
        currentView={currentView}
        characters={characters}
        templates={templates}
        actions={actions}
        ui={ui}
        overlayState={{ addSheetOpen, openMenu, notice, globalSheetOpen, clockModalOpen, initiativeEntryOpen, initiativeEntryScopeIds, initiativeEntryInitialLaunch, initiativeAdjustOpen, initiativeCostOpen, declarationActionsOpen, declarationAdditionTargetId, exportOpen, resetConfirmationOpen, timerDoneOpen, pendingFileChoice, sceneStatusOpen, quickRollOpen, participantsIncompatibles }}
        overlayActions={{
          openAddCharacter,
          openInitiativeEntry,
          retourHub,
          ouvrirCompteurGlobal: () => setGlobalSheetOpen(true),
          ouvrirEtatScene: (statusId = '') => setSceneStatusOpen({ statusId }),
          ouvrirOptions,
          fermerAjoutPersonnage: () => setAddSheetOpen(false),
          fermerMenu: () => setOpenMenu(false),
          fermerNotice: () => setNotice(null),
          fermerCompteurGlobal: () => setGlobalSheetOpen(false),
          fermerResolutionHorloge: () => setClockModalOpen(false),
          fermerEtatScene: () => setSceneStatusOpen(false),
          fermerLanceurDes: () => setQuickRollOpen(false),
          validerEtatScene: (data) => {
            if (sceneStatusOpen?.statusId) actions.updateSceneStatus(sceneStatusOpen.statusId, data);
            else actions.addSceneStatus(data);
            setSceneStatusOpen(false);
          },
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
          fermerResetCadence: () => setResetConfirmationOpen(false),
          exportBeforeReset,
          confirmerResetCadence: resetCadence,
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
          returnToPreparationWithOptions,
          advanceRound,
          decreaseRound,
          changeRoundNumberWithAutomations,
          advanceAllAutomations,
          rewindAllAutomations,
          resetSceneTrackers,
          clearSceneStatuses,
          endTemporaryEffects,
        }}
        clockActions={{ resetClock, deleteClock }}
      />
    </Suspense>
  ) : null;
  const menuOptions = optionsOpen ? (
    <MenuOptions
      dark={dark}
      performanceState={{ preference: performancePreference, level: performanceLevel, automatic: automaticPerformanceLow }}
      themeState={themeState}
      onClose={fermerOptions}
      onPerformancePreferenceChange={setPerformancePreference}
      onThemeModeChange={actions.setThemeMode}
    />
  ) : null;

  const seuilsFondScene = useMemo(() => scene.globalTracker?.enabled
    ? activeGlobalTrackerThresholds(scene.globalTracker, Date.now() + sceneVisualTick)
      .map((seuil) => ({ tintParticipant: true, color: seuil.color || 'neutral', expired: false }))
    : [], [scene.globalTracker, sceneVisualTick]);
  const teinteScene = useMemo(() => teinteEtats([...(scene.statuses || []), ...seuilsFondScene], 'transparent', 32), [scene.statuses, seuilsFondScene]);
  const tourPrecedent = useCallback(() => nextTurn(-1), [nextTurn]);
  const tourSuivant = useCallback(() => nextTurn(1), [nextTurn]);
  const changerSurprisePreparation = useCallback((active) => actions.updateSceneField('preparationSurprise', active), [actions]);
  const ajouterEtatScene = useCallback(() => setSceneStatusOpen({}), []);
  const modifierEtatScene = useCallback((statusId) => setSceneStatusOpen({ statusId }), []);
  const modifierNotesReserve = useCallback((notes) => actions.updateSceneField('reserveNotes', notes), [actions]);
  const ouvrirMenuScene = useCallback(() => setOpenMenu(true), []);
  const ouvrirLanceurDes = useCallback(() => setQuickRollOpen(true), []);
  const sceneView = useMemo(() => (
    <SceneView
      scene={scene}
      characters={characters}
      active={active}
      activeGroup={activeGroup}
      declarationEnDeclaration={declarationEnDeclaration}
      temporaliteSouple={temporaliteSouple}
      temporalitePhases={temporalitePhases}
      temporaliteDeclaration={temporaliteDeclaration}
      phaseActive={phaseActive}
      phaseActiveId={phaseActiveId}
      phaseAttendRelanceInitiative={phaseAttendRelanceInitiative}
      horlogesBloquantesActives={horlogesBloquantesActives}
      roundEffect={roundEffect}
      globalAutoTick={globalAutoTick}
      classeSuivantEffective={classeSuivantEffective}
      nextLabel={nextLabel}
      suivantDesactive={suivantDesactive}
      retourPossible={retourPossible}
      retourPreparationVisible={retourPreparationVisible}
      toutLeMondeAJoueSouple={toutLeMondeAJoueSouple}
      phaseDemarreNouveauRound={phaseDemarreNouveauRound}
      nextStartsRound={nextStartsRound}
      libelleBas={libelleBas}
      dark={dark}
      performanceLow={performanceLow}
      onRetourHub={retourHub}
      onTourPrecedent={tourPrecedent}
      onTourSuivant={tourSuivant}
      onRetourPreparation={returnToPreparation}
      onModifierCompteurGlobal={actions.stepGlobal}
      onToggleCompteurTemps={toggleGlobalRealtime}
      onToggleSurprisePreparation={changerSurprisePreparation}
      onAjouterEtatScene={ajouterEtatScene}
      onModifierEtatScene={modifierEtatScene}
      onRetirerEtatScene={actions.removeSceneStatus}
      onMarquerAJoue={marquerAJoue}
      onAnnulerAJoue={annulerAJoue}
      onModifierNotesReserve={modifierNotesReserve}
      onAjouterParticipant={openAddCharacter}
      onSaisirInitiatives={openInitiativeEntry}
      onOuvrirLanceurDes={ouvrirLanceurDes}
      onOuvrirMenu={ouvrirMenuScene}
    />
  ), [actions.removeSceneStatus, actions.stepGlobal, active, activeGroup, ajouterEtatScene, annulerAJoue, changerSurprisePreparation, characters, classeSuivantEffective, dark, declarationEnDeclaration, globalAutoTick, horlogesBloquantesActives, libelleBas, marquerAJoue, modifierEtatScene, modifierNotesReserve, nextLabel, nextStartsRound, openAddCharacter, openInitiativeEntry, ouvrirLanceurDes, ouvrirMenuScene, performanceLow, phaseActive, phaseActiveId, phaseAttendRelanceInitiative, phaseDemarreNouveauRound, retourHub, retourPossible, retourPreparationVisible, returnToPreparation, roundEffect, scene, suivantDesactive, temporaliteDeclaration, temporalitePhases, temporaliteSouple, toggleGlobalRealtime, tourPrecedent, tourSuivant, toutLeMondeAJoueSouple]);


  if (chargementInitialVisible) return <>{pwaUpdateBanner}<ChargementVue dark={dark} performanceLevel={performanceLevel} texte={t('app.loading.preparing')} /></>;

  if (firstRunOnboardingNeeded) {
    const genericPresets = rulePresetCatalog.filter((preset) => preset.family === rulePresetFamilies.GENERIC);
    const systemPresets = rulePresetCatalog.filter((preset) => preset.family === rulePresetFamilies.SYSTEM);
    return <>{pwaUpdateBanner}<Suspense fallback={<ChargementVue dark={dark} performanceLevel={performanceLevel} texte={t('app.loading.hub')} />}><FirstRunOnboarding dark={dark} genericPresets={genericPresets} systemPresets={systemPresets} onToggleTheme={actions.setDark} onStartPreset={startFirstRunPreset} onStartCustomRules={startFirstRunCustomRules} /></Suspense></>;
  }

  if (currentView === 'hub') return <>{pwaUpdateBanner}<div className={`app hub-app ${dark ? 'dark' : ''} ${templatePanelVisible ? 'has-template-panel' : ''}`} {...attributsApp(dark, performanceLevel)}><HubCampagne campaignName={campaignName} scene={scene} scenes={scenes} templates={templates.templates} trackerTemplates={templates.trackerTemplates} statusTemplates={templates.statusTemplates} sceneCounterTemplates={templates.sceneCounterTemplates} sceneStatusTemplates={templates.sceneStatusTemplates} ruleTemplates={templates.rulePresets} initiativeTextPresets={templates.initiativeTextPresets} rulePresetSnapshot={rulePresetSnapshot} randomSystem={randomSystem} templateCategories={templates.categories} campaignEntries={campaignEntries} fileSaveStatus={fileSaveStatus} dark={dark} performanceState={{ preference: performancePreference, level: performanceLevel, automatic: automaticPerformanceLow }} themeState={themeState} onChoisirScene={chooseScene} onNouvelleScene={newScene} onModifierScene={actions.updateSceneMeta} onDupliquerScene={actions.duplicateScene} onSupprimerScene={actions.deleteScene} onModifierReglesInitiative={actions.updateCampaignInitiativeRules} onRenommerCampagne={actions.setCampaignName} onExporter={() => setExportOpen(true)} onImporter={importCampaign} onChargerCampagneTest={loadTestCampaign} onReinitialiser={askResetCadence} onAjouterTemplateCategorie={createTemplateInCategory} onAjouterCategorieTemplate={addTemplateCategory} onRenommerCategorieTemplate={renameTemplateCategory} onSupprimerCategorieTemplate={deleteTemplateCategory} onDeplacerCategorieTemplate={templates.moveCategory} onChangerCategorieTemplate={templates.setTemplateCategory} onEditerTemplate={ouvrirEditionTemplatePersonnage} onDupliquerTemplate={duplicateTemplate} onSupprimerTemplate={templates.deleteTemplate} onAjouterTemplateSuivi={templates.createTrackerTemplate} onModifierTemplateSuivi={templates.updateTrackerTemplate} onDupliquerTemplateSuivi={templates.duplicateTrackerTemplate} onSupprimerTemplateSuivi={templates.deleteTrackerTemplate} onAjouterTemplateEtat={templates.createStatusTemplate} onModifierTemplateEtat={templates.updateStatusTemplate} onDupliquerTemplateEtat={templates.duplicateStatusTemplate} onSupprimerTemplateEtat={templates.deleteStatusTemplate} onAjouterTemplateCompteurScene={templates.createSceneCounterTemplate} onModifierTemplateCompteurScene={templates.updateSceneCounterTemplate} onDupliquerTemplateCompteurScene={templates.duplicateSceneCounterTemplate} onSupprimerTemplateCompteurScene={templates.deleteSceneCounterTemplate} onAjouterTemplateEtatScene={templates.createSceneStatusTemplate} onModifierTemplateEtatScene={templates.updateSceneStatusTemplate} onDupliquerTemplateEtatScene={templates.duplicateSceneStatusTemplate} onSupprimerTemplateEtatScene={templates.deleteSceneStatusTemplate} onAppliquerTemplateRegles={actions.applyCampaignRulePreset} onEnregistrerTemplateRegles={templates.saveRuleTemplate} onEnregistrerPresetInitiativeTextuelle={templates.saveInitiativeTextPreset} onDupliquerTemplateRegles={templates.duplicateRuleTemplate} onSupprimerTemplateRegles={templates.deleteRuleTemplate} onImporterTemplates={importTemplatesFromCampaign} onExporterBibliotheque={exportTemplateLibrary} onFermerEditeursTemplates={fermerEditeursTemplates} templatePersonnageId={editingTemplateId} templatePersonnageOuvert={!!editingTemplate} onFermerEditionTemplatePersonnage={fermerEditionTemplatePersonnage} onDemanderChangementDepuisTemplatePersonnage={setTemplateSwitchRequest} onTemplatePanelOpenChange={setTemplatePanelOpen} onPerformancePreferenceChange={setPerformancePreference} onThemeModeChange={actions.setThemeMode} />{fenetresCommunes}{menuOptions}</div></>;

  return <><Suspense fallback={<ChargementVue dark={dark} performanceLevel={performanceLevel} texte={t('app.loading.scene')} />}><div className={`app scene-app ${dark ? 'dark' : ''} ${teinteScene ? 'scene-status-tinted' : ''}`} style={teinteScene ? { '--scene-status-tint-gradient': teinteScene.gradient } : undefined} {...attributsApp(dark, performanceLevel)}>{sceneView}{fenetresCommunes}{menuOptions}</div></Suspense></>;
}





