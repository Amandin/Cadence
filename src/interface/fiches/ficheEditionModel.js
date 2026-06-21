import { phaseActionModes } from '../../constants.js';
import { normaliserCreneauxAction } from '../../domain/initiative.js';
import { initiativeValueForMode, normalizeInitiativeTextOrder } from '../../domain/initiativeTextOrder.js';
import {
  isBoxesTracker,
  isPointsTracker,
  normalizeBoxTracker,
  normalizeThresholds,
  normalizeTrackerThresholds,
  uid,
} from '../../logic.js';
import { normaliserPhaseActions } from '../initiative/EditeurPhasesParticipant.jsx';
import { serialiserInfosRapides } from './InfosRapides.jsx';

export function entierPositif(valeur, defaut = 1) {
  if (valeur === '') return defaut;
  const nombre = Number(valeur);
  return Number.isFinite(nombre) ? Math.max(1, nombre) : defaut;
}

export function nombreOuDefaut(valeur, defaut = 0) {
  if (valeur === '') return defaut;
  const nombre = Number(valeur);
  return Number.isFinite(nombre) ? nombre : defaut;
}

export function texteCreneauxAction(participant) {
  const slots = Array.isArray(participant.actionSlots) && participant.actionSlots.length ? participant.actionSlots : [{ initiative: participant.initiative ?? 0 }];
  return slots.map((slot) => slot.initiative ?? 0).join(' / ');
}

export function brouillonCreneauxAction(participant) {
  const slots = Array.isArray(participant.actionSlots) && participant.actionSlots.length ? participant.actionSlots : [{ initiative: participant.initiative ?? 0 }];
  return slots.map((slot, index) => ({
    id: slot.id || `slot-${index + 1}`,
    initiative: slot.initiative ?? participant.initiative ?? 0,
  }));
}

export function lireCreneauxAction(texte, fallback = 0) {
  const valeurs = String(texte || '').match(/-?\d+(?:[.,]\d+)?/g)?.map((valeur) => Number(valeur.replace(',', '.'))).filter(Number.isFinite) || [];
  const initiatives = valeurs.length ? valeurs : [nombreOuDefaut(fallback, 0)];
  return initiatives
    .sort((a, b) => b - a)
    .map((initiative, index) => ({ id: `slot-${index + 1}`, initiative, order: index }));
}

export function normaliserCreneauxDepuisBrouillon(brouillon, initiativeTextOrder, multipleActionSlots = true) {
  const textConfig = normalizeInitiativeTextOrder(initiativeTextOrder);
  const slotsSource = Array.isArray(brouillon._actionSlotsDraft) && brouillon._actionSlotsDraft.length
    ? brouillon._actionSlotsDraft
    : lireCreneauxAction(brouillon._actionSlotsInput, brouillon.initiative);
  const slots = multipleActionSlots ? slotsSource : slotsSource.slice(0, 1);
  const fallback = brouillon.initiative ?? slots[0]?.initiative ?? 0;
  return normaliserCreneauxAction({
    ...brouillon,
    initiative: initiativeValueForMode(fallback, textConfig),
    actionSlots: slots.map((slot, index) => ({
      id: slot.id || `slot-${index + 1}`,
      initiative: initiativeValueForMode(slot.initiative, textConfig, fallback),
      order: index,
    })),
  }, { initiativeTextOrder: textConfig, multipleActionSlots }).map((slot, index) => ({ id: `slot-${index + 1}`, initiative: slot.initiative, order: index }));
}

export function normaliserFiche(brouillon, initiativeTextOrder, phaseOptions = {}) {
  const { _actionSlotsInput, _actionSlotsDraft, ...fiche } = brouillon;
  const actionSlots = normaliserCreneauxDepuisBrouillon(brouillon, initiativeTextOrder, phaseOptions.multipleActionSlots !== false);
  const phasePatch = phaseOptions.phaseActionMode === phaseActionModes.CHECKED
    ? { phaseActions: normaliserPhaseActions(fiche.phaseActions, phaseOptions.phaseCount) }
    : {};
  return {
    ...fiche,
    ...phasePatch,
    stats: serialiserInfosRapides(fiche.stats),
    initiative: actionSlots[0]?.initiative ?? nombreOuDefaut(fiche.initiative, 0),
    initiativeBonus: nombreOuDefaut(fiche.initiativeBonus, 0),
    actionSlots,
    departage: fiche.departage === '' ? '' : nombreOuDefaut(fiche.departage, 0),
    trackers: fiche.trackers.map((suivi) => {
      if (isBoxesTracker(suivi)) {
        return normalizeBoxTracker({
          ...suivi,
          fillLevels: entierPositif(suivi.fillLevels, 1),
          resetRule: normaliserResetRule(suivi),
        });
      }
      if (suivi.type === 'number') {
        return {
          ...suivi,
          current: nombreOuDefaut(suivi.current, 0),
          initial: nombreOuDefaut(suivi.initial, suivi.current ?? 0),
          step: entierPositif(suivi.step, 1),
          counterSize: ['compact', 'normal', 'wide'].includes(suivi.counterSize) ? suivi.counterSize : 'compact',
          thresholds: normalizeTrackerThresholds(suivi.type, suivi.thresholds),
          resetRule: normaliserResetRule(suivi),
          counters: (suivi.counters || []).map((compteur) => ({
            ...compteur,
            id: compteur.id || uid('counter'),
            label: compteur.label || 'Compteur',
            current: nombreOuDefaut(compteur.current, 0),
            initial: nombreOuDefaut(compteur.initial, compteur.current ?? 0),
            min: compteur.min === '' ? '' : compteur.min ?? '',
            max: compteur.max === '' ? '' : compteur.max ?? '',
            step: entierPositif(compteur.step, 1),
            size: ['compact', 'normal', 'wide'].includes(compteur.size) ? compteur.size : 'normal',
          })),
        };
      }
      const seuilsPuces = isPointsTracker(suivi) ? {
        currentThresholds: normalizeThresholds(suivi.currentThresholds || suivi.thresholds),
        totalThresholds: normalizeThresholds(suivi.totalThresholds),
        cyclesInitial: nombreOuDefaut(suivi.cyclesInitial, 0),
        cyclesMin: suivi.cyclesMin === '' ? null : suivi.cyclesMin,
        cyclesMax: suivi.cyclesMax === '' ? null : suivi.cyclesMax,
      } : {};
      const seuilsHorloge = suivi.type === 'clock' ? {
        currentThresholds: normalizeThresholds(suivi.currentThresholds || suivi.thresholds),
        totalThresholds: normalizeThresholds(suivi.totalThresholds),
      } : {};
      return {
        ...suivi,
        ...seuilsPuces,
        ...seuilsHorloge,
        current: nombreOuDefaut(suivi.current, 0),
        initial: nombreOuDefaut(suivi.initial, suivi.type === 'bar' ? suivi.max ?? suivi.current ?? 0 : 0),
        max: suivi.max === null ? null : entierPositif(suivi.max, 1),
        min: suivi.min === null ? null : nombreOuDefaut(suivi.min, 0),
        step: suivi.type === 'bar' ? 1 : entierPositif(suivi.step, 1),
        thresholds: normalizeTrackerThresholds(suivi.type, suivi.thresholds),
        resetRule: normaliserResetRule(suivi),
      };
    }),
  };
}

export function normaliserResetRule(suivi) {
  const rule = suivi.resetRule || {};
  return {
    mode: ['initial', 'zero', 'max', 'checked', 'delta', 'boxDelta', 'towardDefault'].includes(rule.mode) ? rule.mode : 'towardDefault',
    delta: nombreOuDefaut(rule.delta, isBoxesTracker(suivi) ? -1 : 1),
    step: nombreOuDefaut(rule.step, isBoxesTracker(suivi) ? -1 : 1),
    stepMode: rule.stepMode === 'percent' ? 'percent' : 'flat',
    pointsAutoMode: ['increase', 'decrease', 'default'].includes(rule.pointsAutoMode) ? rule.pointsAutoMode : 'default',
    pointsAutoCycles: typeof rule.pointsAutoCycles === 'boolean' ? rule.pointsAutoCycles : rule.pointsAutoMode === 'default',
    counterRules: rule.counterRules && typeof rule.counterRules === 'object' ? rule.counterRules : {},
    boxBlocks: rule.boxBlocks && typeof rule.boxBlocks === 'object' ? rule.boxBlocks : {},
    minCap: rule.minCap === '' ? '' : rule.minCap ?? '',
    maxCap: rule.maxCap === '' ? '' : rule.maxCap ?? '',
    overflowTrimPercent: nombreOuDefaut(rule.overflowTrimPercent, 0),
    excessReductionPercent: rule.excessReductionPercent === '' ? '' : rule.excessReductionPercent ?? '',
    underflowRecoveryPercent: rule.underflowRecoveryPercent === '' ? '' : rule.underflowRecoveryPercent ?? '',
    rounding: ['nearest', 'floor', 'ceil'].includes(rule.rounding) ? rule.rounding : 'floor',
    amount: entierPositif(rule.amount, 1),
    skipLevels: Array.isArray(rule.skipLevels) ? rule.skipLevels.map(Number).filter((level) => Number.isFinite(level) && level > 0) : [],
    after: ['none', 'zero', 'max', 'initial'].includes(rule.after) ? rule.after : 'none',
  };
}
