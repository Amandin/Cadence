import { describe, expect, it } from 'vitest';
import { addOnboardingTrackerTemplates, onboardingTrackerTemplatesForPreset } from './onboardingTrackerTemplates.js';

describe('onboarding tracker templates', () => {
  it('adapts the template count to the selected system', () => {
    expect(onboardingTrackerTemplatesForPreset({ catalogId: 'systemes/narratif-sans-initiative-pbta-vtm' })).toHaveLength(2);
    expect(onboardingTrackerTemplatesForPreset({ catalogId: 'systemes/cosmere-rpg' })).toHaveLength(3);
    expect(onboardingTrackerTemplatesForPreset({ catalogId: 'systemes/appel-de-cthulhu-7e' })).toHaveLength(4);
    expect(onboardingTrackerTemplatesForPreset({ catalogId: 'systemes/shadowrun-5' })).toHaveLength(4);
  });

  it('creates system-specific tracker shapes', () => {
    const savageWorlds = onboardingTrackerTemplatesForPreset({ catalogId: 'systemes/savage-worlds' });
    const shadowrun = onboardingTrackerTemplatesForPreset({ catalogId: 'systemes/shadowrun-5' });

    expect(savageWorlds.map((template) => template.tracker.type)).toEqual(['boxes', 'boxes', 'points']);
    expect(savageWorlds[0].tracker.blocks[0].lines[0].boxes).toHaveLength(3);
    expect(savageWorlds[1].tracker.blocks[0].lines[0].boxes).toHaveLength(2);
    expect(shadowrun[0].tracker.blocks[0].lines[0].boxes).toHaveLength(10);
  });

  it('uses restrained generic defaults for generic and custom starts', () => {
    expect(onboardingTrackerTemplatesForPreset(null).map((template) => template.tracker.type)).toEqual(['bar', 'points']);
    expect(onboardingTrackerTemplatesForPreset({ catalogId: 'generiques/classique' })).toHaveLength(2);
  });

  it('preserves an existing template instead of adding a duplicate name', () => {
    const existing = {
      trackerTemplates: [{
        id: 'existing-health',
        name: 'Points de vie',
        tracker: { id: 'template-tracker', type: 'bar', name: 'Points de vie', current: 42, initial: 42, min: 0, max: 42 },
      }],
    };

    const result = addOnboardingTrackerTemplates(existing, { catalogId: 'systemes/d20-tactique-dd-pathfinder' });

    expect(result.trackerTemplates.filter((template) => template.name === 'Points de vie')).toHaveLength(1);
    expect(result.trackerTemplates.find((template) => template.name === 'Points de vie')?.tracker.max).toBe(42);
    expect(result.trackerTemplates).toHaveLength(3);
  });
});
