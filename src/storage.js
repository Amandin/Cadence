import { APP_VERSION, STORAGE_KEY } from './constants.js';
import { makeDefaultCampaign } from './logic.js';

export function loadCampaign() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (isValidCampaign(saved)) return saved;
  } catch (error) {
    console.warn('Impossible de charger la campagne sauvegardée.', error);
  }

  return makeDefaultCampaign();
}

export function saveCampaign(scenes, dark) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: APP_VERSION, scenes, settings: { dark } }));
}

export function serializeCampaign(scenes, dark) {
  return JSON.stringify({ version: APP_VERSION, scenes, settings: { dark } }, null, 2);
}

export function isValidCampaign(data) {
  return Array.isArray(data?.scenes) && data.scenes.length > 0;
}
