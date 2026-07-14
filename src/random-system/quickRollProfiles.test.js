import { describe, expect, it } from 'vitest';
import { createDefaultRandomSystemState } from './state.js';
import { enableQuickRollProfilesInState } from './quickRollProfiles.js';

describe('quick roll profiles', () => {
  it('loads and activates only the selected quick rolls without disabling existing rolls', () => {
    const initial = enableQuickRollProfilesInState(createDefaultRandomSystemState(), ['quick-roll/d20-core']);
    const next = enableQuickRollProfilesInState(initial, ['quick-roll/d6-pool']);
    const activeIds = next.definitions.filter((definition) => definition.exposed !== false && definition.active !== false).map((definition) => definition.id);

    expect(activeIds).toEqual(expect.arrayContaining(['kit-d20-check', 'kit-d20-polyhedral', 'kit-d6-pool-successes', 'kit-d6-total']));
  });

  it('activates the selected definition subset when profiles share a kit', () => {
    const state = enableQuickRollProfilesInState(createDefaultRandomSystemState(), ['quick-roll/pbta-2d6']);

    expect(state.definitions.find((definition) => definition.id === 'kit-2d6-mod')?.active).toBe(true);
    expect(state.definitions.find((definition) => definition.id === 'kit-d10-pool-successes')?.active).toBe(false);
  });

  it('offers separate simple and advantage-aware d20 definitions', () => {
    const simple = enableQuickRollProfilesInState(createDefaultRandomSystemState(), ['quick-roll/d20-simple']);
    const advantage = enableQuickRollProfilesInState(createDefaultRandomSystemState(), ['quick-roll/d20-core']);
    expect(simple.definitions.find((definition) => definition.id === 'kit-d20-check-simple')?.active).toBe(true);
    expect(simple.definitions.find((definition) => definition.id === 'kit-d20-check')?.active).toBe(false);
    expect(advantage.definitions.find((definition) => definition.id === 'kit-d20-check')?.active).toBe(true);
  });
});
