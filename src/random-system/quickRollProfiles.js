import { quickRollProfileById } from '../domain/systemProfiles.js';
import { enableRandomKitDefinitionsInState } from './rulePresetKits.js';

export function enableQuickRollProfilesInState(state, profileIds = []) {
  const uniqueProfileIds = [...new Set(Array.isArray(profileIds) ? profileIds : [])];
  return uniqueProfileIds.reduce((nextState, profileId) => {
    const profile = quickRollProfileById(profileId);
    if (!profile) return nextState;
    return enableRandomKitDefinitionsInState(nextState, profile.kitId, profile.definitionIds);
  }, state);
}
