import { describe, expect, it } from 'vitest';
import { rulePresetCatalog } from '../rulePresets.js';
import {
  initiativeProfileById,
  initiativeProfileCatalog,
  initiativeProfileStatuses,
  initiativeProfilesForSystem,
  onboardingSupportSummary,
  quickRollProfilesForSystem,
  systemProfileCatalog,
} from './systemProfiles.js';

describe('system profiles', () => {
  it('keeps stable and unique system and initiative profile ids', () => {
    expect(new Set(systemProfileCatalog.map((profile) => profile.id)).size).toBe(systemProfileCatalog.length);
    expect(new Set(initiativeProfileCatalog.map((profile) => profile.id)).size).toBe(initiativeProfileCatalog.length);
  });

  it('references a shipped rule preset only for available initiative profiles', () => {
    const presetIds = new Set(rulePresetCatalog.map((preset) => preset.catalogId));

    for (const profile of initiativeProfileCatalog) {
      if (profile.status === initiativeProfileStatuses.AVAILABLE) expect(presetIds.has(profile.rulePresetId)).toBe(true);
      else expect(profile.rulePresetId).toBe('');
    }
  });

  it('provides a shipped rules preset for every selectable initiative profile', () => {
    expect(initiativeProfilesForSystem('system/shadowrun', 'sr-5')).toMatchObject([
      { id: 'initiative/shadowrun-5-decrement', status: initiativeProfileStatuses.AVAILABLE, rulePresetId: 'systemes/shadowrun-5' },
    ]);
    expect(initiativeProfilesForSystem('system/shadowrun', 'sr-4-20a')).toMatchObject([
      { id: 'initiative/shadowrun-4-phases', status: initiativeProfileStatuses.AVAILABLE, rulePresetId: 'generiques/phases-cochees' },
    ]);
  });

  it('maps the legacy mythic boss preset to the normal d20 initiative profile without changing it', () => {
    expect(initiativeProfileById('initiative/d20-classic')).toMatchObject({
      rulePresetId: 'systemes/d20-tactique-dd-pathfinder',
      legacyRulePresetIds: ['systemes/d20-boss-mythique'],
    });
  });

  it('offers only the quick roll profiles declared by a system', () => {
    expect(quickRollProfilesForSystem('system/pbta')).toMatchObject([
      { id: 'quick-roll/pbta-2d6', kitId: 'kit-narrative-no-initiative' },
    ]);
    expect(quickRollProfilesForSystem('system/unknown')).toEqual([]);
  });

  it('groups Savage Worlds with generic systems and gates the plot die behind fast/slow initiative', () => {
    expect(initiativeProfilesForSystem('system/generic').map((profile) => profile.id)).toEqual(expect.arrayContaining([
      'initiative/savage-cards',
      'initiative/savage-group-cards',
    ]));
    expect(initiativeProfilesForSystem('system/dnd-pathfinder').map((profile) => profile.id)).toContain('initiative/cosmere-fast-slow');
    expect(quickRollProfilesForSystem('system/dnd-pathfinder', 'initiative/d20-classic').map((profile) => profile.id)).toEqual(expect.arrayContaining(['quick-roll/d20-simple', 'quick-roll/d20-core']));
    expect(quickRollProfilesForSystem('system/dnd-pathfinder', 'initiative/d20-classic').map((profile) => profile.id)).not.toContain('quick-roll/cosmere-rpg');
    expect(quickRollProfilesForSystem('system/dnd-pathfinder', 'initiative/cosmere-fast-slow').map((profile) => profile.id)).toContain('quick-roll/cosmere-rpg');
  });

  it('provides game examples instead of an abstract official label', () => {
    expect(systemProfileCatalog.find((profile) => profile.id === 'system/dnd-pathfinder')?.examples).toContain('D&D');
    expect(initiativeProfileById('initiative/cosmere-fast-slow')?.examples).toBe('Cosmere RPG');
  });

  it('describes the selected table setup in plain language', () => {
    const summary = onboardingSupportSummary({
      initiativeProfileId: 'initiative/shadowrun-5-decrement',
      randomQuickRollProfileIds: ['quick-roll/d6-pool'],
    });

    expect(summary.ready).toEqual(expect.arrayContaining(['Ordre des tours : Passes par décrément de 10.', 'Jet prêt à lancer : Pool de d6.']));
    expect(summary.yourCall[0]).toContain('Tu gardes la main');
  });
});
