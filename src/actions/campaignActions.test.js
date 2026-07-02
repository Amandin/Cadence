import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCampaignActions } from './campaignActions.js';
import { createCadenceLibraryPayload } from '../cadLibrary.js';
import { randomKitCatalog } from '../random-system/rulePresetKits.js';
import { createDefaultRandomSystemState } from '../random-system/state.js';
import { isValidCampaign, serializeCampaign } from '../storage.js';

const scene = { id: 'scene-export', title: 'Export', participants: [] };

function createHarness(overrides = {}) {
  let scenes = overrides.scenes || [scene];
  let rules = overrides.rules || { temporalite: 'classique' };
  let campaignName = overrides.campaignName || 'Campagne test';
  let templates = overrides.templates || null;
  let randomSystem = overrides.randomSystem || createDefaultRandomSystemState();
  let sceneIndex = 0;
  let dark = overrides.dark ?? true;

  const calls = {
    setCampaignRules: vi.fn((next) => { rules = next; }),
    setScenes: vi.fn((next) => { scenes = typeof next === 'function' ? next(scenes) : next; }),
    setSceneIndex: vi.fn((next) => { sceneIndex = next; }),
    setDark: vi.fn((next) => { dark = next; }),
    setCampaignNameState: vi.fn((next) => { campaignName = next; }),
    setTemplateStore: vi.fn((next) => { templates = next; }),
    setRandomSystemState: vi.fn((next) => { randomSystem = typeof next === 'function' ? next(randomSystem) : next; }),
  };

  return {
    calls,
    state: () => ({ scenes, rules, campaignName, templates, randomSystem, sceneIndex, dark }),
    actions: createCampaignActions({
      scenes,
      campaignRules: rules,
      setCampaignRules: calls.setCampaignRules,
      sceneIndex,
      dark,
      campaignName,
      templateStore: templates,
      randomSystemState: randomSystem,
      setScenes: calls.setScenes,
      setSceneIndex: calls.setSceneIndex,
      setDark: calls.setDark,
      setCampaignNameState: calls.setCampaignNameState,
      setTemplateStore: calls.setTemplateStore,
      setRandomSystemState: calls.setRandomSystemState,
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

  it('rejects corrupted .cad files without mutating campaign state', async () => {
    const file = {
      name: 'campagne-corrompue.cad',
      type: 'application/json',
      size: 12,
      text: async () => '{ pas du json',
    };
    const { actions, calls } = createHarness();

    const result = await actions.importCampaign(file);

    expect(result.ok).toBe(false);
    expect(result.message).toContain('campagne-corrompue.cad');
    expect(calls.setCampaignRules).not.toHaveBeenCalled();
    expect(calls.setScenes).not.toHaveBeenCalled();
    expect(calls.setTemplateStore).not.toHaveBeenCalled();
    expect(calls.setDark).not.toHaveBeenCalled();
  });

  it('imports templates and rule presets from .cadlib libraries', async () => {
    const library = createCadenceLibraryPayload({
      name: 'Bibliotheque',
      templates: {
        templates: [{
          name: 'Archiviste',
          category: 'PNJ',
          participant: { id: 'template-participant', name: 'Archiviste', kind: 'Opposant', trackers: [], statuses: [] },
        }],
      },
      rulePresets: [{ name: 'Regles de test', rules: { temporalite: 'classique' } }],
      randomKits: [randomKitCatalog[0]],
    });
    const file = {
      name: 'bibliotheque.cadlib',
      type: 'application/json',
      size: 1,
      text: async () => JSON.stringify(library),
    };
    const { actions, state, calls } = createHarness();

    const result = await actions.importTemplatesFromCampaign(file);

    expect(result).toMatchObject({ ok: true, added: 2, skipped: 0, kitsAdded: 1, kitsUpdated: 0 });
    expect(calls.setTemplateStore).toHaveBeenCalled();
    expect(calls.setRandomSystemState).toHaveBeenCalled();
    expect(state().templates.templates[0]).toMatchObject({ name: 'Archiviste' });
    expect(state().templates.ruleTemplates[0]).toMatchObject({ name: 'Regles de test' });
    expect(state().randomSystem.randomKits[0]).toMatchObject({ id: randomKitCatalog[0].id });
  });

  it('exports local templates and rule presets as a .cadlib library', async () => {
    const capture = stubSavePicker();
    const { actions } = createHarness({
      templates: {
        templates: [],
        ruleTemplates: [{ name: 'Regles locales', rules: { temporalite: 'classique' } }],
      },
      randomSystem: {
        ...createDefaultRandomSystemState(),
        randomKits: [randomKitCatalog[0]],
      },
    });

    const result = await actions.exportTemplateLibrary('Bibliotheque locale');
    const payload = JSON.parse(await capture.blob.text());

    expect(result).toMatchObject({ ok: true, method: 'picker' });
    expect(capture.suggestedName).toMatch(/^bibliotheque-locale-\d{2}-\d{2}-\d{4}\.cadlib$/);
    expect(capture.types[0].accept['application/json']).toEqual(['.cadlib']);
    expect(payload.format).toBe('cadence-library');
    expect(payload.templates.ruleTemplates[0]).toMatchObject({ name: 'Regles locales' });
    expect(payload.randomKits[0]).toMatchObject({ id: randomKitCatalog[0].id });
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
