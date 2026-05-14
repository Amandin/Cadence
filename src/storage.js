import { APP_VERSION, STORAGE_KEY } from './constants.js';
import { makeDefaultCampaign } from './logic.js';

export const CADENCE_CAMPAIGN_FORMAT = 'cadence-campaign';
export const CADENCE_CAMPAIGN_SCHEMA_VERSION = 1;
export const DEFAULT_CAMPAIGN_NAME = 'Campagne Cadence';

export function normalizeCampaignName(name) {
  const normalized = String(name || '').trim();
  return normalized || DEFAULT_CAMPAIGN_NAME;
}

export function createCampaignPayload(scenes, dark, campaignName = DEFAULT_CAMPAIGN_NAME) {
  return {
    format: CADENCE_CAMPAIGN_FORMAT,
    schemaVersion: CADENCE_CAMPAIGN_SCHEMA_VERSION,
    name: normalizeCampaignName(campaignName),
    version: APP_VERSION,
    scenes,
    settings: { dark },
  };
}

export function campaignNameFromPayload(data) {
  return normalizeCampaignName(data?.name || data?.settings?.campaignName);
}

export function loadCampaign() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (isValidCampaign(saved)) return saved;
  } catch (error) {
    console.warn('Impossible de charger la campagne sauvegardée.', error);
  }

  return makeDefaultCampaign();
}

export function saveCampaign(scenes, dark, campaignName) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(createCampaignPayload(scenes, dark, campaignName)));
}

export function serializeCampaign(scenes, dark, campaignName) {
  return JSON.stringify(createCampaignPayload(scenes, dark, campaignName), null, 2);
}

function hasScenes(data) {
  return Array.isArray(data?.scenes) && data.scenes.length > 0 && data.scenes.every((scene) => scene && typeof scene === 'object' && !Array.isArray(scene));
}

function hasCurrentSignature(data) {
  return data?.format === CADENCE_CAMPAIGN_FORMAT && data?.schemaVersion === CADENCE_CAMPAIGN_SCHEMA_VERSION;
}

function hasLegacySignature(data) {
  return typeof data?.version === 'string' && data.version.length > 0;
}

export function isValidCampaign(data) {
  if (!hasScenes(data)) return false;
  if (data.settings != null && (typeof data.settings !== 'object' || Array.isArray(data.settings))) return false;
  if (data.name != null && typeof data.name !== 'string') return false;
  return hasCurrentSignature(data) || hasLegacySignature(data);
}
