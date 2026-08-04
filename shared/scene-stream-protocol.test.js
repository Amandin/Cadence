import { describe, expect, it } from 'vitest';
import {
  applyStreamValueToTracker,
  buildSharedSceneView,
  findSharedIndicator,
  hydrateSharedView,
  normalizeStreamIndicatorValue,
  sharedViewIndicators,
  streamIndicatorKey,
  streamViewConfiguration,
  validateStreamSceneIdentities,
} from './scene-stream-protocol.js';

function bar(id, overrides = {}) {
  return {
    id,
    type: 'bar',
    name: 'Points de vie',
    visible: true,
    current: 12,
    min: 0,
    max: 20,
    step: 1,
    direction: 'countdown',
    ...overrides,
  };
}

function participant(id, overrides = {}) {
  return {
    id,
    name: id,
    kind: 'PJ',
    initiative: 10,
    stats: [],
    statuses: [],
    trackers: [bar(`${id}-hp`)],
    ...overrides,
  };
}

function scene(overrides = {}) {
  return {
    id: 'scene-1',
    title: 'La tour',
    type: 'Combat',
    round: 2,
    phase: 1,
    activeId: 'hero',
    statuses: [],
    participants: [participant('hero')],
    reserve: [],
    ...overrides,
  };
}

function collectKeys(value, result = new Set()) {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectKeys(entry, result));
    return result;
  }
  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, entry]) => {
      result.add(key);
      collectKeys(entry, result);
    });
  }
  return result;
}

describe('scene stream protocol', () => {
  it('projects the public view through allowlists without leaking secrets or metadata', () => {
    const source = scene({
      notes: 'SCENE_PRIVATE_NOTES',
      reserveNotes: 'RESERVE_PRIVATE_NOTES',
      metadata: { audit: 'SCENE_PRIVATE_METADATA' },
      ownerId: 'OWNER_PRIVATE_ID',
      participantTypes: [{ name: 'PJ', behaviorType: 'PJ', internal: 'TYPE_PRIVATE_METADATA' }],
      statuses: [
        {
          id: 'scene-status',
          name: 'Pluie',
          duration: 3,
          remaining: 2,
          color: 'blue',
          privateNote: 'STATUS_PRIVATE_NOTE',
        },
        { id: 'secret-scene-status', name: 'SCENE_SECRET_STATUS', secret: true },
      ],
      globalTracker: {
        enabled: true,
        name: 'Alerte',
        mode: 'clock',
        current: 2,
        total: 8,
        max: 6,
        direction: 'progression',
        running: false,
        thresholds: [{ label: 'GLOBAL_PRIVATE_THRESHOLD' }],
        privateNote: 'GLOBAL_PRIVATE_NOTE',
      },
      participants: [participant('hero', {
        name: 'Ariane',
        symbol: 'A',
        color: 'blue',
        description: 'Visible description',
        stats: [{ label: 'Armure', value: '12', privateNote: 'STAT_PRIVATE_NOTE' }],
        privateNotes: 'PARTICIPANT_PRIVATE_NOTES',
        metadata: { source: 'PARTICIPANT_PRIVATE_METADATA' },
        secret: false,
        statuses: [
          { id: 'blessed', name: 'Béni', color: 'gold', internal: 'STATUS_PRIVATE_METADATA' },
          { id: 'cursed', name: 'PARTICIPANT_SECRET_STATUS', secret: true },
        ],
        trackers: [bar('hp', {
          streamEditable: true,
          secret: false,
          initial: 20,
          thresholds: [{ label: 'INDICATOR_PRIVATE_THRESHOLD' }],
          resetRule: { note: 'INDICATOR_PRIVATE_RESET' },
          metadata: { source: 'INDICATOR_PRIVATE_METADATA' },
        })],
      })],
    });

    const view = buildSharedSceneView(source);
    const serialized = JSON.stringify(view);
    const keys = collectKeys(view);

    expect(Object.keys(view)).toEqual(['schemaVersion', 'scene']);
    expect(Object.keys(view.scene)).toEqual([
      'id',
      'title',
      'type',
      'round',
      'phase',
      'activeId',
      'statuses',
      'globalIndicator',
      'participants',
      'reserve',
    ]);
    expect(Object.keys(view.scene.participants[0])).toEqual([
      'id',
      'name',
      'kind',
      'player',
      'placement',
      'symbol',
      'color',
      'description',
      'initiative',
      'stats',
      'statuses',
      'indicators',
    ]);
    expect(Object.keys(view.scene.participants[0].indicators[0])).toEqual([
      'id',
      'type',
      'name',
      'writable',
      'version',
      'value',
      'min',
      'max',
      'step',
      'direction',
      'limitMode',
      'minAbsolute',
      'maxAbsolute',
    ]);
    expect(view.scene.participants[0].statuses).toEqual([expect.objectContaining({ id: 'blessed', name: 'Béni' })]);
    expect(view.scene.statuses).toEqual([expect.objectContaining({ id: 'scene-status', name: 'Pluie' })]);
    expect(view.scene.globalIndicator).toEqual({
      name: 'Alerte',
      mode: 'clock',
      current: 2,
      total: 8,
      max: 6,
      direction: 'progression',
      running: false,
    });

    [
      'SCENE_PRIVATE_NOTES',
      'RESERVE_PRIVATE_NOTES',
      'SCENE_PRIVATE_METADATA',
      'OWNER_PRIVATE_ID',
      'TYPE_PRIVATE_METADATA',
      'STATUS_PRIVATE_NOTE',
      'SCENE_SECRET_STATUS',
      'GLOBAL_PRIVATE_THRESHOLD',
      'GLOBAL_PRIVATE_NOTE',
      'PARTICIPANT_PRIVATE_NOTES',
      'PARTICIPANT_PRIVATE_METADATA',
      'STAT_PRIVATE_NOTE',
      'STATUS_PRIVATE_METADATA',
      'PARTICIPANT_SECRET_STATUS',
      'INDICATOR_PRIVATE_THRESHOLD',
      'INDICATOR_PRIVATE_RESET',
      'INDICATOR_PRIVATE_METADATA',
    ].forEach((marker) => expect(serialized).not.toContain(marker));
    [
      'secret',
      'notes',
      'reserveNotes',
      'metadata',
      'ownerId',
      'participantTypes',
      'privateNote',
      'privateNotes',
      'thresholds',
      'resetRule',
      'streamEditable',
      'initial',
    ].forEach((key) => expect(keys).not.toContain(key));
  });

  it('omits secret participants and secret, invisible, or unsupported indicators', () => {
    const view = buildSharedSceneView(scene({
      activeId: 'hidden-participant',
      participants: [
        participant('hidden-participant', { secret: true, name: 'SECRET_PARTICIPANT' }),
        participant('visible-participant', {
          trackers: [
            bar('public'),
            bar('secret-indicator', { secret: true, name: 'SECRET_INDICATOR' }),
            bar('invisible-indicator', { visible: false, name: 'INVISIBLE_INDICATOR' }),
            { id: 'unsupported', type: 'text', name: 'UNSUPPORTED_INDICATOR', visible: true },
          ],
        }),
      ],
      reserve: [participant('hidden-reserve', { secret: true, name: 'SECRET_RESERVE' })],
    }));

    expect(view.scene.activeId).toBe('');
    expect(view.scene.participants.map(({ id }) => id)).toEqual(['visible-participant']);
    expect(view.scene.participants[0].indicators.map(({ id }) => id)).toEqual(['public']);
    expect(view.scene.reserve).toEqual([]);
    expect(JSON.stringify(view)).not.toMatch(/SECRET_|INVISIBLE_|UNSUPPORTED_/);
  });

  it('separates visibility from write permission for PJ, custom PJ, non-PJ, and computed indicators', () => {
    const editableTrackers = [
      bar('editable', { streamEditable: true }),
      bar('not-opted-in'),
      bar('calculated', { streamEditable: true, calculated: true }),
      bar('computed', { streamEditable: true, computed: true }),
      bar('read-only', { streamEditable: true, readOnly: true }),
      bar('formula', { streamEditable: true, formula: 'current * 2' }),
    ];
    const view = buildSharedSceneView(scene({
      participantTypes: [
        { name: 'Héros maison', behaviorType: 'PJ' },
        { name: 'Ancien héros', baseType: 'PJ' },
        { name: 'Allié maison', behaviorType: 'Allié' },
      ],
      participants: [
        participant('pj', { kind: 'PJ', trackers: editableTrackers }),
        participant('custom-pj', { kind: 'Héros maison', trackers: [bar('editable', { streamEditable: true })] }),
        participant('legacy-pj', { kind: 'Ancien héros', trackers: [bar('editable', { streamEditable: true })] }),
        participant('npc', { kind: 'Opposant', trackers: [bar('editable', { streamEditable: true })] }),
        participant('custom-npc', { kind: 'Allié maison', trackers: [bar('editable', { streamEditable: true })] }),
      ],
    }));
    const byParticipant = new Map(view.scene.participants.map((entry) => [entry.id, entry]));
    const pjIndicators = new Map(byParticipant.get('pj').indicators.map((entry) => [entry.id, entry]));

    expect(byParticipant.get('pj').player).toBe(true);
    expect(byParticipant.get('custom-pj').player).toBe(true);
    expect(byParticipant.get('legacy-pj').player).toBe(true);
    expect(byParticipant.get('npc').player).toBe(false);
    expect(byParticipant.get('custom-npc').player).toBe(false);
    expect(pjIndicators.get('editable').writable).toBe(true);
    expect([
      'not-opted-in',
      'calculated',
      'computed',
      'read-only',
      'formula',
    ].map((id) => pjIndicators.get(id).writable)).toEqual([false, false, false, false, false]);
    expect(byParticipant.get('custom-pj').indicators[0].writable).toBe(true);
    expect(byParticipant.get('legacy-pj').indicators[0].writable).toBe(true);
    expect(byParticipant.get('npc').indicators[0].writable).toBe(false);
    expect(byParticipant.get('custom-npc').indicators[0].writable).toBe(false);
  });

  it('projects and validates bar, number, and boxes values as atomic indicator values', () => {
    const view = buildSharedSceneView(scene({
      participants: [participant('hero', {
        trackers: [
          bar('hp', { current: 12, streamEditable: true }),
          {
            id: 'resources',
            type: 'number',
            name: 'Ressources',
            visible: true,
            streamEditable: true,
            current: 4,
            min: 0,
            max: 10,
            counters: [
              { id: 'heat', label: 'Chaleur', current: 2, min: 0, max: 5 },
              { id: 'focus', label: 'Focus', current: 1, min: 0, max: 3 },
            ],
          },
          {
            id: 'wounds',
            type: 'boxes',
            name: 'Blessures',
            visible: true,
            streamEditable: true,
            fillLevels: 3,
            blocks: [{
              id: 'physical',
              label: 'Physique',
              lines: [{
                id: 'wound-line',
                label: 'Blessures',
                boxes: [
                  { id: 'box-a', position: 0, mark: 1 },
                  { id: 'box-b', position: 1, mark: 3 },
                ],
              }],
            }],
          },
        ],
      })],
    }));
    const indicators = new Map(view.scene.participants[0].indicators.map((entry) => [entry.id, entry]));

    expect(indicators.get('hp').value).toEqual({ current: 12 });
    expect(indicators.get('resources').value).toEqual({
      current: 4,
      counters: [
        { id: 'heat', current: 2 },
        { id: 'focus', current: 1 },
      ],
    });
    expect(indicators.get('wounds').value).toEqual({
      boxes: [
        { id: 'box-a', mark: 1 },
        { id: 'box-b', mark: 3 },
      ],
    });

    expect(normalizeStreamIndicatorValue(indicators.get('hp'), {
      current: '7',
      max: 999,
      structure: 'ignored',
    })).toEqual({ current: 7 });
    expect(normalizeStreamIndicatorValue(indicators.get('resources'), {
      current: 5,
      counters: [
        { id: 'focus', current: 3 },
        { id: 'heat', current: 4 },
      ],
      countersConfiguration: 'ignored',
    })).toEqual({
      current: 5,
      counters: [
        { id: 'heat', current: 4 },
        { id: 'focus', current: 3 },
      ],
    });
    expect(normalizeStreamIndicatorValue(indicators.get('wounds'), {
      boxes: [
        { id: 'box-b', mark: 0 },
        { id: 'box-a', mark: 2 },
      ],
      blocks: 'ignored',
    })).toEqual({
      boxes: [
        { id: 'box-a', mark: 2 },
        { id: 'box-b', mark: 0 },
      ],
    });
  });

  it('rejects malformed or structure-changing composite values', () => {
    const numberIndicator = {
      type: 'number',
      counters: [{ id: 'a' }, { id: 'b' }],
    };
    const boxesIndicator = {
      type: 'boxes',
      fillLevels: 3,
      blocks: [{ lines: [{ boxes: [{ id: 'a' }, { id: 'b' }] }] }],
    };

    expect(normalizeStreamIndicatorValue(null, { current: 1 })).toBeNull();
    expect(normalizeStreamIndicatorValue({ type: 'bar' }, null)).toBeNull();
    expect(normalizeStreamIndicatorValue({ type: 'bar' }, { current: Number.POSITIVE_INFINITY })).toBeNull();
    expect(normalizeStreamIndicatorValue({
      type: 'bar',
      min: 0,
      max: 10,
      minAbsolute: true,
      maxAbsolute: true,
    }, { current: 11 })).toBeNull();
    expect(normalizeStreamIndicatorValue({
      type: 'bar',
      min: 0,
      max: 10,
      minAbsolute: true,
      maxAbsolute: false,
    }, { current: 11 })).toEqual({ current: 11 });
    expect(normalizeStreamIndicatorValue({
      type: 'points',
      min: 0,
      max: 5,
      cyclesMin: 0,
      cyclesMax: 2,
    }, { current: 3, cycles: 3 })).toBeNull();
    expect(normalizeStreamIndicatorValue({
      type: 'number',
      min: 0,
      max: 10,
      counters: [{ id: 'a', min: 0, max: 3 }],
    }, {
      current: 5,
      counters: [{ id: 'a', current: 4 }],
    })).toBeNull();
    expect(normalizeStreamIndicatorValue(numberIndicator, {
      current: 1,
      counters: [{ id: 'a', current: 1 }],
    })).toBeNull();
    expect(normalizeStreamIndicatorValue(numberIndicator, {
      current: 1,
      counters: [{ id: 'a', current: 1 }, { id: 'a', current: 2 }],
    })).toBeNull();
    expect(normalizeStreamIndicatorValue(numberIndicator, {
      current: 1,
      counters: [{ id: 'a', current: 1 }, { id: 'b', current: 2 }, { id: 'c', current: 3 }],
    })).toBeNull();
    expect(normalizeStreamIndicatorValue(boxesIndicator, {
      boxes: [{ id: 'a', mark: 1 }],
    })).toBeNull();
    expect(normalizeStreamIndicatorValue(boxesIndicator, {
      boxes: [{ id: 'a', mark: 1 }, { id: 'a', mark: 2 }],
    })).toBeNull();
    expect(normalizeStreamIndicatorValue(boxesIndicator, {
      boxes: [{ id: 'a', mark: 1 }, { id: 'b', mark: 2 }, { id: 'c', mark: 0 }],
    })).toBeNull();
    expect(normalizeStreamIndicatorValue(boxesIndicator, {
      boxes: [{ id: 'a', mark: 4 }, { id: 'b', mark: 2 }],
    })).toBeNull();
    expect(normalizeStreamIndicatorValue(boxesIndicator, {
      boxes: [{ id: 'a', mark: 1.5 }, { id: 'b', mark: 2 }],
    })).toBeNull();
  });

  it('validates required stable identities and rejects duplicates at each scope', () => {
    expect(validateStreamSceneIdentities(scene())).toEqual({ ok: true });
    expect(validateStreamSceneIdentities(null)).toEqual({ ok: false, code: 'SCENE_ID_REQUIRED' });
    expect(validateStreamSceneIdentities(scene({ id: '' }))).toEqual({ ok: false, code: 'SCENE_ID_REQUIRED' });
    expect(validateStreamSceneIdentities(scene({ id: `scene\u0000hidden` }))).toEqual({ ok: false, code: 'SCENE_ID_REQUIRED' });
    expect(validateStreamSceneIdentities(scene({ id: 's'.repeat(161) }))).toEqual({ ok: false, code: 'SCENE_ID_REQUIRED' });
    expect(validateStreamSceneIdentities(scene({ participants: [participant('')] }))).toEqual({
      ok: false,
      code: 'PARTICIPANT_ID_REQUIRED',
    });
    expect(validateStreamSceneIdentities(scene({
      participants: [participant('same')],
      reserve: [participant('same')],
    }))).toEqual({ ok: false, code: 'PARTICIPANT_ID_DUPLICATE' });
    expect(validateStreamSceneIdentities(scene({
      participants: [participant('hero', { trackers: [bar(''), bar('valid')] })],
    }))).toEqual({ ok: false, code: 'INDICATOR_ID_REQUIRED' });
    expect(validateStreamSceneIdentities(scene({
      participants: [participant('hero', { trackers: [bar('same'), bar('same')] })],
    }))).toEqual({ ok: false, code: 'INDICATOR_ID_DUPLICATE' });
    expect(validateStreamSceneIdentities(scene({
      participants: [participant('hero', {
        trackers: [{
          id: 'number',
          type: 'number',
          counters: [{ id: 'same' }, { id: 'same' }],
        }],
      })],
    }))).toEqual({ ok: false, code: 'COUNTER_ID_INVALID' });
    expect(validateStreamSceneIdentities(scene({
      participants: [participant('hero', {
        trackers: [{
          id: 'boxes',
          type: 'boxes',
          blocks: [
            { lines: [{ boxes: [{ id: 'same' }] }] },
            { lines: [{ boxes: [{ id: 'same' }] }] },
          ],
        }],
      })],
    }))).toEqual({ ok: false, code: 'BOX_ID_INVALID' });

    expect(validateStreamSceneIdentities(scene({
      participants: [
        participant('first', { trackers: [bar('shared-indicator-id')] }),
        participant('second', { trackers: [bar('shared-indicator-id')] }),
      ],
    }))).toEqual({ ok: true });
  });

  it('uses participant and indicator identities to configure and hydrate scene and reserve state', () => {
    const view = buildSharedSceneView(scene({
      participants: [participant('hero', {
        trackers: [bar('hp', { current: 12, streamEditable: true })],
      })],
      reserve: [participant('reserve-hero', {
        trackers: [bar('hp', { current: 8, streamEditable: true })],
      })],
    }));
    const configuration = streamViewConfiguration(view);
    const configuredIndicators = sharedViewIndicators(configuration);

    expect(sharedViewIndicators(view).map(({ key }) => key)).toEqual([
      streamIndicatorKey('hero', 'hp'),
      streamIndicatorKey('reserve-hero', 'hp'),
    ]);
    expect(findSharedIndicator(view, 'hero', 'hp')?.participant.id).toBe('hero');
    expect(findSharedIndicator(view, 'missing', 'hp')).toBeNull();
    configuredIndicators.forEach(({ indicator }) => {
      expect(indicator).not.toHaveProperty('value');
      expect(indicator).not.toHaveProperty('version');
    });
    expect(view.scene.participants[0].indicators[0]).toMatchObject({
      value: { current: 12 },
      version: 0,
    });

    const hydrated = hydrateSharedView(view, [
      {
        participantId: 'hero',
        indicatorId: 'hp',
        writable: 1,
        version: 7,
        value: { current: 9 },
      },
      {
        participantId: 'reserve-hero',
        indicatorId: 'hp',
        writable: false,
        version: 4,
        value: { current: 6 },
      },
      {
        participantId: 'missing',
        indicatorId: 'hp',
        writable: true,
        version: 99,
        value: { current: 0 },
      },
    ]);

    expect(hydrated.scene.participants[0].indicators[0]).toMatchObject({
      writable: true,
      version: 7,
      value: { current: 9 },
    });
    expect(hydrated.scene.reserve[0].indicators[0]).toMatchObject({
      writable: false,
      version: 4,
      value: { current: 6 },
    });
    expect(view.scene.participants[0].indicators[0].value).toEqual({ current: 12 });
    expect(view.scene.reserve[0].indicators[0].value).toEqual({ current: 8 });
  });

  it('applies atomic guest values locally without replacing tracker structure', () => {
    const sourceBar = bar('hp', { current: 12, privateOwnerConfig: 'preserved' });
    const sourceNumber = {
      id: 'resources',
      type: 'number',
      current: 4,
      privateOwnerConfig: 'preserved',
      counters: [
        { id: 'heat', label: 'Chaleur', current: 2, max: 5 },
        { id: 'focus', label: 'Focus', current: 1, max: 3 },
      ],
    };
    const sourceBoxes = {
      id: 'wounds',
      type: 'boxes',
      privateOwnerConfig: 'preserved',
      blocks: [{
        id: 'physical',
        privateBlockConfig: 'preserved',
        lines: [{
          id: 'wound-line',
          privateLineConfig: 'preserved',
          boxes: [
            { id: 'box-a', position: 0, mark: 1, privateBoxConfig: 'preserved' },
            { id: 'box-b', position: 1, mark: 3, privateBoxConfig: 'preserved' },
          ],
        }],
      }],
    };

    const updatedBar = applyStreamValueToTracker(sourceBar, { current: 7 });
    const updatedNumber = applyStreamValueToTracker(sourceNumber, {
      current: 5,
      counters: [
        { id: 'heat', current: 4 },
        { id: 'focus', current: 3 },
      ],
    });
    const updatedBoxes = applyStreamValueToTracker(sourceBoxes, {
      boxes: [
        { id: 'box-a', mark: 2 },
        { id: 'box-b', mark: 0 },
      ],
    });

    expect(updatedBar).toMatchObject({ current: 7, max: 20, privateOwnerConfig: 'preserved' });
    expect(sourceBar.current).toBe(12);
    expect(updatedNumber).toMatchObject({
      current: 5,
      privateOwnerConfig: 'preserved',
      counters: [
        { id: 'heat', label: 'Chaleur', current: 4, max: 5 },
        { id: 'focus', label: 'Focus', current: 3, max: 3 },
      ],
    });
    expect(sourceNumber.current).toBe(4);
    expect(sourceNumber.counters.map(({ current }) => current)).toEqual([2, 1]);
    expect(updatedBoxes.blocks[0]).toMatchObject({
      id: 'physical',
      privateBlockConfig: 'preserved',
      lines: [{
        id: 'wound-line',
        privateLineConfig: 'preserved',
        boxes: [
          { id: 'box-a', position: 0, mark: 2, privateBoxConfig: 'preserved' },
          { id: 'box-b', position: 1, mark: 0, privateBoxConfig: 'preserved' },
        ],
      }],
    });
    expect(sourceBoxes.blocks[0].lines[0].boxes.map(({ mark }) => mark)).toEqual([1, 3]);
  });
});
