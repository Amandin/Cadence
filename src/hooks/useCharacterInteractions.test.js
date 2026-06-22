import { describe, expect, it } from 'vitest';
import { dupliquerPersonnageScene, nomCopieUniquePersonnage } from './useCharacterInteractions.js';

describe('nomCopieUniquePersonnage', () => {
  it('creates a copy name that does not collide with existing characters', () => {
    const personnages = [
      { name: 'Astre' },
      { name: 'Astre 1' },
      { name: 'Astre 2' },
    ];

    expect(nomCopieUniquePersonnage(personnages, 'Astre')).toBe('Astre 3');
  });
});

describe('dupliquerPersonnageScene', () => {
  it('copies the scene character while regenerating scene-local ids', () => {
    const source = {
      id: 'source',
      name: 'Astre',
      kind: 'PJ',
      initiative: 18,
      actionSlots: [{ id: 'slot-source', initiative: 18, order: 4 }],
      statuses: [{ id: 'status-source', name: 'Brulure', remaining: 2 }],
      trackers: [{
        id: 'tracker-source',
        type: 'boxes',
        name: 'Armure',
        blocks: [{
          id: 'block-source',
          lines: [{
            id: 'line-source',
            boxes: [{ id: 'box-source', mark: 1 }],
          }],
        }],
      }],
      _activationAutomationsDone: true,
    };

    const copie = dupliquerPersonnageScene(source, 'Astre 1');

    expect(copie).toMatchObject({
      name: 'Astre 1',
      kind: 'PJ',
      initiative: 18,
      _activationAutomationsDone: false,
    });
    expect(copie.id).not.toBe(source.id);
    expect(copie.actionSlots[0]).toMatchObject({ initiative: 18, order: 0 });
    expect(copie.actionSlots[0].id).not.toBe(source.actionSlots[0].id);
    expect(copie.statuses[0].id).not.toBe(source.statuses[0].id);
    expect(copie.trackers[0].id).not.toBe(source.trackers[0].id);
    expect(copie.trackers[0].blocks[0].id).not.toBe(source.trackers[0].blocks[0].id);
    expect(copie.trackers[0].blocks[0].lines[0].id).not.toBe(source.trackers[0].blocks[0].lines[0].id);
    expect(copie.trackers[0].blocks[0].lines[0].boxes[0].id).not.toBe(source.trackers[0].blocks[0].lines[0].boxes[0].id);
  });
});
