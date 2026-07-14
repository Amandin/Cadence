import { describe, expect, it } from 'vitest';
import { CADENCE_CAMPAIGN_FORMAT, CADENCE_CAMPAIGN_SCHEMA_VERSION, campaignNameFromPayload, campaignProfileFromPayload, isValidCampaign, normalizeCampaignName, normalizeCampaignPayload, serializeCampaign } from './storage.js';
import { normalizeTemplateStore } from './templates.js';

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
  it('serializes campaigns with a Cadence signature and name', () => {
    const data = JSON.parse(serializeCampaign([scene], true, 'Chroniques de test'));

    expect(data).toMatchObject({
      format: CADENCE_CAMPAIGN_FORMAT,
      schemaVersion: CADENCE_CAMPAIGN_SCHEMA_VERSION,
      campaign: { name: 'Chroniques de test', folderName: 'chroniques-de-test', fileName: 'chroniques-de-test.cad' },
      name: 'Chroniques de test',
    });
    expect(data.settings).toBeUndefined();
    expect(data.initiativeRules).toBeTruthy();
    expect(data.scenes).toHaveLength(1);
    expect(data.scenes[0]).toMatchObject({ id: 'scene-1', title: 'Test', participants: [], reserve: [] });
  });

  it('normalizes empty campaign names', () => {
    expect(normalizeCampaignName('   ')).toBe('Campagne Cadence');
    expect(campaignNameFromPayload({ name: '  Ma campagne  ' })).toBe('Ma campagne');
    expect(campaignNameFromPayload({ settings: { campaignName: 'Ancien nom' } })).toBe('Ancien nom');
  });

  it('adds the normal tactical role to legacy participants without changing custom kinds', () => {
    const campaign = normalizeCampaignPayload({
      version: '0.15.1',
      scenes: [{
        id: 'scene-legacy-role',
        title: 'Roles',
        participants: [{ id: 'legacy-main', name: 'Escouade', kind: 'Adversaire maison' }],
        reserve: [{ id: 'legacy-reserve', name: 'Danger', kind: 'Decor vivant' }],
      }],
    });

    expect(campaign.scenes[0].participants[0]).toMatchObject({ kind: 'Adversaire maison', tacticalRole: 'normal' });
    expect(campaign.scenes[0].reserve[0]).toMatchObject({ kind: 'Decor vivant', tacticalRole: 'normal' });
  });

  it('accepts current Cadence campaign files', () => {
    expect(isValidCampaign(campaignPayload())).toBe(true);
  });

  it('drops visual settings when normalizing campaign data', () => {
    const campaign = normalizeCampaignPayload(campaignPayload({ settings: { dark: true } }));

    expect(campaign.settings).toBeUndefined();
  });

  it('rejects old Cadence JSON exports without the v2 campaign block', () => {
    expect(isValidCampaign({ version: '0.1.74', scenes: [scene], settings: { dark: true } })).toBe(false);
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
          trackers: [{ id: 'pv', type: 'bar', current: '7', max: '10', step: 5 }],
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
    expect(campaign.scenes[0].participants[0].trackers[0]).toMatchObject({ type: 'bar', current: 7, max: 10, step: 1, visible: true, thresholds: [{ value: 0, label: '< 0', color: 'red', operator: 'lt' }] });
    expect(campaign.scenes[0].participants[0].statuses[0]).toMatchObject({ duration: 2, remaining: 1, expired: false });
  });

  it('keeps scene statuses through normalization and serialization', () => {
    const campaign = normalizeCampaignPayload({
      version: '0.2.9.4',
      scenes: [{
        id: 'scene-statuses',
        title: 'Orage',
        statuses: [{ id: 'fog', name: 'Brouillard', duration: 3, remaining: 2, advanceOn: 'round' }],
        participants: [],
      }],
    });

    expect(campaign.scenes[0].statuses[0]).toMatchObject({ name: 'Brouillard', duration: 3, remaining: 2, advanceOn: 'round' });

    const serialized = JSON.parse(serializeCampaign(campaign.scenes, false, 'Scene statuses', null, campaign.initiativeRules));
    expect(serialized.scenes[0].statuses[0]).toMatchObject({ name: 'Brouillard', duration: 3, remaining: 2, advanceOn: 'round' });
  });

  it('serializes shared templates but keeps personal rule presets local', () => {
    const templates = normalizeTemplateStore({
      categories: ['PJ'],
      templates: [],
      trackerTemplates: [{ name: 'Stress', tracker: { type: 'points', name: 'Stress', current: 0, max: 5 } }],
      statusTemplates: [{ name: 'Sonne', status: { name: 'Sonne', duration: 1, inactive: true } }],
      sceneStatusTemplates: [{ name: 'Brouillard', status: { name: 'Brouillard', duration: 3, inactive: true, advanceOn: 'activation' } }],
      sceneCounterTemplates: [{ name: 'Menace maison', counter: { enabled: true, name: 'Menace', mode: 'clock', current: 2, max: 6, thresholds: [{ value: 50, label: 'moitie', basis: 'percent', operator: 'gte' }] } }],
      ruleTemplates: [{ name: 'D&D maison', rules: { temporalite: 'classique', multipleActionSlots: false } }],
    });
    const serialized = JSON.parse(serializeCampaign([scene], false, 'Templates', templates, { temporalite: 'classique' }));

    expect(serialized.templates.trackerTemplates[0]).toMatchObject({ name: 'Stress', tracker: { type: 'points', name: 'Stress' } });
    expect(serialized.templates.statusTemplates[0]).toMatchObject({ name: 'Sonne', status: { duration: 1, inactive: true } });
    expect(serialized.templates.sceneStatusTemplates[0]).toMatchObject({ name: 'Brouillard', status: { duration: 3, inactive: false, advanceOn: 'round' } });
    expect(serialized.templates.sceneCounterTemplates[0]).toMatchObject({ name: 'Menace maison', counter: { mode: 'clock', max: 6 } });
    expect(serialized.templates.ruleTemplates).toEqual([]);

    const imported = normalizeCampaignPayload(serialized);
    expect(imported.templates.trackerTemplates[0].tracker.type).toBe('points');
    expect(imported.templates.statusTemplates[0].status.inactive).toBe(true);
    expect(imported.templates.sceneStatusTemplates[0].status.inactive).toBe(false);
    expect(imported.templates.sceneStatusTemplates[0].status.advanceOn).toBe('round');
    expect(imported.templates.sceneCounterTemplates[0].counter.thresholds[0]).toMatchObject({ basis: 'percent', label: 'moitie' });
    expect(imported.templates.ruleTemplates).toEqual(normalizeTemplateStore(null).ruleTemplates);
  });

  it('stores only the applied preset snapshot next to active initiative rules', () => {
    const snapshot = {
      presetId: 'catalog:systemes/shadowrun-compatible',
      catalogId: 'systemes/shadowrun-compatible',
      name: 'Shadowrun compatible',
      family: 'system',
      system: 'Shadowrun',
      description: 'Configuration compatible non officielle.',
      source: 'catalog',
      systemProfileId: 'system/shadowrun',
      editionId: 'sr-5',
      initiativeProfileId: 'initiative/shadowrun-5-decrement',
      randomQuickRollProfileIds: ['quick-roll/d6-pool'],
      rules: { temporalite: 'phases', phaseActionMode: 'automatic', phaseDecrement: 10, phaseRerollEachRound: true },
      modified: false,
    };

    const serialized = JSON.parse(serializeCampaign([scene], false, 'Presets', null, { temporalite: 'phases', phaseActionMode: 'automatic', phaseDecrement: 10, phaseRerollEachRound: true }, snapshot));

    expect(serialized.initiativeRules).toMatchObject({ temporalite: 'phases', phaseActionMode: 'automatic', phaseDecrement: 10, phaseRerollEachRound: true });
    expect(serialized.rulePresetSnapshot).toMatchObject({
      catalogId: 'systemes/shadowrun-compatible',
      name: 'Shadowrun compatible',
      family: 'system',
      system: 'Shadowrun',
      systemProfileId: 'system/shadowrun',
      editionId: 'sr-5',
      initiativeProfileId: 'initiative/shadowrun-5-decrement',
      randomQuickRollProfileIds: ['quick-roll/d6-pool'],
      modified: false,
    });
    expect(serialized.templates.ruleTemplates).toEqual([]);
  });

  it('migrates a legacy profile selection from the preset snapshot into campaignProfile', () => {
    const campaign = normalizeCampaignPayload(campaignPayload({
      rulePresetSnapshot: {
        systemProfileId: 'system/shadowrun',
        editionId: 'sr-5',
        initiativeProfileId: 'initiative/shadowrun-5-decrement',
        randomQuickRollProfileIds: ['quick-roll/d6-pool'],
      },
    }));

    expect(campaign.campaignProfile).toEqual({
      systemProfileId: 'system/shadowrun',
      editionId: 'sr-5',
      initiativeProfileId: 'initiative/shadowrun-5-decrement',
      randomQuickRollProfileIds: ['quick-roll/d6-pool'],
    });
  });

  it('prefers the dedicated campaign profile when both formats are present', () => {
    expect(campaignProfileFromPayload({
      campaignProfile: { systemProfileId: 'system/pbta', initiativeProfileId: 'initiative/pbta-spotlight' },
      rulePresetSnapshot: { systemProfileId: 'system/shadowrun' },
    })).toMatchObject({ systemProfileId: 'system/pbta', initiativeProfileId: 'initiative/pbta-spotlight' });
  });

  it('keeps the dedicated campaign profile through a serialization round-trip', () => {
    const profile = {
      systemProfileId: 'system/shadowrun',
      editionId: 'sr-5',
      initiativeProfileId: 'initiative/shadowrun-5-decrement',
      randomQuickRollProfileIds: ['quick-roll/d6-pool'],
    };

    const serialized = JSON.parse(serializeCampaign([scene], false, 'Profil', null, {}, null, {}, null, profile));

    expect(normalizeCampaignPayload(serialized).campaignProfile).toEqual(profile);
  });

  it('roundtrips normalized .cad payloads with scenes, participants, rules and shared templates', () => {
    const sourceScene = {
      id: 'scene-roundtrip',
      title: 'Pont suspendu',
      type: 'Affrontement',
      round: 2,
      phase: 1,
      activeId: 'pj-roundtrip',
      notes: 'Vent fort.',
      statuses: [{ id: 'scene-fog', name: 'Brouillard', duration: 2, remaining: 1, advanceOn: 'round' }],
      globalTracker: { enabled: true, name: 'Menace', mode: 'clock', current: 3, max: 6, auto: true },
      participants: [{
        id: 'pj-roundtrip',
        name: 'Ariane',
        kind: 'PJ',
        tacticalRole: 'boss',
        initiative: 18,
        stats: [{ label: 'CA', value: '17', editable: true }],
        statuses: [{ id: 'haste', name: 'Hate', duration: 1, remaining: 1, limited: true }],
        trackers: [{ id: 'pv', type: 'bar', name: 'PV', current: 9, max: 12, thresholds: [{ value: 3, label: 'danger', color: 'red' }] }],
      }],
      reserve: [{
        id: 'reserve-roundtrip',
        name: 'Renfort',
        kind: 'Allie',
        tacticalRole: 'group',
        initiative: 99,
        trackers: [{ id: 'prep', type: 'clock', name: 'Preparation', current: 1, max: 4 }],
      }],
    };
    const initiativeRules = {
      temporalite: 'phases',
      phaseActionMode: 'checked',
      phaseDecrement: 5,
      phaseCount: 3,
      phaseRerollEachRound: true,
      categoryOrder: ['PJ', 'Opposant', 'Allie', 'Environnement'],
    };
    const templates = normalizeTemplateStore({
      categories: ['PJ', 'Opposant'],
      templates: [{ name: 'Eclaireuse', category: 'PJ', participant: { name: 'Eclaireuse', kind: 'PJ', initiative: 12 } }],
      trackerTemplates: [{ name: 'Stress', tracker: { type: 'points', name: 'Stress', current: 1, max: 5 } }],
      statusTemplates: [{ name: 'Sonne', status: { name: 'Sonne', duration: 1, remaining: 1 } }],
      sceneStatusTemplates: [{ name: 'Brouillard', status: { name: 'Brouillard', duration: 2, remaining: 2, advanceOn: 'round' } }],
      sceneCounterTemplates: [{ name: 'Menace', counter: { enabled: true, name: 'Menace', mode: 'clock', current: 0, max: 6 } }],
    });

    const normalized = normalizeCampaignPayload({
      format: CADENCE_CAMPAIGN_FORMAT,
      schemaVersion: CADENCE_CAMPAIGN_SCHEMA_VERSION,
      campaign: { name: 'Roundtrip', folderName: 'roundtrip', fileName: 'roundtrip.cad' },
      name: 'Roundtrip',
      initiativeRules,
      scenes: [sourceScene],
      templates,
    });
    const serialized = serializeCampaign(normalized.scenes, false, normalized.name, normalized.templates, normalized.initiativeRules, normalized.rulePresetSnapshot, normalized.campaign);
    const parsed = JSON.parse(serialized);
    const reloaded = normalizeCampaignPayload(parsed);

    expect(isValidCampaign(parsed)).toBe(true);
    expect(reloaded.campaign).toMatchObject({ name: 'Roundtrip', folderName: 'roundtrip', fileName: 'roundtrip.cad' });
    expect(reloaded.initiativeRules).toMatchObject({ temporalite: 'phases', phaseActionMode: 'checked', phaseDecrement: 5, phaseCount: 3, phaseRerollEachRound: true });
    expect(reloaded.scenes[0]).toMatchObject({
      id: 'scene-roundtrip',
      title: 'Pont suspendu',
      notes: 'Vent fort.',
      globalTracker: { enabled: true, name: 'Menace', mode: 'clock', current: 3, max: 6 },
      participants: [{ id: 'pj-roundtrip', name: 'Ariane', kind: 'PJ', tacticalRole: 'boss', initiative: 18 }],
      reserve: [{ id: 'reserve-roundtrip', name: 'Renfort', tacticalRole: 'group', initiative: 0 }],
    });
    expect(reloaded.scenes[0].statuses[0]).toMatchObject({ name: 'Brouillard', advanceOn: 'round' });
    expect(reloaded.scenes[0].participants[0].trackers[0]).toMatchObject({ id: 'pv', name: 'PV', current: 9, max: 12 });
    expect(reloaded.templates.templates[0]).toMatchObject({ name: 'Eclaireuse', category: 'PJ' });
    expect(reloaded.templates.trackerTemplates[0]).toMatchObject({ name: 'Stress', tracker: { type: 'points', name: 'Stress' } });
    expect(reloaded.templates.statusTemplates[0]).toMatchObject({ name: 'Sonne', status: { duration: 1 } });
    expect(reloaded.templates.sceneStatusTemplates[0]).toMatchObject({ name: 'Brouillard', status: { advanceOn: 'round' } });
    expect(reloaded.templates.sceneCounterTemplates[0]).toMatchObject({ name: 'Menace', counter: { mode: 'clock', max: 6 } });
  });

  it('ignores legacy campaign rule templates when opening old .cad files', () => {
    const localRuleTemplate = normalizeTemplateStore({
      ruleTemplates: [{ name: 'Local maison', rules: { temporalite: 'classique', multipleActionSlots: false } }],
    }).ruleTemplates[0];
    const fakeLocalStorage = {
      store: new Map(),
      getItem(key) { return this.store.has(key) ? this.store.get(key) : null; },
      setItem(key, value) { this.store.set(key, String(value)); },
      removeItem(key) { this.store.delete(key); },
    };
    Object.defineProperty(globalThis, 'localStorage', { value: fakeLocalStorage, configurable: true });
    globalThis.localStorage.setItem('cadence:templates:v1', JSON.stringify({ version: 3, ruleTemplates: [localRuleTemplate] }));

    const imported = normalizeCampaignPayload(campaignPayload({
      templates: {
        ruleTemplates: [{ name: 'Ancien preset embarque', rules: { temporalite: 'phases', phaseDecrement: 10 } }],
      },
    }));

    expect(imported.templates.ruleTemplates).toHaveLength(1);
    expect(imported.templates.ruleTemplates[0].name).toBe('Local maison');
    delete globalThis.localStorage;
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

  it('normalizes multiple action slots on participants', () => {
    const campaign = normalizeCampaignPayload({
      version: '0.2.10.1',
      scenes: [{
        id: 'scene-slots',
        title: 'Créneaux',
        participants: [{
          id: 'boss',
          name: 'Boss',
          initiative: 18,
          actionSlots: [{ initiative: 6 }, { initiative: 18 }, { initiative: 12 }],
        }],
      }],
    });

    expect(campaign.scenes[0].participants[0]).toMatchObject({
      initiative: 18,
      actionSlots: [
        { initiative: 18, order: 0 },
        { initiative: 12, order: 1 },
        { initiative: 6, order: 2 },
      ],
    });
  });

  it('keeps textual initiative labels and slots through normalization', () => {
    const campaign = normalizeCampaignPayload({
      version: '0.2.11.1',
      initiativeRules: {
        initiativeTextOrder: {
          enabled: true,
          separator: ' de ',
          parts: [
            { label: 'Valeur', values: ['As', 'Roi'] },
            { label: 'Couleur', values: ['Pique', 'Cœur'] },
          ],
        },
      },
      scenes: [{
        id: 'scene-text-init',
        title: 'Cartes',
        participants: [{
          id: 'duelliste',
          name: 'Duelliste',
          initiative: 'As de Cœur',
          actionSlots: [{ initiative: 'Roi de Pique' }, { initiative: 'As de Cœur' }],
        }],
      }],
    });

    expect(campaign.scenes[0].participants[0]).toMatchObject({
      initiative: 'As de Cœur',
      actionSlots: [
        { initiative: 'Roi de Pique', order: 0 },
        { initiative: 'As de Cœur', order: 1 },
      ],
    });
  });

  it('repairs hand-edited initiative rules before saving them', () => {
    const campaign = normalizeCampaignPayload({
      version: '0.2.4',
      initiativeRules: { temporalite: 'phases', phaseDecrement: 'bad', categoryOrder: [], initiativeOrder: 'asc' },
      scenes: [{ id: 'scene-rules', title: 'Règles', participants: [] }],
    });

    expect(campaign.initiativeRules).toMatchObject({
      temporalite: 'phases',
      phaseDecrement: 10,
      initiativeOrder: 'asc',
      categoryOrder: ['PJ', 'Opposant', 'Allié', 'Environnement'],
    });
    expect(campaign.scenes[0]).toMatchObject({ temporalite: 'phases', phaseDecrement: 10, initiativeOrder: 'asc' });
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

  it('adds the surprised template once when migrating old template stores', () => {
    const migrated = normalizeTemplateStore({ version: 2, statusTemplates: [{ name: 'Sonne', status: { name: 'Sonne', duration: 1 } }] });
    const afterDeletion = normalizeTemplateStore({ version: 3, statusTemplates: [] });

    expect(migrated.statusTemplates.map((template) => template.status.name)).toEqual(['Sonne', 'Surpris']);
    expect(afterDeletion.statusTemplates).toEqual([]);
  });

  it('keeps preparation surprise and limited statuses through normalization', () => {
    const campaign = normalizeCampaignPayload({
      version: '0.5.10',
      scenes: [{
        id: 'scene-surprise',
        title: 'Embuscade',
        preparationSurprise: true,
        surpriseImpact: 'inactive',
        surpriseAdvanceOn: 'round',
        participants: [{ id: 'pj', name: 'Ariane', statuses: [{ id: 'surpris', name: 'Surpris', duration: 1, remaining: 1, limited: true, skipNextActivation: true }] }],
      }],
    });

    expect(campaign.scenes[0]).toMatchObject({
      preparationSurprise: true,
      surpriseImpact: 'inactive',
      surpriseAdvanceOn: 'round',
      participants: [{ statuses: [{ name: 'Surpris', limited: false, inactive: true, skipNextActivation: true }] }],
    });
  });

  it('keeps flexible mode without initiative across normalization', () => {
    const campaign = normalizeCampaignPayload({
      version: '0.5.10',
      initiativeRules: { temporalite: 'souple', flexibleUseInitiative: false },
      scenes: [{ id: 'scene-flexible', title: 'Libre', participants: [] }],
    });

    expect(campaign.initiativeRules).toMatchObject({ temporalite: 'souple', flexibleUseInitiative: false });
    expect(campaign.scenes[0]).toMatchObject({ temporalite: 'souple', flexibleUseInitiative: false });
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
