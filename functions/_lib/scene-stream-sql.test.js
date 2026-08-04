import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it } from 'vitest';
import { BULK_OWNER_INDICATOR_UPSERT_SQL } from './scene-stream.js';

const databases = [];

function database() {
  const db = new DatabaseSync(':memory:');
  databases.push(db);
  db.exec(`
    CREATE TABLE accounts (
      id TEXT PRIMARY KEY,
      disabled INTEGER NOT NULL DEFAULT 0
    );
  `);
  db.exec(readFileSync(new URL('../../migrations/0004_private_scene_stream.sql', import.meta.url), 'utf8'));
  db.exec(readFileSync(new URL('../../migrations/0005_pause_scene_stream.sql', import.meta.url), 'utf8'));
  db.prepare('INSERT INTO accounts (id, disabled) VALUES (?, 0)').run('owner-1');
  db.prepare(`
    INSERT INTO scene_streams (
      id, owner_id, token_hash, revision, created_at, updated_at
    )
    VALUES (?, ?, ?, 0, ?, ?)
  `).run('stream-1', 'owner-1', 'hash-1', '2026-07-31T10:00:00.000Z', '2026-07-31T10:00:00.000Z');
  return db;
}

function upsert(db, entries, now = '2026-07-31T10:01:00.000Z') {
  return db.prepare(BULK_OWNER_INDICATOR_UPSERT_SQL).run(
    JSON.stringify(entries.map((entry) => ({
      participantId: entry.participantId,
      indicatorId: entry.indicatorId,
      valueJson: JSON.stringify(entry.value),
      definitionHash: entry.definitionHash || 'definition-1',
      writable: entry.writable ? 1 : 0,
    }))),
    'stream-1',
    'scene-1',
    now,
    'stream-1',
  );
}

function state(db, indicatorId = 'health') {
  const row = db.prepare(`
    SELECT
      version,
      value_json AS valueJson,
      owner_value_json AS ownerValueJson,
      definition_hash AS definitionHash,
      writable,
      pending
    FROM scene_stream_indicators
    WHERE stream_id = 'stream-1'
      AND scene_id = 'scene-1'
      AND participant_id = 'hero-1'
      AND indicator_id = ?
  `).get(indicatorId);
  return {
    ...row,
    value: JSON.parse(row.valueJson),
    ownerValue: JSON.parse(row.ownerValueJson),
  };
}

afterEach(() => {
  while (databases.length) databases.pop().close();
});

describe('scene stream D1 reconciliation SQL', () => {
  it('does not publish indicator values while the stream is paused', () => {
    const db = database();
    db.prepare("UPDATE scene_streams SET paused_at = '2026-08-04T10:00:00.000Z' WHERE id = 'stream-1'").run();

    upsert(db, [{
      participantId: 'hero-1',
      indicatorId: 'health',
      value: { current: 8 },
      writable: true,
    }]);

    expect(db.prepare('SELECT COUNT(*) AS count FROM scene_stream_indicators').get().count).toBe(0);
  });

  it('preserves a pending guest value, acknowledges it, and lets a newer owner value win', () => {
    const db = database();
    upsert(db, [{
      participantId: 'hero-1',
      indicatorId: 'health',
      value: { current: 8 },
      writable: true,
    }]);
    db.prepare(`
      UPDATE scene_streams
      SET scene_id = 'scene-1', config_hash = 'config-1', revision = revision + 1
      WHERE id = 'stream-1'
    `).run();
    db.prepare(`
      UPDATE scene_stream_indicators
      SET value_json = ?, version = version + 1, pending = 1, updated_at = ?
      WHERE stream_id = 'stream-1' AND indicator_id = 'health'
    `).run(JSON.stringify({ current: 6 }), '2026-07-31T10:02:00.000Z');

    expect(db.prepare("SELECT revision FROM scene_streams WHERE id = 'stream-1'").get().revision).toBe(2);
    upsert(db, [{
      participantId: 'hero-1',
      indicatorId: 'health',
      value: { current: 8 },
      writable: true,
    }]);
    expect(state(db)).toMatchObject({
      version: 2,
      value: { current: 6 },
      ownerValue: { current: 8 },
      pending: 1,
    });

    upsert(db, [{
      participantId: 'hero-1',
      indicatorId: 'health',
      value: { current: 6 },
      writable: true,
    }]);
    expect(state(db)).toMatchObject({
      version: 2,
      value: { current: 6 },
      ownerValue: { current: 6 },
      pending: 0,
    });
    expect(db.prepare("SELECT revision FROM scene_streams WHERE id = 'stream-1'").get().revision).toBe(2);

    db.prepare(`
      UPDATE scene_stream_indicators
      SET value_json = ?, version = version + 1, pending = 1, updated_at = ?
      WHERE stream_id = 'stream-1' AND indicator_id = 'health'
    `).run(JSON.stringify({ current: 5 }), '2026-07-31T10:03:00.000Z');
    upsert(db, [{
      participantId: 'hero-1',
      indicatorId: 'health',
      value: { current: 9 },
      writable: true,
    }]);
    expect(state(db)).toMatchObject({
      version: 4,
      value: { current: 9 },
      ownerValue: { current: 9 },
      pending: 0,
    });
  });

  it('upserts many indicators in one statement without coupling their versions', () => {
    const db = database();
    const entries = Array.from({ length: 80 }, (_, index) => ({
      participantId: 'hero-1',
      indicatorId: `indicator-${index}`,
      value: { current: index },
      writable: true,
    }));

    upsert(db, entries);
    upsert(db, entries.map((entry, index) => (
      index === 37 ? { ...entry, value: { current: 999 } } : entry
    )));

    expect(db.prepare('SELECT COUNT(*) AS count FROM scene_stream_indicators').get().count).toBe(80);
    expect(state(db, 'indicator-37')).toMatchObject({ version: 2, value: { current: 999 } });
    expect(state(db, 'indicator-38')).toMatchObject({ version: 1, value: { current: 38 } });
  });

  it('revokes write permission and restores the owner value atomically', () => {
    const db = database();
    const ownerEntry = {
      participantId: 'hero-1',
      indicatorId: 'health',
      value: { current: 8 },
      writable: true,
    };
    upsert(db, [ownerEntry]);
    db.prepare(`
      UPDATE scene_stream_indicators
      SET value_json = ?, version = version + 1, pending = 1, updated_at = ?
      WHERE stream_id = 'stream-1' AND indicator_id = 'health'
    `).run(JSON.stringify({ current: 4 }), '2026-07-31T10:02:00.000Z');

    upsert(db, [{ ...ownerEntry, writable: false }]);

    expect(state(db)).toMatchObject({
      version: 3,
      value: { current: 8 },
      ownerValue: { current: 8 },
      writable: 0,
      pending: 0,
    });
  });

  it('increments only the changed indicator version when its definition changes', () => {
    const db = database();
    const entries = [
      {
        participantId: 'hero-1',
        indicatorId: 'health',
        value: { current: 8 },
        writable: true,
      },
      {
        participantId: 'hero-1',
        indicatorId: 'mana',
        value: { current: 3 },
        writable: true,
      },
    ];
    upsert(db, entries);

    upsert(db, entries.map((entry) => (
      entry.indicatorId === 'health'
        ? { ...entry, definitionHash: 'definition-2' }
        : entry
    )));

    expect(state(db, 'health')).toMatchObject({ version: 2, definitionHash: 'definition-2' });
    expect(state(db, 'mana')).toMatchObject({ version: 1, definitionHash: 'definition-1' });
  });
});
