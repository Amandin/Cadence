import { STORAGE_KEY } from './constants.js';
import { readLocalCampaignPayload } from './localCampaignStorage.js';

export const FIRST_RUN_ONBOARDING_STORAGE_KEY = 'cadence:onboarding:first-run:v1';

export function hasCompletedFirstRunOnboarding() {
  try {
    return window.localStorage.getItem(FIRST_RUN_ONBOARDING_STORAGE_KEY) === 'done';
  } catch {
    return false;
  }
}

export function markFirstRunOnboardingComplete() {
  try {
    window.localStorage.setItem(FIRST_RUN_ONBOARDING_STORAGE_KEY, 'done');
  } catch {
    // L'accueil reste utilisable même si le stockage local est indisponible.
  }
}

export function resetFirstRunOnboarding() {
  try {
    window.localStorage.removeItem(FIRST_RUN_ONBOARDING_STORAGE_KEY);
  } catch {
    // Le reset reste utilisable même si le stockage local est indisponible.
  }
}

export function hasSavedLocalCampaignPayload() {
  try {
    return !!readLocalCampaignPayload(STORAGE_KEY);
  } catch {
    return false;
  }
}

export function shouldShowFirstRunOnboarding() {
  return !hasSavedLocalCampaignPayload() && !hasCompletedFirstRunOnboarding();
}
