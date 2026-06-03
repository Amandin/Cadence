import {
  defaultPhaseActionMode,
  phaseActionModes,
  temporalityLabels,
  temporalityModes,
} from '../constants.js';
import { normalizeInitiativeTextOrder } from './initiativeTextOrder.js';

const blocked = (disabled, reason) => ({ disabled: !!disabled, reason: disabled ? reason : '' });

export const usesTextInitiative = (rules = {}) => normalizeInitiativeTextOrder(rules.initiativeTextOrder).enabled;
export const usesMultipleActionSlots = (rules = {}) => rules.multipleActionSlots !== false;
export const usesActionAdjustment = (rules = {}) => !!rules.promptInitiativeOnNext;
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
  const adjustment = usesActionAdjustment(rules);
  const multipleSlots = usesMultipleActionSlots(rules);
  const textInitiative = usesTextInitiative(rules);
  const declaration = usesDeclaration(rules);
  const phases = rules.temporalite === temporalityModes.PHASES;
  const flexible = rules.temporalite === temporalityModes.FLEXIBLE;

  if (adjustment && flexible) issues.push({ id: 'adjustment-flexible', message: "L'ajustement avant Suivant est incompatible avec le mode souple." });
  if (adjustment && phases) issues.push({ id: 'adjustment-phases', message: "L'ajustement avant Suivant est incompatible avec les phases." });
  if (adjustment && textInitiative) issues.push({ id: 'adjustment-text-initiative', message: "L'ajustement avant Suivant exige une initiative numerique." });
  if (adjustment && multipleSlots) issues.push({ id: 'adjustment-multiple-slots', message: "L'ajustement avant Suivant ne peut pas etre combine avec les actions multiples manuelles." });
  if (adjustment && declaration) issues.push({ id: 'adjustment-declaration', message: "L'ajustement avant Suivant est incompatible avec declaration puis resolution." });
  if (phases && multipleSlots) issues.push({ id: 'phases-multiple-slots', message: 'Les phases sont incompatibles avec les actions multiples manuelles.' });
  if (usesAutomaticPhases(rules) && textInitiative) issues.push({ id: 'automatic-phases-text-initiative', message: "Les phases par initiative exigent une initiative numerique. Les labels restent possibles avec les phases cochees." });
  if (flexible && rules.surpriseAdvanceOn !== 'round') issues.push({ id: 'surprise-activation-flexible', message: "En mode souple, la surprise doit prendre fin au debut du round." });

  return issues;
}

export function ruleOptionAvailability(rules = {}) {
  const adjustment = usesActionAdjustment(rules);
  const multipleSlots = usesMultipleActionSlots(rules);
  const textInitiative = usesTextInitiative(rules);
  const declaration = usesDeclaration(rules);
  const phases = rules.temporalite === temporalityModes.PHASES;
  const automaticPhases = usesAutomaticPhases(rules);
  const flexibleInitiative = usesFlexibleInitiative(rules);

  return {
    declarationMode: blocked(adjustment, "Desactive d'abord l'ajustement avant Suivant."),
    multipleActionSlots: blocked(phases || adjustment, phases ? "Les actions multiples manuelles ne sont pas disponibles avec les phases." : "Desactive d'abord l'ajustement avant Suivant."),
    promptInitiativeOnNext: blocked(
      rules.temporalite === temporalityModes.FLEXIBLE || phases || textInitiative || multipleSlots || declaration,
      rules.temporalite === temporalityModes.FLEXIBLE
        ? "Indisponible en mode souple."
        : phases
          ? "Indisponible avec les phases."
          : textInitiative
            ? "Disponible seulement avec une initiative numerique."
            : multipleSlots
              ? "Desactive d'abord les actions multiples manuelles."
              : "Desactive d'abord declaration puis resolution.",
    ),
    surpriseAdvanceOn: {
      activation: blocked(rules.temporalite === temporalityModes.FLEXIBLE, "En mode souple, la surprise prend fin au debut du round."),
      round: blocked(false, ''),
    },
    labelInitiative: blocked(adjustment || automaticPhases || !flexibleInitiative, adjustment ? "Desactive d'abord l'ajustement avant Suivant." : automaticPhases ? "Les phases par initiative necessitent une initiative numerique. Avec l'initiative par labels, utilise les phases cochees." : "Le mode souple sans initiative classe seulement les personnages par type puis par nom. Reactive l'initiative pour utiliser des labels."),
    temporality: {
      [temporalityModes.CLASSIC]: blocked(false, ''),
      [temporalityModes.FLEXIBLE]: blocked(adjustment, "Desactive d'abord l'ajustement avant Suivant."),
      [temporalityModes.PHASES]: blocked(adjustment || multipleSlots, adjustment ? "Desactive d'abord l'ajustement avant Suivant." : "Desactive d'abord les actions multiples manuelles."),
    },
    phaseActionMode: {
      [phaseActionModes.AUTOMATIC]: blocked(textInitiative || multipleSlots || adjustment, textInitiative ? "Les phases par initiative ne sont pas compatibles avec l'initiative par labels. Utilise les phases cochees ou repasse en initiative numerique." : multipleSlots ? "Desactive d'abord les actions multiples manuelles." : "Desactive d'abord l'ajustement avant Suivant."),
      [phaseActionModes.CHECKED]: blocked(multipleSlots || adjustment, multipleSlots ? "Desactive d'abord les actions multiples manuelles." : "Desactive d'abord l'ajustement avant Suivant."),
    },
  };
}

export function activeRuleSummary(rules = {}) {
  return [
    temporalityLabels[rules.temporalite || temporalityModes.CLASSIC],
    usesFlexibleInitiative(rules) ? usesTextInitiative(rules) ? 'Initiative par labels' : 'Initiative numerique' : 'Sans initiative',
    usesMultipleActionSlots(rules) ? 'Actions multiples' : 'Une action par personnage',
    usesDeclaration(rules) ? 'Declaration puis resolution' : '',
    usesActionAdjustment(rules) ? 'Ajustement avant Suivant' : '',
  ].filter(Boolean);
}
