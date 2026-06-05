import {
  defaultPhaseActionMode,
  initiativeOrders,
  multipleActionModes,
  phaseActionModes,
  temporalityLabels,
  temporalityModes,
} from '../constants.js';
import { normalizeInitiativeTextOrder } from './initiativeTextOrder.js';
import { isInitiativeCostMode, isManualMultipleActionMode, multipleActionModeFromRules } from './initiativeCost.js';

const blocked = (disabled, reason) => ({ disabled: !!disabled, reason: disabled ? reason : '' });

export const usesTextInitiative = (rules = {}) => normalizeInitiativeTextOrder(rules.initiativeTextOrder).enabled;
export const usesMultipleActionSlots = (rules = {}) => multipleActionModeFromRules(rules) !== multipleActionModes.NONE;
export const usesManualMultipleActionSlots = (rules = {}) => isManualMultipleActionMode(rules);
export const usesInitiativeCost = (rules = {}) => isInitiativeCostMode(rules);
export const usesActionAdjustment = () => false;
export const usesDeclaration = (rules = {}) => !!rules.declarationMode;
export const usesAutomaticPhases = (rules = {}) => rules.temporalite === temporalityModes.PHASES && (rules.phaseActionMode || defaultPhaseActionMode) === phaseActionModes.AUTOMATIC;
export const usesFlexibleInitiative = (rules = {}) => rules.temporalite !== temporalityModes.FLEXIBLE || rules.flexibleUseInitiative !== false;

export function temporalityPatch(rules = {}, temporalite) {
  if (temporalite === temporalityModes.PHASES && (usesTextInitiative(rules) || rules.temporalite === temporalityModes.FLEXIBLE)) return { temporalite, phaseActionMode: phaseActionModes.CHECKED };
  if (temporalite === temporalityModes.FLEXIBLE) return { temporalite, phaseActionMode: '', surpriseAdvanceOn: 'round' };
  return { temporalite };
}

export function ruleCompatibilityIssues(rules = {}) {
  const issues = [];
  const multipleSlots = usesManualMultipleActionSlots(rules);
  const initiativeCost = usesInitiativeCost(rules);
  const textInitiative = usesTextInitiative(rules);
  const declaration = usesDeclaration(rules);
  const phases = rules.temporalite === temporalityModes.PHASES;
  const flexible = rules.temporalite === temporalityModes.FLEXIBLE;

  if (phases && multipleSlots) issues.push({ id: 'phases-multiple-slots', message: 'Les phases sont incompatibles avec les actions multiples manuelles.' });
  if (initiativeCost && flexible) issues.push({ id: 'initiative-cost-flexible', message: "Les actions multiples avec cout d'initiative sont incompatibles avec le mode souple." });
  if (initiativeCost && phases) issues.push({ id: 'initiative-cost-phases', message: "Les actions multiples avec cout d'initiative sont incompatibles avec les phases." });
  if (initiativeCost && textInitiative) issues.push({ id: 'initiative-cost-labels', message: "Les actions multiples avec cout d'initiative exigent une initiative numerique." });
  if (initiativeCost && declaration) issues.push({ id: 'initiative-cost-declaration', message: "Les actions multiples avec cout d'initiative sont incompatibles avec declaration puis resolution." });
  if (initiativeCost && rules.initiativeOrder === initiativeOrders.ASC) issues.push({ id: 'initiative-cost-ascending', message: "Les actions multiples avec cout d'initiative exigent un ordre decroissant." });
  if (usesAutomaticPhases(rules) && textInitiative) issues.push({ id: 'automatic-phases-text-initiative', message: "Les phases par initiative exigent une initiative numerique. Les labels restent possibles avec les phases cochees." });
  if (flexible && rules.surpriseAdvanceOn !== 'round') issues.push({ id: 'surprise-activation-flexible', message: "En mode souple, la surprise doit prendre fin au debut du round." });

  return issues;
}

export function ruleOptionAvailability(rules = {}) {
  const multipleSlots = usesManualMultipleActionSlots(rules);
  const initiativeCost = usesInitiativeCost(rules);
  const textInitiative = usesTextInitiative(rules);
  const declaration = usesDeclaration(rules);
  const phases = rules.temporalite === temporalityModes.PHASES;
  const automaticPhases = usesAutomaticPhases(rules);
  const flexibleInitiative = usesFlexibleInitiative(rules);

  return {
    declarationMode: blocked(initiativeCost, "Desactive d'abord les actions multiples avec cout d'initiative."),
    multipleActionSlots: blocked(phases, "Les actions multiples manuelles ne sont pas disponibles avec les phases."),
    initiativeCost: blocked(
      rules.temporalite === temporalityModes.FLEXIBLE || phases || textInitiative || declaration || rules.initiativeOrder === initiativeOrders.ASC,
      rules.temporalite === temporalityModes.FLEXIBLE
        ? "Indisponible en mode souple."
        : phases
          ? "Indisponible avec les phases."
          : textInitiative
            ? "Disponible seulement avec une initiative numerique."
            : declaration
              ? "Desactive d'abord declaration puis resolution."
              : rules.initiativeOrder === initiativeOrders.ASC
                ? "Indisponible en ordre ascendant."
                : '',
    ),
    surpriseAdvanceOn: {
      activation: blocked(rules.temporalite === temporalityModes.FLEXIBLE, "En mode souple, la surprise prend fin au debut du round."),
      round: blocked(false, ''),
    },
    labelInitiative: blocked(automaticPhases || !flexibleInitiative || initiativeCost, initiativeCost ? "Desactive d'abord le cout d'initiative." : automaticPhases ? "Les phases par initiative necessitent une initiative numerique. Avec l'initiative par labels, utilise les phases cochees." : "Le mode souple sans initiative classe seulement les personnages par type puis par nom. Reactive l'initiative pour utiliser des labels."),
    temporality: {
      [temporalityModes.CLASSIC]: blocked(false, ''),
      [temporalityModes.FLEXIBLE]: blocked(initiativeCost, "Desactive d'abord le cout d'initiative."),
      [temporalityModes.PHASES]: blocked(multipleSlots || initiativeCost, initiativeCost ? "Desactive d'abord le cout d'initiative." : "Desactive d'abord les actions multiples manuelles."),
    },
    phaseActionMode: {
      [phaseActionModes.AUTOMATIC]: blocked(textInitiative || multipleSlots || initiativeCost, textInitiative ? "Les phases par initiative ne sont pas compatibles avec l'initiative par labels. Utilise les phases cochees ou repasse en initiative numerique." : initiativeCost ? "Desactive d'abord le cout d'initiative." : "Desactive d'abord les actions multiples manuelles."),
      [phaseActionModes.CHECKED]: blocked(multipleSlots || initiativeCost, initiativeCost ? "Desactive d'abord le cout d'initiative." : "Desactive d'abord les actions multiples manuelles."),
    },
  };
}

export function activeRuleSummary(rules = {}) {
  return [
    temporalityLabels[rules.temporalite || temporalityModes.CLASSIC],
    usesFlexibleInitiative(rules) ? usesTextInitiative(rules) ? 'Initiative par labels' : 'Initiative numerique' : 'Sans initiative',
    multipleActionModeFromRules(rules) === multipleActionModes.INITIATIVE_COST ? "Actions multiples avec cout d'initiative" : multipleActionModeFromRules(rules) === multipleActionModes.MANUAL ? 'Creneaux manuels' : 'Une action par personnage',
    usesDeclaration(rules) ? 'Declaration puis resolution' : '',
  ].filter(Boolean);
}
