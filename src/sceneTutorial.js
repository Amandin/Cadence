export const SCENE_TUTORIAL_STORAGE_KEY = 'cadence:tutorial:first-scene:v1';

export const sceneTutorialSteps = Object.freeze({
  ADD_PARTICIPANT: 0,
  CHOOSE_SOURCE: 1,
  IDENTITY: 2,
  QUICK_INFO: 3,
  ADD_INDICATOR: 4,
  CONFIGURE_INDICATOR: 5,
  SAVE_CHARACTER: 6,
  DONE: 7,
});

const lastStep = sceneTutorialSteps.DONE;

export function readSceneTutorial() {
  try {
    const value = JSON.parse(window.localStorage.getItem(SCENE_TUTORIAL_STORAGE_KEY) || 'null');
    if (value?.active && Number.isInteger(value.step)) return { active: true, step: Math.max(0, Math.min(lastStep, value.step)) };
  } catch {
    // Le tutoriel reste facultatif si le stockage local est indisponible.
  }
  return { active: false, step: 0 };
}

export function writeSceneTutorial(value) {
  const normalized = value?.active ? { active: true, step: Math.max(0, Math.min(lastStep, Number(value.step) || 0)) } : { active: false, step: 0 };
  try { window.localStorage.setItem(SCENE_TUTORIAL_STORAGE_KEY, JSON.stringify(normalized)); } catch { /* Session courante uniquement. */ }
  return normalized;
}

export function advanceSceneTutorial(value, scene = {}, ui = {}) {
  if (!value?.active) return { active: false, step: 0 };
  let step = Math.max(0, Math.min(lastStep, Number(value.step) || 0));
  if (step === sceneTutorialSteps.ADD_PARTICIPANT && ui.addSheetOpen) step = sceneTutorialSteps.CHOOSE_SOURCE;
  if (step === sceneTutorialSteps.CHOOSE_SOURCE && ui.editingCharacter) step = sceneTutorialSteps.IDENTITY;
  if (step >= sceneTutorialSteps.IDENTITY && step <= sceneTutorialSteps.SAVE_CHARACTER && !ui.editingCharacter && (scene.participants || []).length > 0) step = sceneTutorialSteps.DONE;
  return { active: true, step };
}

export function resetSceneTutorial() {
  try { window.localStorage.removeItem(SCENE_TUTORIAL_STORAGE_KEY); } catch { /* Le reset principal continue. */ }
}
