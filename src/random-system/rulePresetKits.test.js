import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { rulePresetCatalog } from '../rulePresets.js';
import {
  executeRandomDefinition,
  fixedValue,
  randomAggregateOperations,
  randomPipelineStepTypes,
  randomSourceKinds,
} from './engine.js';
import { createDefaultRandomSystemState, normalizeRandomSystemState } from './state.js';
import {
  activateRandomKitInState,
  deleteRandomKitFromState,
  ensureRandomKitInState,
  getAvailableInitiativeRolls,
  getDefaultInitiativeRoll,
  getRandomKitForRuleset,
  loadRandomKitInState,
  randomKitIsLoaded,
  randomKitIsStrictlyActive,
  randomKitApplicationPolicies,
  randomKitCatalog,
  randomKitFamilyTags,
  randomKitInitiativeModes,
  randomKitResources,
  saveRandomKitToState,
} from './rulePresetKits.js';

const currentDir = dirname(fileURLToPath(import.meta.url));
const srcDir = join(currentDir, '..');

async function filesUnder(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  }));
  return nested.flat();
}

function sourceIdsForDefinition(definition) {
  return [
    ...definition.components.flatMap((component) => {
      if (component.source.kind === 'fixed') return [component.source.value];
      const parameter = definition.parameters.find((item) => item.id === component.source.parameterId);
      return parameter?.type === 'source' ? [parameter.defaultValue] : [];
    }),
    ...definition.pipeline.filter((step) => step.type === 'lookup-table').map((step) => step.sourceId),
  ].filter(Boolean);
}

function getPreset(id) {
  return rulePresetCatalog.find((preset) => preset.catalogId === id);
}

function customCombinationDefinitions() {
  const exposed = {
    id: 'custom-combo',
    name: 'Combinaison maison',
    exposed: true,
    active: false,
    components: [],
    options: [{
      id: 'mode',
      label: 'Mode',
      type: 'choice',
      defaultValue: 'normal',
      choices: [{ value: 'normal', label: 'Normal' }],
    }],
    pipeline: [{
      id: 'mode',
      type: randomPipelineStepTypes.REPEAT_SELECT,
      optionId: 'mode',
      variants: { normal: { definitionId: 'custom-base' } },
    }],
    primaryAggregateId: '',
  };
  const internal = {
    id: 'custom-base',
    name: 'Base maison',
    exposed: false,
    active: false,
    components: [{ id: 'main', label: 'Jet', source: fixedValue('standard-d20'), count: fixedValue(1) }],
    pipeline: [{
      id: 'total',
      type: randomPipelineStepTypes.AGGREGATE,
      operation: randomAggregateOperations.SUM,
      outputId: 'total',
    }],
    primaryAggregateId: 'total',
  };
  return [exposed, internal];
}

describe('RandomSystem rule preset kits', () => {
  it('covers every shipped rule preset with a random kit', () => {
    const uncovered = rulePresetCatalog
      .filter((preset) => !getRandomKitForRuleset(preset.catalogId))
      .map((preset) => preset.catalogId);

    expect(uncovered).toEqual([]);
  });

  it('keeps all kit sources and definitions valid and executable', () => {
    for (const kit of randomKitCatalog) {
      const resources = randomKitResources(kit.id);
      const sourceIds = new Set(resources.sources.map((source) => source.id));

      expect(resources.kit).toBeTruthy();
      expect(kit.description.trim().length).toBeGreaterThan(0);
      expect(resources.sources.length).toBeGreaterThan(0);
      expect(resources.definitions.length + (kit.initiative.defaultSourceId ? 1 : 0)).toBeGreaterThan(0);
      expect(kit.sourceIds.every((sourceId) => sourceIds.has(sourceId))).toBe(true);
      expect(Object.values(randomKitApplicationPolicies)).toContain(kit.applicationPolicy);
      expect(Object.values(randomKitInitiativeModes)).toContain(kit.initiative.mode);

      if (kit.initiative.defaultDefinitionId) {
        expect(resources.definitions.some((definition) => definition.id === kit.initiative.defaultDefinitionId)).toBe(true);
      }
      if (kit.initiative.defaultSourceId) {
        expect(resources.sources.find((source) => source.id === kit.initiative.defaultSourceId)?.kind)
          .toBe(randomSourceKinds.CARDS);
      }

      for (const definition of resources.definitions) {
        expect(sourceIdsForDefinition(definition).every((sourceId) => sourceIds.has(sourceId))).toBe(true);
        executeRandomDefinition({
          definition,
          sources: resources.sources.filter((source) => source.kind !== randomSourceKinds.CARDS),
          rng: () => 0.25,
          now: 1,
        });
      }
    }
  });

  it('makes the main generic random families available', () => {
    const tags = new Set(randomKitCatalog.flatMap((kit) => kit.familyTags));

    expect([...tags]).toEqual(expect.arrayContaining([
      randomKitFamilyTags.D20_GENERIC,
      randomKitFamilyTags.D100_PERCENTILE,
      randomKitFamilyTags.D6_POOL,
      randomKitFamilyTags.D10_POOL,
      randomKitFamilyTags.TWO_D6_MOD,
      randomKitFamilyTags.STEP_DICE,
      randomKitFamilyTags.EXPLODING_DICE,
      randomKitFamilyTags.CARDS,
    ]));
  });

  it('covers the complete polyhedral set used by generic d20 games', () => {
    const resources = randomKitResources('kit-d20-generic');

    expect(resources.sources.map((source) => source.id)).toEqual(expect.arrayContaining([
      'standard-d4',
      'standard-d6',
      'standard-d8',
      'standard-d10',
      'standard-d12',
      'standard-d20',
      'standard-d100',
    ]));
    expect(resources.definitions.find((definition) => definition.id === 'kit-d20-polyhedral'))
      .toMatchObject({ name: 'Total de dés au choix', exposed: true, active: true });
    expect(resources.definitions.find((definition) => definition.id === 'kit-d20-check').options[0])
      .toMatchObject({
        defaultValue: 'normal',
        choices: [
          { value: 'disadvantage', label: 'Désavantage' },
          { value: 'normal', label: 'Normal' },
          { value: 'advantage', label: 'Avantage' },
        ],
      });
  });

  it('covers the regular dice mechanics of every named system kit', () => {
    const cthulhu = randomKitResources('kit-d100-percentile');
    expect(cthulhu.sources.map((source) => source.id)).toEqual(expect.arrayContaining([
      'standard-d3',
      'standard-d4',
      'standard-d6',
      'standard-d8',
      'standard-d10',
      'standard-d20',
      'standard-d100',
    ]));
    expect(cthulhu.definitions.map((definition) => definition.id)).toEqual(expect.arrayContaining([
      'kit-d100-check',
      'kit-d100-polyhedral',
    ]));

    expect(randomKitResources('kit-d6-pool').definitions.map((definition) => definition.id))
      .toEqual(expect.arrayContaining(['kit-d6-pool-successes', 'kit-d6-total']));
    expect(randomKitResources('kit-narrative-no-initiative').definitions.map((definition) => definition.id))
      .toEqual(expect.arrayContaining(['kit-2d6-mod', 'kit-d10-pool-successes']));
    expect(randomKitResources('kit-cosmere-label-order').definitions.map((definition) => definition.id))
      .toEqual(expect.arrayContaining(['kit-cosmere-d20-check', 'kit-cosmere-plot', 'kit-cosmere-polyhedral']));
    expect(randomKitResources('kit-savage-step-cards').definitions.map((definition) => definition.id))
      .toEqual(expect.arrayContaining(['kit-savage-trait-wild', 'kit-savage-step']));
  });

  it('does not encode initiative or ordering as separate roll definitions', () => {
    for (const definition of randomKitCatalog.flatMap((kit) => kit.definitions)) {
      expect(`${definition.id} ${definition.name}`.toLocaleLowerCase('fr'))
        .not.toMatch(/initiative|ordre|damage|dégâts|degats/);
    }
  });

  it('selects initiative rolls for numeric, card, label and no-initiative rules', () => {
    const d20Default = getDefaultInitiativeRoll(getPreset('systemes/d20-tactique-dd-pathfinder').rules);
    const savageDefault = getDefaultInitiativeRoll(getPreset('systemes/savage-worlds').rules);
    const cosmereDefault = getDefaultInitiativeRoll(getPreset('systemes/cosmere-rpg').rules);
    const narrativeDefault = getDefaultInitiativeRoll(getPreset('systemes/narratif-sans-initiative-pbta-vtm').rules);

    expect(d20Default).toMatchObject({ mode: randomKitInitiativeModes.NUMERIC, definitionId: 'kit-d20-check' });
    expect(savageDefault).toMatchObject({ mode: randomKitInitiativeModes.CARDS, sourceId: 'standard-54-cards' });
    expect(cosmereDefault).toMatchObject({ mode: randomKitInitiativeModes.LABEL_ORDER, definitionId: null });
    expect(narrativeDefault).toMatchObject({ mode: randomKitInitiativeModes.NONE, definitionId: null });
    expect(getAvailableInitiativeRolls(getPreset('generiques/initiative-souple-sans-initiative').rules).length)
      .toBeGreaterThan(0);
  });

  it('loads a catalog kit into an already initialized RandomSystem state without duplicating resources', () => {
    const initial = createDefaultRandomSystemState();
    const loaded = ensureRandomKitInState(initial, 'systemes/savage-worlds');
    const loadedAgain = ensureRandomKitInState(loaded, 'systemes/savage-worlds');

    expect(loaded.definitions.map((definition) => definition.id)).toContain('kit-savage-step');
    expect(loaded.sources.map((source) => source.id)).toContain('standard-54-cards');
    expect(loaded.sourceStates['standard-54-cards'].drawPile).toHaveLength(54);
    expect(loadedAgain.definitions.filter((definition) => definition.id === 'kit-savage-step')).toHaveLength(1);
    expect(loadedAgain.sources.filter((source) => source.id === 'standard-54-cards')).toHaveLength(1);
  });

  it('loads kit resources without changing the active roll selection', () => {
    const initial = createDefaultRandomSystemState();
    const activeBefore = initial.definitions
      .filter((definition) => definition.exposed !== false && definition.active !== false)
      .map((definition) => definition.id);
    const loaded = loadRandomKitInState(initial, 'kit-d6-pool');

    expect(randomKitIsLoaded(loaded, 'kit-d6-pool')).toBe(true);
    expect(randomKitIsStrictlyActive(loaded, 'kit-d6-pool')).toBe(false);
    expect(loaded.definitions
      .filter((definition) => definition.exposed !== false && definition.active !== false)
      .map((definition) => definition.id)).toEqual(activeBefore);
    expect(loaded.definitions.find((definition) => definition.id === 'kit-d6-pool-successes')?.active).toBe(false);
    expect(loaded.definitions.find((definition) => definition.id === 'kit-d6-pool-successes')?.quickAccess).toBe(false);
  });

  it('activates exactly one kit and loses that status after a manual change', () => {
    const initial = ensureRandomKitInState(createDefaultRandomSystemState(), 'kit-d20-generic');
    const activated = activateRandomKitInState(initial, 'kit-d6-pool');
    const expectedActiveIds = randomKitResources('kit-d6-pool').definitions
      .filter((definition) => definition.exposed !== false)
      .map((definition) => definition.id);
    const activeIds = activated.definitions
      .filter((definition) => definition.exposed !== false && definition.active !== false)
      .map((definition) => definition.id);

    expect(activeIds).toEqual(expectedActiveIds);
    expect(activated.definitions
      .filter((definition) => expectedActiveIds.includes(definition.id))
      .every((definition) => definition.quickAccess !== false)).toBe(true);
    expect(randomKitIsStrictlyActive(activated, 'kit-d6-pool')).toBe(true);
    expect(randomKitIsStrictlyActive(activated, 'kit-d20-generic')).toBe(false);

    const changed = {
      ...activated,
      definitions: activated.definitions.map((definition) => (
        definition.id === expectedActiveIds[0] ? { ...definition, active: false } : definition
      )),
    };
    expect(randomKitIsStrictlyActive(changed, 'kit-d6-pool')).toBe(false);
  });

  it('activates exposed kit rolls without activating hidden dependencies', () => {
    const initial = createDefaultRandomSystemState();
    const [inactiveD20, inactiveBase] = customCombinationDefinitions();
    const loaded = ensureRandomKitInState({
      ...initial,
      definitions: [inactiveD20, inactiveBase],
    }, {
      id: 'kit-existing-d20',
      label: 'd20 existant',
      sourceIds: ['standard-d20'],
      sources: [],
      definitions: [inactiveD20, inactiveBase],
      initiative: {
        mode: randomKitInitiativeModes.NUMERIC,
        defaultDefinitionId: 'custom-combo',
      },
      applicationPolicy: randomKitApplicationPolicies.ASK,
    });

    expect(loaded.definitions.find((definition) => definition.id === 'custom-combo'))
      .toMatchObject({ exposed: true, active: true });
    expect(loaded.definitions.find((definition) => definition.id === 'custom-base'))
      .toMatchObject({ exposed: false, active: false });
  });

  it('saves custom kits and can load their resources later', () => {
    const customKit = {
      id: 'kit-custom-omens',
      label: 'Presages maison',
      description: 'Ajoute une table maison de presages favorables ou defavorables.',
      familyTags: ['custom'],
      presetIds: ['generiques/classique'],
      sourceIds: ['custom-omens'],
      sources: [{
        id: 'custom-omens',
        name: 'Presages',
        kind: randomSourceKinds.WEIGHTED,
        outcomes: [
          { id: 'good', label: 'Favorable', value: 1, weight: 1 },
          { id: 'bad', label: 'Defavorable', value: -1, weight: 1 },
        ],
      }],
      definitions: [{
        id: 'custom-omen-roll',
        name: 'Presage',
        components: [{ id: 'omen', source: fixedValue('custom-omens'), count: fixedValue(1) }],
        pipeline: [{
          id: 'total',
          type: randomPipelineStepTypes.AGGREGATE,
          operation: randomAggregateOperations.SUM,
          outputId: 'total',
        }],
        primaryAggregateId: 'total',
      }],
      initiative: {
        mode: randomKitInitiativeModes.MANUAL,
        defaultDefinitionId: null,
        tiebreaker: 'manual',
      },
      applicationPolicy: randomKitApplicationPolicies.MANUAL_ONLY,
    };

    const saved = saveRandomKitToState(createDefaultRandomSystemState(), customKit);
    const restored = normalizeRandomSystemState(saved);
    const loaded = ensureRandomKitInState(restored, 'kit-custom-omens');

    expect(restored.randomKits[0]).toMatchObject({
      id: 'kit-custom-omens',
      label: 'Presages maison',
      description: 'Ajoute une table maison de presages favorables ou defavorables.',
    });
    expect(getRandomKitForRuleset('kit-custom-omens', restored.randomKits)?.id).toBe('kit-custom-omens');
    expect(getAvailableInitiativeRolls(getPreset('generiques/classique').rules, restored.randomKits).map((roll) => roll.kitId))
      .toContain('kit-custom-omens');
    expect(loaded.sources.map((source) => source.id)).toContain('custom-omens');
    expect(loaded.definitions.map((definition) => definition.id)).toContain('custom-omen-roll');
    expect(deleteRandomKitFromState(loaded, 'kit-custom-omens').randomKits).toEqual([]);
  });

  it('keeps hidden dependencies available when a custom kit is saved from an exposed definition', () => {
    const state = createDefaultRandomSystemState();
    const definitions = customCombinationDefinitions();
    const customKit = {
      id: 'kit-custom-combination',
      label: 'Combinaison maison',
      sourceIds: ['standard-d20'],
      sources: [],
      definitions,
      initiative: {
        mode: randomKitInitiativeModes.NUMERIC,
        defaultDefinitionId: 'custom-combo',
      },
      applicationPolicy: randomKitApplicationPolicies.ASK,
    };

    const saved = saveRandomKitToState(state, customKit);
    const kit = saved.randomKits[0];

    expect(kit.definitions.find((definition) => definition.id === 'custom-combo')).toMatchObject({ exposed: true });
    expect(kit.definitions.find((definition) => definition.id === 'custom-base')).toMatchObject({ exposed: false, active: false });
    expect(randomKitResources(kit).definitions.map((definition) => definition.id)).toEqual(['custom-combo', 'custom-base']);
  });

  it('keeps RandomSystem kit catalog selection out of scene and sheet UI', async () => {
    const checkedFiles = [
      ...await filesUnder(join(srcDir, 'interface', 'scene')),
      ...await filesUnder(join(srcDir, 'interface', 'fiches')),
    ].filter((file) => file.endsWith('.js') || file.endsWith('.jsx'));
    const contents = await Promise.all(checkedFiles.map((file) => readFile(file, 'utf8')));
    const combined = contents.join('\n');

    expect(combined).not.toContain('rulePresetKits');
    expect(combined).not.toContain('getAvailableInitiativeRolls');
    expect(combined).not.toContain('ensureRandomKit');
  });
});
