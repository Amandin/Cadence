import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCampaignActions } from './campaignActions.js';
import { isValidCampaign, serializeCampaign } from '../storage.js';

const scene = { id: 'scene-export', title: 'Export', participants: [] };

function createHarness(overrides = {}) {
  let scenes = overrides.scenes || [scene];
  let rules = overrides.rules || { temporalite: 'classique' };
  let campaignName = overrides.campaignName || 'Campagne test';
  let templates = overrides.templates || null;
  let sceneIndex = 0;
  let dark = overrides.dark ?? true;

  const calls = {
    setCampaignRules: vi.fn((next) => { rules = next; }),
    setScenes: vi.fn((next) => { scenes = typeof next === 'function' ? next(scenes) : next; }),
    setSceneIndex: vi.fn((next) => { sceneIndex = next; }),
    setDark: vi.fn((next) => { dark = next; }),
    setCampaignNameState: vi.fn((next) => { campaignName = next; }),
    setTemplateStore: vi.fn((next) => { templates = next; }),
  };

  return {
    calls,
    state: () => ({ scenes, rules, campaignName, templates, sceneIndex, dark }),
    actions: createCampaignActions({
      scenes,
      campaignRules: rules,
      setCampaignRules: calls.setCampaignRules,
      sceneIndex,
      dark,
      campaignName,
      templateStore: templates,
      setScenes: calls.setScenes,
      setSceneIndex: calls.setSceneIndex,
      setDark: calls.setDark,
      setCampaignNameState: calls.setCampaignNameState,
      setTemplateStore: calls.setTemplateStore,
    }),
  };
}

function stubSavePicker() {
  const capture = { blob: null, suggestedName: '' };
  vi.stubGlobal('window', {
    showSaveFilePicker: vi.fn(async (options) => {
      capture.suggestedName = options.suggestedName;
      capture.types = options.types;
      return {
        createWritable: async () => ({
          write: async (blob) => { capture.blob = blob; },
          close: async () => {},
        }),
      };
    }),
  });
  vi.stubGlobal('navigator', {});
  return capture;
}

describe('campaign actions export/import', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('exports a current .cad file without storing the visual theme', async () => {
    const capture = stubSavePicker();
    const { actions, calls } = createHarness({ dark: true });

    const result = await actions.exportCampaign('Chroniques test');
    const payload = JSON.parse(await capture.blob.text());

    expect(result).toMatchObject({ ok: true, method: 'picker' });
    expect(capture.suggestedName).toMatch(/^chroniques-test-\d{2}-\d{2}-\d{4}\.cad$/);
    expect(capture.types[0].accept['application/json']).toEqual(['.cad']);
    expect(isValidCampaign(payload)).toBe(true);
    expect(payload.settings).toBeUndefined();
    expect(payload.campaign.fileName).toBe('chroniques-test.cad');
    expect(calls.setCampaignNameState).toHaveBeenCalledWith('Chroniques test');
  });

  it('imports only current Cadence campaign files and never applies the saved theme', async () => {
    const payload = JSON.parse(serializeCampaign([scene], true, 'Campagne importee'));
    const file = {
      name: 'campagne-importee.cad',
      type: 'application/json',
      size: 1,
      text: async () => JSON.stringify({ ...payload, settings: { dark: false } }),
    };
    const { actions, calls } = createHarness({ dark: true });

    const result = await actions.importCampaign(file);

    expect(result).toEqual({ ok: true });
    expect(calls.setCampaignRules).toHaveBeenCalled();
    expect(calls.setScenes).toHaveBeenCalled();
    expect(calls.setCampaignNameState).toHaveBeenCalledWith('Campagne importee');
    expect(calls.setTemplateStore).toHaveBeenCalled();
    expect(calls.setSceneIndex).toHaveBeenCalledWith(0);
    expect(calls.setDark).not.toHaveBeenCalled();
  });

  it('rejects old JSON exports on the .cad import path', async () => {
    const file = {
      name: 'ancienne-campagne.json',
      type: 'application/json',
      size: 1,
      text: async () => JSON.stringify({ version: '0.1.74', scenes: [scene], settings: { dark: true } }),
    };
    const { actions, calls } = createHarness();

    const result = await actions.importCampaign(file);

    expect(result.ok).toBe(false);
    expect(result.message).toContain('campagne Cadence valide');
    expect(calls.setScenes).not.toHaveBeenCalled();
    expect(calls.setDark).not.toHaveBeenCalled();
  });

  it('loads the explicit test campaign with several scenes and templates', () => {
    const { actions, state, calls } = createHarness();

    actions.loadTestCampaign();

    expect(calls.setCampaignRules).toHaveBeenCalled();
    expect(calls.setScenes).toHaveBeenCalled();
    expect(calls.setTemplateStore).toHaveBeenCalled();
    expect(calls.setCampaignNameState).toHaveBeenCalledWith('Campagne de test');
    expect(calls.setSceneIndex).toHaveBeenCalledWith(0);
    expect(state().scenes.length).toBeGreaterThan(1);
    expect(state().templates.templates.length).toBeGreaterThan(0);
    expect(state().templates.trackerTemplates.length).toBeGreaterThan(0);
    expect(state().templates.sceneCounterTemplates.length).toBeGreaterThan(0);
  });

  it('numbers duplicated scene titles', () => {
    const source = { ...scene, id: 'scene-source', title: 'Bal' };
    const firstCopy = { ...scene, id: 'scene-copy', title: 'Bal 1' };
    const { actions, state } = createHarness({ scenes: [source, firstCopy] });

    actions.duplicateScene(0);

    expect(state().scenes.map((item) => item.title)).toEqual(['Bal', 'Bal 2', 'Bal 1']);
  });
});
