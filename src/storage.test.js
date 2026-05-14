import { describe, expect, it } from 'vitest';
import { CADENCE_CAMPAIGN_FORMAT, CADENCE_CAMPAIGN_SCHEMA_VERSION, campaignNameFromPayload, isValidCampaign, normalizeCampaignName, serializeCampaign } from './storage.js';

const scene = { id: 'scene-1', title: 'Test', participants: [] };

describe('campaign storage', () => {
  it('serializes campaigns with a Cadence signature and name', () => {
    const data = JSON.parse(serializeCampaign([scene], true, 'Chroniques de test'));

    expect(data).toMatchObject({
      format: CADENCE_CAMPAIGN_FORMAT,
      schemaVersion: CADENCE_CAMPAIGN_SCHEMA_VERSION,
      name: 'Chroniques de test',
      settings: { dark: true },
    });
    expect(data.scenes).toEqual([scene]);
  });

  it('normalizes empty campaign names', () => {
    expect(normalizeCampaignName('   ')).toBe('Campagne Cadence');
    expect(campaignNameFromPayload({ name: '  Ma campagne  ' })).toBe('Ma campagne');
    expect(campaignNameFromPayload({ settings: { campaignName: 'Ancien nom' } })).toBe('Ancien nom');
  });

  it('accepts current Cadence campaign files', () => {
    expect(isValidCampaign({
      format: CADENCE_CAMPAIGN_FORMAT,
      schemaVersion: CADENCE_CAMPAIGN_SCHEMA_VERSION,
      name: 'Campagne test',
      version: '0.1.75',
      scenes: [scene],
      settings: { dark: false },
    })).toBe(true);
  });

  it('keeps old Cadence JSON exports importable when they have a version', () => {
    expect(isValidCampaign({ version: '0.1.74', scenes: [scene], settings: { dark: true } })).toBe(true);
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
