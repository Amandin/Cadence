import { randomToken, sha256 } from './crypto.js';
import {
  buildSharedSceneView,
  findSharedIndicator,
  hydrateSharedView,
  normalizeStreamIndicatorValue,
  SCENE_STREAM_INACTIVITY_TTL_MS,
  SCENE_STREAM_MAX_WRITE_BYTES,
  SCENE_STREAM_TOKEN_PATTERN,
  sharedViewIndicators,
  streamViewConfiguration,
  validateStreamSceneIdentities,
} from '../../shared/scene-stream-protocol.js';

export const MAX_STREAM_OWNER_BYTES = 1_000_000;
export const MAX_STREAM_VIEW_BYTES = 500_000;
export const MAX_STREAM_WRITE_BYTES = SCENE_STREAM_MAX_WRITE_BYTES;
export const STREAM_INACTIVITY_TTL_MS = SCENE_STREAM_INACTIVITY_TTL_MS;

const encoder = new TextEncoder();

function resultChanges(result) {
  return Number(result?.meta?.changes ?? result?.changes ?? 0);
}

function parseJson(value, fallback = null) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function streamMetadata(row) {
  if (!row) return null;
  return {
    id: row.id,
    sceneId: row.sceneId || '',
    revision: Number(row.revision || 0),
    paused: !!row.pausedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    serverTime: new Date().toISOString(),
  };
}

export { streamMetadata };

function stateFromRow(row) {
  return {
    sceneId: row.sceneId,
    participantId: row.participantId,
    indicatorId: row.indicatorId,
    version: Number(row.version || 0),
    value: parseJson(row.valueJson, {}),
    ownerValue: parseJson(row.ownerValueJson, {}),
    valueJson: row.valueJson,
    ownerValueJson: row.ownerValueJson,
    definitionHash: row.definitionHash,
    writable: Number(row.writable || 0),
    pending: Number(row.pending || 0),
    updatedAt: row.updatedAt,
  };
}

export function reconcileOwnerIndicatorState(state, incomingJson, writable) {
  const next = {
    valueJson: state.valueJson,
    ownerValueJson: state.ownerValueJson,
    pending: state.pending,
    version: state.version,
    writable,
    publicChanged: false,
  };

  if (state.pending) {
    if (!writable) {
      next.valueJson = incomingJson;
      next.ownerValueJson = incomingJson;
      next.pending = 0;
      if (state.valueJson !== incomingJson) {
        next.version += 1;
        next.publicChanged = true;
      }
    } else if (incomingJson === state.valueJson) {
      next.ownerValueJson = incomingJson;
      next.pending = 0;
    } else if (incomingJson !== state.ownerValueJson) {
      next.valueJson = incomingJson;
      next.ownerValueJson = incomingJson;
      next.pending = 0;
      next.version += 1;
      next.publicChanged = true;
    }
  } else if (incomingJson !== state.ownerValueJson || incomingJson !== state.valueJson) {
    next.valueJson = incomingJson;
    next.ownerValueJson = incomingJson;
    next.pending = 0;
    next.version += 1;
    next.publicChanged = true;
  }

  next.stateChanged = next.valueJson !== state.valueJson
    || next.ownerValueJson !== state.ownerValueJson
    || next.pending !== state.pending
    || next.version !== state.version
    || next.writable !== state.writable;
  return next;
}

export function bearerStreamToken(request) {
  const authorization = request.headers.get('Authorization') || '';
  const match = authorization.match(/^Bearer ([A-Za-z0-9_-]+)$/);
  return match && SCENE_STREAM_TOKEN_PATTERN.test(match[1]) ? match[1] : '';
}

export function streamIsExpired(row, now = Date.now()) {
  const updatedAt = Date.parse(row?.updatedAt || '');
  return Number.isFinite(updatedAt) && now - updatedAt >= STREAM_INACTIVITY_TTL_MS;
}

async function rawStreamById(env, streamId) {
  return env.DB.prepare(`
    SELECT
      id,
      scene_id AS sceneId,
      revision,
      view_json AS viewJson,
      config_hash AS configHash,
      share_token AS shareToken,
      paused_at AS pausedAt,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM scene_streams
    WHERE id = ? AND revoked_at IS NULL
    LIMIT 1
  `).bind(streamId).first();
}

async function expireInactiveStream(env, row, now = new Date()) {
  if (!row || !streamIsExpired(row, now.getTime())) return { stream: row || null, expired: false };
  const cutoff = new Date(now.getTime() - STREAM_INACTIVITY_TTL_MS).toISOString();
  const result = await env.DB.prepare(`
    UPDATE scene_streams
    SET revoked_at = ?
    WHERE id = ? AND revoked_at IS NULL AND updated_at = ? AND updated_at <= ?
  `).bind(now.toISOString(), row.id, row.updatedAt, cutoff).run();
  if (resultChanges(result) > 0) return { stream: null, expired: true };

  const refreshed = await rawStreamById(env, row.id);
  return { stream: refreshed, expired: false };
}

export async function activeOwnerStreamState(env, ownerId) {
  const row = await env.DB.prepare(`
    SELECT
      id,
      scene_id AS sceneId,
      revision,
      view_json AS viewJson,
      config_hash AS configHash,
      share_token AS shareToken,
      paused_at AS pausedAt,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM scene_streams
    WHERE owner_id = ? AND revoked_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  `).bind(ownerId).first();
  if (row) return expireInactiveStream(env, row);

  // Manual revocation and regeneration delete rows. A retained revoked row is
  // therefore an expiration tombstone, allowing another client to notify the owner.
  const expiration = await env.DB.prepare(`
    SELECT id
    FROM scene_streams
    WHERE owner_id = ? AND revoked_at IS NOT NULL
    ORDER BY revoked_at DESC
    LIMIT 1
  `).bind(ownerId).first();
  return { stream: null, expired: !!expiration };
}

export async function activeOwnerStream(env, ownerId) {
  return (await activeOwnerStreamState(env, ownerId)).stream;
}

export async function publicStream(env, token) {
  if (!SCENE_STREAM_TOKEN_PATTERN.test(token || '')) return null;
  const tokenHash = await sha256(token);
  const row = await env.DB.prepare(`
    SELECT
      scene_streams.id,
      scene_streams.scene_id AS sceneId,
      scene_streams.revision,
      scene_streams.view_json AS viewJson,
      scene_streams.paused_at AS pausedAt,
      scene_streams.created_at AS createdAt,
      scene_streams.updated_at AS updatedAt
    FROM scene_streams
    JOIN accounts ON accounts.id = scene_streams.owner_id
    WHERE scene_streams.token_hash = ?
      AND scene_streams.revoked_at IS NULL
      AND accounts.disabled = 0
    LIMIT 1
  `).bind(tokenHash).first();
  return (await expireInactiveStream(env, row)).stream;
}

export async function streamById(env, streamId) {
  const row = await rawStreamById(env, streamId);
  return (await expireInactiveStream(env, row)).stream;
}

export async function createOwnerStream(env, ownerId) {
  const token = randomToken(32);
  const tokenHash = await sha256(token);
  const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : randomToken(18);
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM scene_streams WHERE owner_id = ?').bind(ownerId),
    env.DB.prepare(`
      INSERT INTO scene_streams (
        id, owner_id, token_hash, share_token, scene_id, revision, view_json, config_hash,
        created_at, updated_at, revoked_at, paused_at
      )
      VALUES (?, ?, ?, ?, NULL, 0, NULL, NULL, ?, ?, NULL, NULL)
    `).bind(id, ownerId, tokenHash, token, now, now),
  ]);
  return {
    token,
    stream: {
      id,
      sceneId: '',
      revision: 0,
      createdAt: now,
      updatedAt: now,
      paused: false,
    },
  };
}

export async function setOwnerStreamPaused(env, ownerId, streamId, paused) {
  const state = await activeOwnerStreamState(env, ownerId);
  const current = state.stream;
  if (!current) return { stream: null, expired: state.expired };
  if (current.id !== streamId) return { stream: null, changed: true, expired: false };
  if (!!current.pausedAt === paused) return { stream: current, expired: false };

  const now = new Date().toISOString();
  const result = await env.DB.prepare(`
    UPDATE scene_streams
    SET paused_at = ?, revision = revision + 1, updated_at = ?
    WHERE id = ?
      AND owner_id = ?
      AND revoked_at IS NULL
      AND paused_at IS ?
  `).bind(
    paused ? now : null,
    now,
    streamId,
    ownerId,
    current.pausedAt || null,
  ).run();
  if (resultChanges(result) === 0) return { stream: null, changed: true, expired: false };
  return { stream: await rawStreamById(env, streamId), expired: false };
}

export async function pauseOwnerStreamsAfterDisconnect(env, ownerId, now = new Date()) {
  const timestamp = now.toISOString();
  const result = await env.DB.prepare(`
    UPDATE scene_streams
    SET paused_at = ?, revision = revision + 1, updated_at = ?
    WHERE owner_id = ?
      AND revoked_at IS NULL
      AND paused_at IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM sessions
        WHERE user_id = ? AND expires_at > ?
      )
  `).bind(timestamp, timestamp, ownerId, ownerId, timestamp).run();
  return resultChanges(result);
}

export async function pauseExpiredOwnerStreams(env, now = new Date()) {
  const timestamp = now.toISOString();
  const result = await env.DB.prepare(`
    UPDATE scene_streams
    SET paused_at = ?, revision = revision + 1, updated_at = ?
    WHERE revoked_at IS NULL
      AND paused_at IS NULL
      AND EXISTS (
        SELECT 1
        FROM sessions AS expired
        WHERE expired.user_id = scene_streams.owner_id
          AND expired.expires_at <= ?
          AND NOT EXISTS (
            SELECT 1
            FROM sessions AS active
            WHERE active.user_id = expired.user_id AND active.expires_at > ?
          )
      )
  `).bind(timestamp, timestamp, timestamp, timestamp).run();
  return resultChanges(result);
}

export async function pauseDisabledOwnerStreams(env, ownerId, now = new Date()) {
  const timestamp = now.toISOString();
  const result = await env.DB.prepare(`
    UPDATE scene_streams
    SET paused_at = ?, revision = revision + 1, updated_at = ?
    WHERE owner_id = ? AND revoked_at IS NULL AND paused_at IS NULL
  `).bind(timestamp, timestamp, ownerId).run();
  return resultChanges(result);
}

export async function revokeOwnerStreams(env, ownerId) {
  const result = await env.DB.prepare('DELETE FROM scene_streams WHERE owner_id = ?').bind(ownerId).run();
  return resultChanges(result);
}

async function allIndicatorStates(env, streamId, sceneId) {
  const rows = await env.DB.prepare(`
    SELECT
      scene_id AS sceneId,
      participant_id AS participantId,
      indicator_id AS indicatorId,
      version,
      value_json AS valueJson,
      owner_value_json AS ownerValueJson,
      definition_hash AS definitionHash,
      writable,
      pending,
      updated_at AS updatedAt
    FROM scene_stream_indicators
    WHERE stream_id = ? AND scene_id = ?
  `).bind(streamId, sceneId).all();
  return (rows.results || []).map(stateFromRow);
}

async function indicatorState(env, streamId, sceneId, participantId, indicatorId) {
  const row = await env.DB.prepare(`
    SELECT
      scene_id AS sceneId,
      participant_id AS participantId,
      indicator_id AS indicatorId,
      version,
      value_json AS valueJson,
      owner_value_json AS ownerValueJson,
      definition_hash AS definitionHash,
      writable,
      pending,
      updated_at AS updatedAt
    FROM scene_stream_indicators
    WHERE stream_id = ? AND scene_id = ? AND participant_id = ? AND indicator_id = ?
  `).bind(streamId, sceneId, participantId, indicatorId).first();
  return row ? stateFromRow(row) : null;
}

export const BULK_OWNER_INDICATOR_UPSERT_SQL = `
  WITH incoming AS (
    SELECT
      json_extract(value, '$.participantId') AS participant_id,
      json_extract(value, '$.indicatorId') AS indicator_id,
      json_extract(value, '$.valueJson') AS value_json,
      json_extract(value, '$.definitionHash') AS definition_hash,
      CAST(json_extract(value, '$.writable') AS INTEGER) AS writable
    FROM json_each(?)
  )
  INSERT INTO scene_stream_indicators (
    stream_id, scene_id, participant_id, indicator_id, version,
    value_json, owner_value_json, definition_hash, writable, pending, updated_at
  )
  SELECT ?, ?, participant_id, indicator_id, 1,
    value_json, value_json, definition_hash, writable, 0, ?
  FROM incoming
  WHERE EXISTS (
    SELECT 1
    FROM scene_streams
    WHERE id = ? AND revoked_at IS NULL AND paused_at IS NULL
  )
  ON CONFLICT(stream_id, scene_id, participant_id, indicator_id)
  DO UPDATE SET
    version = scene_stream_indicators.version + CASE
      WHEN scene_stream_indicators.value_json IS NOT (
        CASE
          WHEN scene_stream_indicators.pending = 1
            AND excluded.writable = 1
            AND excluded.definition_hash IS scene_stream_indicators.definition_hash
            AND excluded.value_json IS scene_stream_indicators.owner_value_json
            AND excluded.value_json IS NOT scene_stream_indicators.value_json
          THEN scene_stream_indicators.value_json
          ELSE excluded.value_json
        END
      ) OR scene_stream_indicators.definition_hash IS NOT excluded.definition_hash THEN 1
      ELSE 0
    END,
    value_json = CASE
      WHEN scene_stream_indicators.pending = 1
        AND excluded.writable = 1
        AND excluded.definition_hash IS scene_stream_indicators.definition_hash
        AND excluded.value_json IS scene_stream_indicators.owner_value_json
        AND excluded.value_json IS NOT scene_stream_indicators.value_json
      THEN scene_stream_indicators.value_json
      ELSE excluded.value_json
    END,
    owner_value_json = excluded.owner_value_json,
    definition_hash = excluded.definition_hash,
    writable = excluded.writable,
    pending = CASE
      WHEN scene_stream_indicators.pending = 1
        AND excluded.writable = 1
        AND excluded.definition_hash IS scene_stream_indicators.definition_hash
        AND excluded.value_json IS scene_stream_indicators.owner_value_json
        AND excluded.value_json IS NOT scene_stream_indicators.value_json
      THEN 1
      ELSE 0
    END,
    updated_at = excluded.updated_at
  WHERE
    scene_stream_indicators.value_json IS NOT (
      CASE
        WHEN scene_stream_indicators.pending = 1
          AND excluded.writable = 1
          AND excluded.definition_hash IS scene_stream_indicators.definition_hash
          AND excluded.value_json IS scene_stream_indicators.owner_value_json
          AND excluded.value_json IS NOT scene_stream_indicators.value_json
        THEN scene_stream_indicators.value_json
        ELSE excluded.value_json
      END
    )
    OR scene_stream_indicators.owner_value_json IS NOT excluded.owner_value_json
    OR scene_stream_indicators.definition_hash IS NOT excluded.definition_hash
    OR scene_stream_indicators.writable IS NOT excluded.writable
    OR scene_stream_indicators.pending IS NOT (
      CASE
        WHEN scene_stream_indicators.pending = 1
          AND excluded.writable = 1
          AND excluded.definition_hash IS scene_stream_indicators.definition_hash
          AND excluded.value_json IS scene_stream_indicators.owner_value_json
          AND excluded.value_json IS NOT scene_stream_indicators.value_json
        THEN 1
        ELSE 0
      END
    )
`;

const DELETE_STALE_INDICATORS_SQL = `
  DELETE FROM scene_stream_indicators
  WHERE stream_id = ?
    AND (
      scene_id IS NOT ?
      OR json_array(participant_id, indicator_id) NOT IN (
        SELECT value FROM json_each(?)
      )
    )
    AND EXISTS (
      SELECT 1
      FROM scene_streams
      WHERE id = scene_stream_indicators.stream_id
        AND revoked_at IS NULL
        AND paused_at IS NULL
    )
`;

export async function publishOwnerScene(env, stream, scene) {
  const identity = validateStreamSceneIdentities(scene);
  if (!identity.ok) {
    const error = new Error(identity.code);
    error.code = identity.code;
    throw error;
  }

  const view = buildSharedSceneView(scene);
  const viewJson = JSON.stringify(view);
  if (encoder.encode(viewJson).byteLength > MAX_STREAM_VIEW_BYTES) {
    const error = new Error('STREAM_VIEW_TOO_LARGE');
    error.code = 'STREAM_VIEW_TOO_LARGE';
    throw error;
  }
  const configurationJson = JSON.stringify(streamViewConfiguration(view));
  const configHash = await sha256(configurationJson);
  const sceneId = view.scene.id;
  const now = new Date().toISOString();

  const entries = sharedViewIndicators(view);
  const expectedJson = JSON.stringify(entries.map((entry) => [
    entry.participantId,
    entry.indicator.id,
  ]));
  const incoming = await Promise.all(entries.map(async (entry) => {
    const { value, version, ...definition } = entry.indicator;
    return {
      participantId: entry.participantId,
      indicatorId: entry.indicator.id,
      valueJson: JSON.stringify(value),
      definitionHash: await sha256(JSON.stringify(definition)),
      writable: entry.indicator.writable ? 1 : 0,
    };
  }));
  const incomingJson = JSON.stringify(incoming);
  const statements = [
    env.DB.prepare(DELETE_STALE_INDICATORS_SQL).bind(
      stream.id,
      sceneId,
      expectedJson,
    ),
    env.DB.prepare(BULK_OWNER_INDICATOR_UPSERT_SQL).bind(
      incomingJson,
      stream.id,
      sceneId,
      now,
      stream.id,
    ),
  ];
  statements.push(env.DB.prepare(`
    UPDATE scene_streams
    SET
      scene_id = ?,
      view_json = ?,
      config_hash = ?,
      revision = revision + CASE
        WHEN scene_id IS NOT ? OR config_hash IS NOT ? THEN 1
        ELSE 0
      END,
      updated_at = ?
    WHERE id = ? AND revoked_at IS NULL AND paused_at IS NULL
  `).bind(sceneId, viewJson, configHash, sceneId, configHash, now, stream.id));
  const results = await env.DB.batch(statements);
  if (resultChanges(results.at(-1)) === 0) {
    const current = await rawStreamById(env, stream.id);
    const code = current?.pausedAt ? 'STREAM_PAUSED' : 'STREAM_REVOKED';
    const error = new Error(code);
    error.code = code;
    throw error;
  }

  const refreshed = await streamById(env, stream.id);
  if (!refreshed) {
    const error = new Error('STREAM_REVOKED');
    error.code = 'STREAM_REVOKED';
    throw error;
  }
  const states = await allIndicatorStates(env, stream.id, sceneId);
  return {
    stream: streamMetadata(refreshed),
    changes: states.filter((state) => state.pending).map((state) => ({
      sceneId,
      participantId: state.participantId,
      indicatorId: state.indicatorId,
      version: state.version,
      value: state.value,
    })),
  };
}

export async function ownerStreamSnapshot(env, row) {
  if (!row) return { stream: null, token: null, changes: [] };
  const states = row.sceneId ? await allIndicatorStates(env, row.id, row.sceneId) : [];
  return {
    stream: streamMetadata(row),
    token: typeof row.shareToken === 'string' ? row.shareToken : null,
    changes: states.filter((state) => state.pending).map((state) => ({
      sceneId: state.sceneId,
      participantId: state.participantId,
      indicatorId: state.indicatorId,
      version: state.version,
      value: state.value,
    })),
  };
}

export async function publicStreamSnapshot(env, row) {
  if (!row?.viewJson || !row.sceneId) {
    return { stream: streamMetadata(row), view: null };
  }
  const view = parseJson(row.viewJson);
  if (!view) return null;
  const states = await allIndicatorStates(env, row.id, row.sceneId);
  return {
    stream: streamMetadata(row),
    view: hydrateSharedView(view, states),
  };
}

export async function updateGuestIndicator(env, stream, body) {
  const sceneId = typeof body?.sceneId === 'string' ? body.sceneId : '';
  const participantId = typeof body?.participantId === 'string' ? body.participantId : '';
  const indicatorId = typeof body?.indicatorId === 'string' ? body.indicatorId : '';
  const baseVersion = Number(body?.baseVersion);
  if (!sceneId || sceneId !== stream.sceneId || !participantId || !indicatorId || !Number.isInteger(baseVersion) || baseVersion < 1) {
    return { kind: 'invalid' };
  }

  const view = parseJson(stream.viewJson);
  const definition = findSharedIndicator(view, participantId, indicatorId);
  if (!definition) return { kind: 'forbidden' };
  const state = await indicatorState(env, stream.id, sceneId, participantId, indicatorId);
  if (!state || !state.writable || definition.indicator.writable !== true) return { kind: 'forbidden' };
  if (baseVersion !== state.version) return { kind: 'conflict', state, definition };

  const value = normalizeStreamIndicatorValue(definition.indicator, body?.value);
  if (!value) return { kind: 'invalid' };
  const valueJson = JSON.stringify(value);
  if (valueJson === state.valueJson) return { kind: 'success', state, definition, unchanged: true };

  const now = new Date().toISOString();
  const updated = await env.DB.prepare(`
    UPDATE scene_stream_indicators
    SET value_json = ?, version = version + 1, pending = 1, updated_at = ?
    WHERE stream_id = ?
      AND scene_id = ?
      AND participant_id = ?
      AND indicator_id = ?
      AND version = ?
      AND writable = 1
      AND EXISTS (
        SELECT 1
        FROM scene_streams
        WHERE id = ? AND revoked_at IS NULL AND paused_at IS NULL
      )
  `).bind(
    valueJson,
    now,
    stream.id,
    sceneId,
    participantId,
    indicatorId,
    baseVersion,
    stream.id,
  ).run();

  if (resultChanges(updated) === 0) {
    const current = await indicatorState(env, stream.id, sceneId, participantId, indicatorId);
    return current?.writable
      ? { kind: 'conflict', state: current, definition }
      : { kind: 'forbidden' };
  }

  const current = await indicatorState(env, stream.id, sceneId, participantId, indicatorId);
  if (!current) return { kind: 'forbidden' };
  if (current.version !== baseVersion + 1 || current.valueJson !== valueJson) {
    return { kind: 'conflict', state: current, definition };
  }
  return { kind: 'success', state: current, definition };
}

export function publicIndicatorState(result) {
  return {
    ...result.definition.indicator,
    writable: !!result.state.writable,
    version: result.state.version,
    value: result.state.value,
  };
}
