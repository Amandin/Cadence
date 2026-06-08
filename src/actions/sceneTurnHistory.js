import { clone } from '../logic.js';

const TURN_HISTORY_LIMIT = 40;

function sceneSansHistorique(scene = {}) {
  const { _turnHistory, ...rest } = scene;
  return rest;
}

export function empilerRetourTour(sceneAvant, sceneApres) {
  const historique = Array.isArray(sceneAvant._turnHistory) ? sceneAvant._turnHistory : [];
  return {
    ...sceneApres,
    _turnHistory: [...historique.slice(-(TURN_HISTORY_LIMIT - 1)), clone(sceneSansHistorique(sceneAvant))],
  };
}

export function depilerRetourTour(scene) {
  const historique = Array.isArray(scene._turnHistory) ? scene._turnHistory : [];
  const precedente = historique.at(-1);
  if (!precedente) return null;
  return { ...clone(precedente), _turnHistory: historique.slice(0, -1) };
}

export function restaurerDepuisHistorique(scene, fallback) {
  const historique = Array.isArray(scene._turnHistory) ? scene._turnHistory : [];
  for (let index = historique.length - 1; index >= 0; index -= 1) {
    if (historique[index].round < 0) return { ...clone(historique[index]), _turnHistory: historique.slice(0, index) };
  }
  return fallback(scene);
}
