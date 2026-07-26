import { requireCsrf, requireSession } from '../_lib/auth.js';
import { apiError, json, readJson, requireTrustedOrigin } from '../_lib/http.js';

const MAX_CAMPAIGN_BYTES = 2_500_000;

function campaignResponse(row) {
  if (!row) return { campaign: null };
  return {
    campaign: {
      payload: JSON.parse(row.payload),
      revision: row.revision,
      updatedAt: row.updatedAt,
    },
  };
}

export async function onRequestGet({ request, env }) {
  const session = await requireSession(request, env);
  if (session instanceof Response) return session;
  const row = await env.DB.prepare('SELECT payload, revision, updated_at AS updatedAt FROM campaigns WHERE user_id = ?')
    .bind(session.userId).first();
  return json({ ok: true, ...campaignResponse(row) });
}

export async function onRequestPut({ request, env }) {
  const originError = requireTrustedOrigin(request, env);
  if (originError) return originError;
  const session = await requireSession(request, env);
  if (session instanceof Response) return session;
  const csrfError = requireCsrf(request, session);
  if (csrfError) return csrfError;

  let body;
  try {
    body = await readJson(request, MAX_CAMPAIGN_BYTES);
  } catch (error) {
    if (error.message === 'PAYLOAD_TOO_LARGE') return apiError(413, 'CAMPAIGN_TOO_LARGE', 'Cette campagne est trop volumineuse pour la synchronisation.');
    return apiError(400, 'INVALID_JSON', 'Campagne invalide.');
  }
  const payload = body?.payload;
  const baseRevision = Number(body?.baseRevision);
  if (!payload || payload.format !== 'cadence-campaign' || payload.schemaVersion !== 2 || !Number.isInteger(baseRevision) || baseRevision < 0) {
    return apiError(400, 'INVALID_CAMPAIGN', 'Format de campagne invalide.');
  }

  const existing = await env.DB.prepare('SELECT payload, revision, updated_at AS updatedAt FROM campaigns WHERE user_id = ?')
    .bind(session.userId).first();
  const currentRevision = Number(existing?.revision || 0);
  if (baseRevision !== currentRevision) {
    return json({
      ok: false,
      error: { code: 'REVISION_CONFLICT', message: 'Une version plus récente existe déjà.' },
      ...campaignResponse(existing),
    }, { status: 409 });
  }

  const serialized = JSON.stringify(payload);
  if (new TextEncoder().encode(serialized).byteLength > MAX_CAMPAIGN_BYTES) {
    return apiError(413, 'CAMPAIGN_TOO_LARGE', 'Cette campagne est trop volumineuse pour la synchronisation.');
  }
  const revision = currentRevision + 1;
  const updatedAt = new Date().toISOString();
  await env.DB.prepare(`
    INSERT INTO campaigns (user_id, payload, revision, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      payload = excluded.payload,
      revision = excluded.revision,
      updated_at = excluded.updated_at
  `).bind(session.userId, serialized, revision, updatedAt).run();
  return json({ ok: true, campaign: { payload, revision, updatedAt } });
}
