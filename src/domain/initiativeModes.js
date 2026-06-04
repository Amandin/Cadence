import {
  activationAdvancePolicies,
  defaultActivationAdvancePolicy,
  defaultDeclarationMode,
  defaultInitiativeValueType,
  defaultPhaseActionMode,
  defaultPhaseCount,
  defaultPhaseDecrement,
  initiativeOrders,
  initiativeValueTypes,
  phaseActionModes,
  temporalityModes,
} from '../constants.js';
import { ordreCreneauxClassique, participantsPourPhase, phaseSuivanteExiste, trierParInitiative } from './initiative.js';
import { rulesAllowMultipleSlots } from './initiativeCost.js';

export const declarationStages = { DECLARATION: 'declaration', RESOLUTION: 'resolution' };

const arr = (value) => Array.isArray(value) ? value : [];
const txt = (value) => String(value ?? '').trim();
const key = (value) => txt(value).toLowerCase();
const num = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const obj = (value) => value && typeof value === 'object' && !Array.isArray(value);
const uniq = (value) => {
  const seen = new Set();
  return arr(value).map(txt).filter(Boolean).filter((item) => {
    const normalized = key(item);
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
};
const opt = (scene) => ({ categoryOrder: scene.categoryOrder, equalityRule: scene.equalityRule, initiativeOrder: scene.initiativeOrder, initiativeTextOrder: scene.initiativeTextOrder, initiativeEnabled: scene.temporalite !== temporalityModes.FLEXIBLE || scene.flexibleUseInitiative !== false, tiebreakerVisible: scene.tiebreakerVisible !== false, multipleActionSlots: rulesAllowMultipleSlots(scene) });

export const isDeclarationMode = (scene) => !!scene?.declarationMode || scene?.temporalite === temporalityModes.DECLARATION;
export const isCheckedPhaseMode = (scene) => scene?.phaseActionMode === phaseActionModes.CHECKED;
export const usesLabelInitiative = (scene) => scene?.initiativeValueType === initiativeValueTypes.LABEL;

export function normalizePhaseCount(value, fallback = defaultPhaseCount) {
  return Math.max(1, Math.min(20, num(value, fallback)));
}

export function phaseKeys(scene = {}) {
  if (Array.isArray(scene.phaseOrder) && scene.phaseOrder.length) return uniq(scene.phaseOrder);
  return Array.from({ length: normalizePhaseCount(scene.phaseCount) }, (_, index) => String(index + 1));
}

export function normalizeInitiativeModeOptions(raw = {}) {
  const legacyDeclaration = raw.temporalite === temporalityModes.DECLARATION;
  return {
    declarationMode: raw.declarationMode ?? (legacyDeclaration ? true : defaultDeclarationMode),
    phaseActionMode: Object.values(phaseActionModes).includes(raw.phaseActionMode) ? raw.phaseActionMode : defaultPhaseActionMode,
    phaseCount: normalizePhaseCount(raw.phaseCount),
    initiativeValueType: Object.values(initiativeValueTypes).includes(raw.initiativeValueType) ? raw.initiativeValueType : defaultInitiativeValueType,
    initiativeLabels: uniq(raw.initiativeLabels),
    multipleActionSlots: raw.multipleActionSlots !== false,
    activationAdvancePolicy: Object.values(activationAdvancePolicies).includes(raw.activationAdvancePolicy) ? raw.activationAdvancePolicy : defaultActivationAdvancePolicy,
    declarationRequireText: !!raw.declarationRequireText,
  };
}

export const initiativeLabelRank = (value, labels = []) => {
  const index = uniq(labels).findIndex((item) => key(item) === key(value));
  return index >= 0 ? index : null;
};

export const initiativeSortValue = (value, rules = {}) => (
  usesLabelInitiative(rules)
    ? (initiativeLabelRank(value, rules.initiativeLabels) ?? (txt(value) || 'zzzz'))
    : num(value, 0)
);

export function compareInitiativeValues(a, b, rules = {}) {
  const direction = rules.initiativeOrder === initiativeOrders.ASC ? 1 : -1;
  const left = initiativeSortValue(a, rules);
  const right = initiativeSortValue(b, rules);
  return typeof left === 'number' && typeof right === 'number'
    ? (left - right) * direction
    : String(left).localeCompare(String(right), 'fr', { numeric: true, sensitivity: 'base' }) * direction;
}

export const normalizeParticipantPhaseActions = (participant) => uniq(participant?.phaseActions || participant?.phases || participant?.checkedPhases);
export const participantActsInCheckedPhase = (participant, phase = 1) => normalizeParticipantPhaseActions(participant).some((item) => key(item) === key(phase));
export const checkedPhaseKeys = (participants = [], fallback = []) => uniq([...fallback, ...arr(participants).flatMap(normalizeParticipantPhaseActions)]);

export function participantsPourPhaseAvancee(scene = {}, phase = scene.phase || 1) {
  return isCheckedPhaseMode(scene)
    ? trierParInitiative(arr(scene.participants).filter((participant) => participantActsInCheckedPhase(participant, phase)), opt(scene))
    : participantsPourPhase(scene.participants || [], phase, scene.phaseDecrement || defaultPhaseDecrement, opt(scene));
}

export function participantsHorsPhaseAvancee(scene = {}, phase = scene.phase || 1) {
  const actifs = new Set(participantsPourPhaseAvancee(scene, phase).map((participant) => participant.id));
  return arr(scene.participants).filter((participant) => !actifs.has(participant.id));
}

export function phaseSuivanteAvanceeExiste(scene = {}, phase = scene.phase || 1) {
  if (!isCheckedPhaseMode(scene)) return phaseSuivanteExiste(scene.participants || [], phase, scene.phaseDecrement || defaultPhaseDecrement, opt(scene));
  const keys = phaseKeys(scene);
  const index = keys.findIndex((item) => key(item) === key(phase));
  return index >= 0 && keys.slice(index + 1).some((item) => participantsPourPhaseAvancee({ ...scene, phase: item }, item).length > 0);
}

export function phaseSuivanteAvancee(scene = {}, phase = scene.phase || 1) {
  if (!isCheckedPhaseMode(scene)) return Number(phase || 1) + 1;
  const keys = phaseKeys(scene);
  const index = keys.findIndex((item) => key(item) === key(phase));
  return keys.slice(Math.max(0, index) + 1).find((item) => participantsPourPhaseAvancee({ ...scene, phase: item }, item).length > 0) || keys[index] || keys[0] || '1';
}

export function premierePhaseAvancee(scene = {}) {
  if (!isCheckedPhaseMode(scene)) return 1;
  return phaseKeys(scene).find((phase) => participantsPourPhaseAvancee({ ...scene, phase }, phase).length > 0) || phaseKeys(scene)[0] || '1';
}

export function normalizeDeclarations(declarations = {}, participants = []) {
  const ids = new Set(arr(participants).map((participant) => participant.id));
  return Object.fromEntries(Object.entries(obj(declarations) ? declarations : {}).map(([id, value]) => [String(id), txt(value)]).filter(([id, value]) => ids.has(id) && value));
}

export function setDeclaration(scene = {}, participantId, value) {
  const declarations = normalizeDeclarations(scene.declarations, scene.participants || []);
  const clean = txt(value);
  if (clean) declarations[participantId] = clean;
  else delete declarations[participantId];
  return { ...scene, declarations };
}

export const clearDeclarations = (scene) => ({ ...scene, declarations: {}, resolutionOrder: [], declarationStage: declarationStages.DECLARATION, activeId: '', activeSlotId: '' });
export const declarationStage = (scene) => scene?.declarationStage === declarationStages.RESOLUTION ? declarationStages.RESOLUTION : declarationStages.DECLARATION;

function declarants(scene = {}) {
  const declarations = normalizeDeclarations(scene.declarations, scene.participants || []);
  const declared = arr(scene.participants).filter((participant) => declarations[participant.id]);
  return scene.declarationRequireText && declared.length ? declared : scene.participants || [];
}

export const declarationResolutionSlots = (scene = {}, rules = scene) => ordreCreneauxClassique(declarants(scene), { ...opt(scene), ...opt(rules) });

export function orderedDeclarationResolutionSlots(scene = {}, rules = scene) {
  const slots = declarationResolutionSlots(scene, rules);
  const order = arr(scene.resolutionOrder);
  if (!order.length) return slots;
  const byId = new Map(slots.map((slot) => [slot.actionSlotId || slot.id, slot]));
  const ordered = order.map((id) => byId.get(id)).filter(Boolean);
  const used = new Set(ordered.map((slot) => slot.actionSlotId || slot.id));
  return [...ordered, ...slots.filter((slot) => !used.has(slot.actionSlotId || slot.id))];
}

export function enterDeclarationResolution(scene = {}, rules = scene) {
  const slots = declarationResolutionSlots(scene, rules);
  const first = slots[0];
  return { ...scene, declarationStage: declarationStages.RESOLUTION, resolutionOrder: slots.map((slot) => slot.actionSlotId || slot.id), activeId: first?.id || '', activeSlotId: first?.actionSlotId || '' };
}

export const shouldAdvanceActivationForAction = (scene = {}, participantId) => scene.activationAdvancePolicy === activationAdvancePolicies.EVERY_ACTION ? true : !!participantId && !arr(scene.activatedThisRound).includes(String(participantId));
export const markActivationAdvanced = (scene = {}, participantId) => !participantId || scene.activationAdvancePolicy === activationAdvancePolicies.EVERY_ACTION ? scene : { ...scene, activatedThisRound: [...new Set([...arr(scene.activatedThisRound), String(participantId)])] };
export const resetRoundActivationMarks = (scene) => ({ ...scene, activatedThisRound: [] });

export function applyManualActionCost(participant = {}, cost = 0) {
  const cleanCost = Math.max(0, num(cost, 0));
  const initiative = num(participant.initiative, null);
  if (!cleanCost || initiative == null) return participant;
  return {
    ...participant,
    initiative: initiative - cleanCost,
    actionSlots: arr(participant.actionSlots).map((slot, index) => index ? slot : { ...slot, initiative: num(slot.initiative, initiative) - cleanCost }),
  };
}
