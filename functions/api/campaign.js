import { requireCsrf, requireSession } from '../_lib/auth.js';
import { apiError, json, readJson, requireTrustedOrigin } from '../_lib/http.js';
import {
  applyCampaignPatch,
  campaignContentHash,
  serializedBytes,
  validateCampaignPatch,
} from '../../shared/cloud-sync-protocol.js';

const MAX_CAMPAIGN_BYTES = 2_500_000;
const MAX_PATCH_BYTES = 750_000;
const MAX_PATCH_COUNT = 100;
const HASH_PATTERN = /^[a-f0-9]{64}$/;

function campaignMetadata(row) {
  if (!row) return null;
  return {
    revision: Number(row.revision || 0),
    hash: row.contentHash || null,
    updatedAt: row.updatedAt,
    payloadBytes: Number(row.payloadBytes || 0),
    patchCount: Number(row.patchCount || 0),
  };
}

function conflictResponse(row, code = 'REVISION_CONFLICT', message = 'Une version plus récente existe déjà.') {
  return json({
    ok: false,
    error: { code, message },
    campaign: campaignMetadata(row),
  }, { status: 409 });
}

async function campaignRow(env, userId, { withPayload = false } = {}) {
  const columns = withPayload ? 'payload, base_revision AS baseRevision,' : '';
  return env.DB.prepare(`
    SELECT ${columns}
      revision,
      content_hash AS contentHash,
      updated_at AS updatedAt,
      payload_bytes AS payloadBytes,
      patch_count AS patchCount
    FROM campaigns
    WHERE user_id = ?
  `).bind(userId).first();
}

async function fullCampaign(env, userId, row) {
  if (!row) return null;
  let payload = JSON.parse(row.payload);
  const patches = await env.DB.prepare(`
    SELECT patch, revision, result_hash AS resultHash
    FROM campaign_patches
    WHERE user_id = ? AND revision > ?
    ORDER BY revision ASC
  `).bind(userId, Number(row.baseRevision || 0)).all();

  for (const entry of patches.results || []) {
    payload = applyCampaignPatch(payload, JSON.parse(entry.patch));
  }

  const hash = await campaignContentHash(payload);
  if (row.contentHash && hash !== row.contentHash) throw new Error('SYNC_INTEGRITY_ERROR');
  return {
    payload,
    ...campaignMetadata({ ...row, contentHash: hash }),
  };
}

async function authorizedContext(request, env, { csrf = false } = {}) {
  const originError = csrf ? requireTrustedOrigin(request, env) : null;
  if (originError) return { error: originError };
  const session = await requireSession(request, env);
  if (session instanceof Response) return { error: session };
  if (csrf) {
    const csrfError = requireCsrf(request, session);
    if (csrfError) return { error: csrfError };
  }
  return { session };
}

export async function onRequestGet({ request, env }) {
  const { session, error } = await authorizedContext(request, env);
  if (error) return error;
  const metadataOnly = new URL(request.url).searchParams.get('meta') === '1';
  const row = await campaignRow(env, session.userId, { withPayload: !metadataOnly });
  if (!row) return json({ ok: true, campaign: null });
  if (metadataOnly) return json({ ok: true, campaign: campaignMetadata(row) });

  try {
    return json({ ok: true, campaign: await fullCampaign(env, session.userId, row) });
  } catch (requestError) {
    console.error('Cadence campaign reconstruction failed', requestError);
    return apiError(500, 'SYNC_INTEGRITY_ERROR', 'La sauvegarde distante est incohérente. Aucun contenu local n’a été remplacé.');
  }
}

export async function onRequestPut({ request, env }) {
  const { session, error } = await authorizedContext(request, env, { csrf: true });
  if (error) return error;

  let body;
  try {
    body = await readJson(request, MAX_CAMPAIGN_BYTES);
  } catch (requestError) {
    if (requestError.message === 'PAYLOAD_TOO_LARGE') return apiError(413, 'CAMPAIGN_TOO_LARGE', 'Cette campagne est trop volumineuse pour la synchronisation.');
    return apiError(400, 'INVALID_JSON', 'Campagne invalide.');
  }

  const payload = body?.payload;
  const baseRevision = Number(body?.baseRevision);
  if (!payload || payload.format !== 'cadence-campaign' || payload.schemaVersion !== 2 || !Number.isInteger(baseRevision) || baseRevision < 0) {
    return apiError(400, 'INVALID_CAMPAIGN', 'Format de campagne invalide.');
  }

  const existing = await campaignRow(env, session.userId);
  const currentRevision = Number(existing?.revision || 0);
  if (baseRevision !== currentRevision) return conflictResponse(existing);

  const serialized = JSON.stringify(payload);
  const payloadBytes = serializedBytes(payload);
  if (payloadBytes > MAX_CAMPAIGN_BYTES) return apiError(413, 'CAMPAIGN_TOO_LARGE', 'Cette campagne est trop volumineuse pour la synchronisation.');

  const hash = await campaignContentHash(payload);
  const revision = currentRevision + 1;
  const updatedAt = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO campaigns (user_id, payload, revision, updated_at, content_hash, base_revision, payload_bytes, patch_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
      ON CONFLICT(user_id) DO UPDATE SET
        payload = excluded.payload,
        revision = excluded.revision,
        updated_at = excluded.updated_at,
        content_hash = excluded.content_hash,
        base_revision = excluded.base_revision,
        payload_bytes = excluded.payload_bytes,
        patch_count = 0
    `).bind(session.userId, serialized, revision, updatedAt, hash, revision, payloadBytes),
    env.DB.prepare('DELETE FROM campaign_patches WHERE user_id = ?').bind(session.userId),
  ]);
  return json({ ok: true, campaign: { revision, hash, updatedAt, payloadBytes, patchCount: 0 } });
}

export async function onRequestPatch({ request, env }) {
  const { session, error } = await authorizedContext(request, env, { csrf: true });
  if (error) return error;

  let body;
  try {
    body = await readJson(request, MAX_PATCH_BYTES);
  } catch (requestError) {
    if (requestError.message === 'PAYLOAD_TOO_LARGE') return apiError(413, 'PATCH_TOO_LARGE', 'Cette modification nécessite une sauvegarde complète.');
    return apiError(400, 'INVALID_JSON', 'Modification invalide.');
  }

  const baseRevision = Number(body?.baseRevision);
  const baseHash = String(body?.baseHash || '');
  const resultHash = String(body?.resultHash || '');
  const patch = body?.patch;
  if (!Number.isInteger(baseRevision) || baseRevision < 1 || !HASH_PATTERN.test(baseHash) || !HASH_PATTERN.test(resultHash) || !validateCampaignPatch(patch)) {
    return apiError(400, 'INVALID_PATCH', 'Modification de campagne invalide.');
  }

  const existing = await campaignRow(env, session.userId);
  if (!existing) return conflictResponse(existing, 'FULL_SYNC_REQUIRED', 'Une sauvegarde complète est nécessaire.');
  if (!existing.contentHash || Number(existing.patchCount || 0) >= MAX_PATCH_COUNT) {
    return conflictResponse(existing, 'FULL_SYNC_REQUIRED', 'Une sauvegarde complète est nécessaire pour consolider la campagne.');
  }
  if (baseRevision !== Number(existing.revision) || baseHash !== existing.contentHash) return conflictResponse(existing);

  const serializedPatch = JSON.stringify(patch);
  if (serializedBytes(patch) > MAX_PATCH_BYTES) return apiError(413, 'PATCH_TOO_LARGE', 'Cette modification nécessite une sauvegarde complète.');

  const revision = baseRevision + 1;
  const updatedAt = new Date().toISOString();
  const patchCount = Number(existing.patchCount || 0) + 1;
  await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO campaign_patches (user_id, revision, patch, result_hash, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(session.userId, revision, serializedPatch, resultHash, updatedAt),
    env.DB.prepare(`
      UPDATE campaigns
      SET revision = ?, content_hash = ?, updated_at = ?, patch_count = ?
      WHERE user_id = ? AND revision = ? AND content_hash = ?
    `).bind(revision, resultHash, updatedAt, patchCount, session.userId, baseRevision, baseHash),
  ]);
  return json({
    ok: true,
    campaign: {
      revision,
      hash: resultHash,
      updatedAt,
      payloadBytes: Number(existing.payloadBytes || 0),
      patchCount,
    },
  });
}
