import { temporalityModes } from '../../constants.js';
import { rulesAllowMultipleSlots } from '../../domain/initiativeCost.js';
import { initiativeMatchesMode } from '../../domain/initiativeTextOrder.js';
import { t } from '../../i18n/index.js';
import { getCadenceLogo } from '../../uiAssets.js';
import { detectHardwarePerformanceRisk, normalizePerformancePreference, performanceLevels, PERFORMANCE_PREFERENCE_STORAGE_KEY } from '../../performanceMode.js';

const VIEW_STORAGE_KEY = 'cadence:interface:view:v1';
export const INITIAL_LOADING_MIN_MS = 180;
export const APP_SKIN = 'cadence';

export function attributsApp(dark, performanceLevel = performanceLevels.NORMAL) {
  return {
    'data-skin': APP_SKIN,
    'data-mode': dark ? 'dark' : 'light',
    'data-performance': performanceLevel,
  };
}

export function PanneauChargement({ dark, texte = t('common.loading') }) {
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

export function ChargementVue({ dark, texte = t('common.loading'), performanceLevel = performanceLevels.NORMAL }) {
  return <div className={`app ${dark ? 'dark' : ''}`} {...attributsApp(dark, performanceLevel)}><PanneauChargement dark={dark} texte={texte} /></div>;
}

export function initialView() {
  try {
    return window.sessionStorage.getItem(VIEW_STORAGE_KEY) === 'scene' ? 'scene' : 'hub';
  } catch {
    return 'hub';
  }
}

export function storedPerformancePreference() {
  try {
    return normalizePerformancePreference(window.localStorage.getItem(PERFORMANCE_PREFERENCE_STORAGE_KEY));
  } catch {
    return normalizePerformancePreference();
  }
}

export function hardwarePerformanceRisk() {
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

export function participantsInitiativeIncompatible(scene = {}) {
  if (scene.temporalite === temporalityModes.FLEXIBLE && scene.flexibleUseInitiative === false) return [];
  return (scene.participants || []).filter((participant) => initiativesDeclarees(participant, rulesAllowMultipleSlots(scene, participant)).some((initiative) => !initiativeMatchesMode(initiative, scene.initiativeTextOrder)));
}

