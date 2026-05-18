import { describe, expect, it } from 'vitest';
import { CADENCE_CAMPAIGN_FORMAT, CADENCE_CAMPAIGN_SCHEMA_VERSION, campaignNameFromPayload, isValidCampaign, normalizeCampaignName, normalizeCampaignPayload, serializeCampaign } from './storage.js';

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
    expect(data.initiativeRules).toBeTruthy();
    expect(data.scenes).toHaveLength(1);
    expect(data.scenes[0]).toMatchObject({ id: 'scene-1', title: 'Test', participants: [], reserve: [] });
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

  it('repairs hand-edited campaign scenes before they enter app state', () => {
    const campaign = normalizeCampaignPayload({
      format: CADENCE_CAMPAIGN_FORMAT,
      schemaVersion: CADENCE_CAMPAIGN_SCHEMA_VERSION,
      name: 'Table bricolée',
      initiativeRules: { temporalite: 'classique', phaseDecrement: '10' },
      scenes: [{
        id: 'scene-bricolee',
        title: 'JSON à la main',
        round: '3',
        phase: '2',
        participants: [{
          id: 'pj-1',
          name: 'Ariane',
          kind: 'Opposition',
          initiative: '12',
          departage: '2',
          trackers: [{ id: 'pv', type: 'bar', current: '7', max: '10' }],
          statuses: [{ id: 's1', name: 'Sonnée', duration: '2', remaining: '1' }],
        }],
      }],
    });

    expect(campaign.scenes[0]).toMatchObject({
      id: 'scene-bricolee',
      title: 'JSON à la main',
      round: 3,
      phase: 1,
      reserve: [],
      reserveNotes: '',
    });
    expect(campaign.scenes[0].participants[0]).toMatchObject({
      id: 'pj-1',
      name: 'Ariane',
      kind: 'Opposant',
      initiative: 12,
      departage: 2,
      stats: [],
    });
    expect(campaign.scenes[0].participants[0].trackers[0]).toMatchObject({ type: 'bar', current: 7, max: 10, visible: true });
    expect(campaign.scenes[0].participants[0].statuses[0]).toMatchObject({ duration: 2, remaining: 1, expired: false });
  });

  it('keeps reserve participants safe and out of initiative after hand edits', () => {
    const campaign = normalizeCampaignPayload({
      version: '0.2.3',
      scenes: [{
        id: 'scene-reserve',
        title: 'Réserve',
        reserve: [{ name: 'Renfort', initiative: '99', trackers: [], statuses: [] }],
        participants: [],
      }],
    });

    expect(campaign.scenes[0].reserve[0]).toMatchObject({
      name: 'Renfort',
      initiative: 0,
      kind: 'Environnement',
      trackers: [],
      statuses: [],
    });
    expect(campaign.scenes[0].reserve[0].id).toMatch(/^p-/);
  });

  it('repairs hand-edited initiative rules before saving them', () => {
    const campaign = normalizeCampaignPayload({
      version: '0.2.4',
      initiativeRules: { temporalite: 'phases', phaseDecrement: 'bad', categoryOrder: [] },
      scenes: [{ id: 'scene-rules', title: 'Règles', participants: [] }],
    });

    expect(campaign.initiativeRules).toMatchObject({
      temporalite: 'phases',
      phaseDecrement: 10,
      categoryOrder: ['PJ', 'Opposant', 'Allié', 'Environnement'],
    });
    expect(campaign.scenes[0]).toMatchObject({ temporalite: 'phases', phaseDecrement: 10 });
  });

  it('keeps preparation as the scene start state and applies the campaign start round rule', () => {
    const campaign = normalizeCampaignPayload({
      version: '0.2.4',
      initiativeRules: { startRound: 1 },
      scenes: [{ id: 'scene-prep', title: 'Preparation', round: -1, participants: [] }],
    });

    expect(campaign.initiativeRules.startRound).toBe(1);
    expect(campaign.scenes[0]).toMatchObject({ round: -1, startRound: 1 });
  });

  it('keeps editable quick stats as objects when normalizing and serializing', () => {
    const sourceScene = {
      id: 'scene-stats',
      title: 'Infos rapides',
      participants: [{
        id: 'pj-stats',
        name: 'Stat Keeper',
        stats: [
          { label: 'CA', value: '21', editable: true },
          { label: 'Armure lourde', value: '', editable: false },
        ],
      }],
    };

    const campaign = normalizeCampaignPayload({ version: '0.2.4', scenes: [sourceScene] });
    expect(campaign.scenes[0].participants[0].stats).toEqual([
      { label: 'CA', value: '21', editable: true },
      { label: 'Armure lourde', value: '', editable: false },
    ]);

    const serialized = JSON.parse(serializeCampaign(campaign.scenes, false, 'Stats', null, campaign.initiativeRules));
    expect(serialized.scenes[0].participants[0].stats[0]).toEqual({ label: 'CA', value: '21', editable: true });
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
