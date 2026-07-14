import { describe, expect, it } from 'vitest';
import { compileProfileHierarchy, createProfileHierarchy, createHierarchyNode, hierarchyNodeReferenceKey, migrateQuickRollsBelowInitiatives } from './profileHierarchy.js';

const initiatives = [{ id: 'initiative/shared', label: 'Initiative partagée', status: 'available', rulePresetId: 'preset/shared' }];
const quickRolls = [{ id: 'quick/shared', label: 'Jet partagé', kitId: 'kit/shared' }];
const systems = [
  { id: 'system/a', name: 'Système A', editions: [], initiativeProfileIds: ['initiative/shared'], randomQuickRollProfileIds: ['quick/shared'] },
  { id: 'system/b', name: 'Système B', editions: [], initiativeProfileIds: ['initiative/shared'], randomQuickRollProfileIds: [] },
];

describe('profile hierarchy', () => {
  it('allows several systems to reference the same initiative without duplicating its definition', () => {
    const tree = createProfileHierarchy({ systems, initiatives, quickRolls });
    const compiled = compileProfileHierarchy(tree, { systems, initiatives, quickRolls });

    expect(compiled.initiatives).toHaveLength(1);
    expect(compiled.systems.find((system) => system.id === 'system/a').initiativeProfileIds).toEqual(['initiative/shared']);
    expect(compiled.systems.find((system) => system.id === 'system/b').initiativeProfileIds).toEqual(['initiative/shared']);
  });

  it('places shared quick-roll links below every initiative while compiling one system-level choice', () => {
    const tree = createProfileHierarchy({ systems, initiatives, quickRolls });
    const systemA = tree.children.find((system) => system.refId === 'system/a');
    const systemB = tree.children.find((system) => system.refId === 'system/b');

    expect(systemA.children).toHaveLength(1);
    expect(systemA.children[0].children.map((node) => node.refId)).toEqual(['quick/shared']);
    expect(systemB.children[0].children).toEqual([]);
    expect(compileProfileHierarchy(tree, { systems, initiatives, quickRolls }).systems.find((system) => system.id === 'system/a').randomQuickRollProfileIds).toEqual(['quick/shared']);
  });

  it('migrates existing direct quick-roll leaves under the initiatives that precede them', () => {
    const initiativeA = createHierarchyNode('initiative', 'Initiative A');
    initiativeA.refId = 'initiative/shared';
    const initiativeB = createHierarchyNode('initiative', 'Initiative B');
    initiativeB.refId = 'initiative/shared';
    const quickRoll = createHierarchyNode('quickRoll', 'Jet partagé');
    quickRoll.refId = 'quick/shared';
    const tree = { id: 'profile-root', type: 'root', label: 'Accueil', data: {}, children: [{ id: 'system-a', type: 'system', label: 'Système A', refId: 'system/a', data: {}, children: [initiativeA, initiativeB, quickRoll] }] };

    const migrated = migrateQuickRollsBelowInitiatives(tree);
    const migratedSystem = migrated.children[0];
    expect(migratedSystem.children.filter((node) => node.type === 'quickRoll')).toHaveLength(0);
    expect(migratedSystem.children.filter((node) => node.type === 'initiative').every((node) => node.children.some((child) => child.refId === 'quick/shared'))).toBe(true);
  });

  it('supports extra grouping levels and removable edition levels', () => {
    const tree = createProfileHierarchy({ systems: [], initiatives, quickRolls });
    const group = createHierarchyNode('group', 'Famille personnalisée');
    const system = createHierarchyNode('system', 'Système personnalisé');
    const initiative = createHierarchyNode('initiative', 'Initiative partagée');
    initiative.refId = 'initiative/shared';
    system.children = [initiative];
    group.children = [system];
    tree.children = [group];

    const compiled = compileProfileHierarchy(tree, { systems: [], initiatives, quickRolls });
    expect(compiled.systems[0]).toMatchObject({ name: 'Système personnalisé', initiativeProfileIds: ['initiative/shared'], editions: [] });
  });

  it('recognizes and compiles reused custom initiatives as a single shared definition', () => {
    const tree = createProfileHierarchy({ systems: [], initiatives: [], quickRolls: [] });
    const systemA = createHierarchyNode('system', 'Système A');
    const systemB = createHierarchyNode('system', 'Système B');
    const initiativeDefinition = createHierarchyNode('initiative', 'Initiative maison');
    initiativeDefinition.data = { id: 'initiative/maison', rulePresetId: 'preset/maison' };
    const initiativeLink = createHierarchyNode('initiative', 'Initiative maison');
    initiativeLink.refId = 'initiative/maison';
    systemA.children = [initiativeDefinition];
    systemB.children = [initiativeLink];
    tree.children = [systemA, systemB];

    const compiled = compileProfileHierarchy(tree);
    expect(hierarchyNodeReferenceKey(initiativeDefinition)).toBe(hierarchyNodeReferenceKey(initiativeLink));
    expect(compiled.initiatives).toEqual([expect.objectContaining({ id: 'initiative/maison', rulePresetId: 'preset/maison' })]);
    expect(compiled.systems.map((system) => system.initiativeProfileIds)).toEqual([
      ['initiative/maison'],
      ['initiative/maison'],
    ]);
  });
});
