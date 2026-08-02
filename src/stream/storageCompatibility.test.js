import { describe, expect, it } from 'vitest';
import {
  normalizeCampaignPayload,
  normalizeCampaignScene,
  serializeCampaign,
} from '../storage.js';

function sceneWithTracker(tracker) {
  return {
    id: 'scene-stream-storage',
    title: 'Compatibilité stream',
    participants: [{
      id: 'pj-stream-storage',
      name: 'Ariane',
      kind: 'PJ',
      trackers: [{
        id: 'tracker-stream-storage',
        type: 'bar',
        name: 'Vitalité',
        current: 7,
        min: 0,
        max: 10,
        ...tracker,
      }],
    }],
  };
}

describe('scene stream .cad compatibility', () => {
  it('keeps legacy trackers private by default when the flag is absent', () => {
    const normalized = normalizeCampaignScene(sceneWithTracker({}));

    expect(normalized.participants[0].trackers[0].streamEditable).toBe(false);
  });

  it('preserves explicit stream editability through a .cad round trip', () => {
    const scene = normalizeCampaignScene(sceneWithTracker({ streamEditable: true }));
    const serialized = JSON.parse(serializeCampaign([scene], false, 'Stream'));
    const reloaded = normalizeCampaignPayload(serialized);

    expect(reloaded.scenes[0].participants[0].trackers[0]).toMatchObject({
      id: 'tracker-stream-storage',
      streamEditable: true,
      current: 7,
    });
  });
});
