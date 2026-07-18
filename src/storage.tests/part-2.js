import { describe, expect, it } from 'vitest';
import { CADENCE_CAMPAIGN_FORMAT, CADENCE_CAMPAIGN_SCHEMA_VERSION, campaignNameFromPayload, campaignProfileFromPayload, isValidCampaign, normalizeCampaignName, normalizeCampaignPayload, serializeCampaign } from '.././storage.js';
import { normalizeTemplateStore } from '.././templates.js';

const scene = { id: 'scene-1', title: 'Test', participants: [] };

function campaignPayload(patch = {}) {
  const name = patch.name || 'Campagne test';
  return {
    format: CADENCE_CAMPAIGN_FORMAT,
    schemaVersion: CADENCE_CAMPAIGN_SCHEMA_VERSION,
    campaign: { id: 'campagne-test', name, folderName: 'campagne-test', fileName: 'campagne-test.cad' },
    name,
    scenes: [scene],
    ...patch,
  };
}

describe('campaign storage', () => {
  it('keeps numeric tracker reset configuration when normalizing and serializing', () => {
    const sourceScene = {
      id: 'scene-trackers',
      title: 'Suivis',
      participants: [{
        id: 'pj-trackers',
        name: 'Gardienne',
        trackers: [{
          id: 'bar-overflow',
          type: 'bar',
          current: 15,
          min: 0,
          max: 10,
          resetRule: { excessReductionPercent: 50, underflowRecoveryPercent: 25, multiplier: 2, barAutoMode: 'decrease' },
        }],
      }],
    };

    const campaign = normalizeCampaignPayload({ version: '0.2.8.5', scenes: [sourceScene] });
    const tracker = campaign.scenes[0].participants[0].trackers[0];
    expect(tracker.resetRule).toMatchObject({ excessReductionPercent: 50, underflowRecoveryPercent: 25, percent: 200, barAutoMode: 'limit', rounding: 'floor' });

    const serialized = JSON.parse(serializeCampaign(campaign.scenes, false, 'Suivis', null, campaign.initiativeRules));
    expect(serialized.scenes[0].participants[0].trackers[0].resetRule).toMatchObject({ excessReductionPercent: 50, underflowRecoveryPercent: 25, percent: 200, barAutoMode: 'limit', rounding: 'floor' });
  });

  it('normalizes obsolete bar steps when serializing current scenes', () => {
    const sourceScene = {
      id: 'scene-bar-step',
      title: 'Barres',
      participants: [{
        id: 'pj-bar-step',
        name: 'Gardienne',
        trackers: [{ id: 'pv', type: 'bar', current: 8, max: 10, step: 5 }],
      }],
    };

    const serialized = JSON.parse(serializeCampaign([sourceScene], false, 'Barres'));

    expect(serialized.scenes[0].participants[0].trackers[0]).toMatchObject({ type: 'bar', step: 1 });
  });

  it('keeps more than two thresholds through normalization and serialization', () => {
    const sourceScene = {
      id: 'scene-thresholds',
      title: 'Seuils',
      participants: [{
        id: 'pj-thresholds',
        name: 'Vigie',
        trackers: [{
          id: 'ressources',
          type: 'number',
          current: 10,
          thresholds: [
            { value: 3, label: 'bas', operator: 'gte', color: 'green' },
            { value: 6, label: 'moyen', operator: 'gte', color: 'amber' },
            { value: 9, label: 'haut', operator: 'gte', color: 'red' },
            { value: 10, label: 'exact', operator: 'eq', color: 'violet' },
            { value: 12, operator: 'gte', color: 'blue' },
          ],
        }],
      }],
    };

    const campaign = normalizeCampaignPayload({ version: '0.2.9.2', scenes: [sourceScene] });
    expect(campaign.scenes[0].participants[0].trackers[0].thresholds).toHaveLength(5);

    const serialized = JSON.parse(serializeCampaign(campaign.scenes, false, 'Seuils', null, campaign.initiativeRules));
    expect(serialized.scenes[0].participants[0].trackers[0].thresholds.map((threshold) => threshold.label)).toEqual(['bas', 'moyen', 'haut', 'exact', '']);
  });

  it('keeps the block based box tracker structure and ignores old rows', () => {
    const campaign = normalizeCampaignPayload({
      version: '0.2.9.1',
      scenes: [{
        id: 'scene-boxes',
        title: 'Cases',
        participants: [{
          id: 'pj-boxes',
          name: 'Cartographe',
          trackers: [{
            id: 'boxes',
            type: 'boxes',
            fillLevels: 3,
            rows: [{ id: 'old-row', label: 'Ancien', marks: [3, 3, 3] }],
            blocks: [{
              id: 'block-b',
              label: 'B',
              order: 1,
              lines: [{ id: 'line-b', label: 'B1', order: 0, boxes: [{ id: 'b2', position: 2, mark: 1 }, { id: 'b0', position: 0, mark: 2 }] }],
            }, {
              id: 'block-a',
              label: 'A',
              order: 0,
              lines: [{ id: 'line-a', label: 'A1', order: 0, boxes: [{ id: 'a0', position: 0, mark: 3 }] }],
            }],
          }],
        }],
      }],
    });

    const tracker = campaign.scenes[0].participants[0].trackers[0];
    expect(tracker.rows).toBeUndefined();
    expect(tracker.blocks.map((block) => block.id)).toEqual(['block-a', 'block-b']);
    expect(tracker.blocks[1].lines[0].boxes.map((box) => box.position)).toEqual([0, 1]);
  });

  it('gives legacy clocks their previous activation behavior when no moment is stored', () => {
    const campaign = normalizeCampaignPayload({
      version: '0.2.8.6',
      scenes: [{
        id: 'scene-clocks',
        title: 'Horloges',
        participants: [{
          id: 'pj-clock',
          name: 'Veilleuse',
          trackers: [{ id: 'clock', type: 'clock', current: 0, max: 4 }],
        }],
      }],
    });

    expect(campaign.scenes[0].participants[0].trackers[0].autoReset).toBe('activation');
  });

  it('rejects random JSON with only a scenes array', () => {
    expect(isValidCampaign({ scenes: [scene] })).toBe(false);
  });

  it('rejects malformed campaign payloads', () => {
    expect(isValidCampaign(null)).toBe(false);
    expect(isValidCampaign({ format: CADENCE_CAMPAIGN_FORMAT, schemaVersion: CADENCE_CAMPAIGN_SCHEMA_VERSION, scenes: [] })).toBe(false);
    expect(isValidCampaign({ format: CADENCE_CAMPAIGN_FORMAT, schemaVersion: CADENCE_CAMPAIGN_SCHEMA_VERSION, scenes: ['bad'] })).toBe(false);
    expect(isValidCampaign({ format: CADENCE_CAMPAIGN_FORMAT, schemaVersion: CADENCE_CAMPAIGN_SCHEMA_VERSION, scenes: [scene], settings: [] })).toBe(false);
    expect(isValidCampaign({ format: CADENCE_CAMPAIGN_FORMAT, schemaVersion: CADENCE_CAMPAIGN_SCHEMA_VERSION, scenes: [scene], name: 42 })).toBe(false);
  });
});
