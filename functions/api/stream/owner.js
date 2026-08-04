import { requireCsrf, requireSession } from '../../_lib/auth.js';
import { apiError, json, readJson, requireTrustedOrigin } from '../../_lib/http.js';
import {
  activeOwnerStreamState,
  MAX_STREAM_OWNER_BYTES,
  ownerStreamSnapshot,
  publishOwnerScene,
} from '../../_lib/scene-stream.js';

function noChange(revision) {
  return new Response(null, {
    status: 204,
    headers: {
      'Cache-Control': 'no-store',
      'X-Cadence-Stream-Revision': String(revision),
    },
  });
}

async function ownerContext(request, env, { write = false } = {}) {
  if (write) {
    const originError = requireTrustedOrigin(request, env);
    if (originError) return { error: originError };
  }
  const session = await requireSession(request, env);
  if (session instanceof Response) return { error: session };
  if (write) {
    const csrfError = requireCsrf(request, session);
    if (csrfError) return { error: csrfError };
  }
  return { session };
}

export async function onRequestGet({ request, env }) {
  const { session, error } = await ownerContext(request, env);
  if (error) return error;
  const state = await activeOwnerStreamState(env, session.userId);
  const row = state.stream;
  if (!row) return json({ ok: true, stream: null, changes: [], expired: state.expired });
  const searchParams = new URL(request.url).searchParams;
  const since = Number(searchParams.get('since'));
  if (searchParams.has('since') && Number.isInteger(since) && since === Number(row.revision || 0)) {
    return noChange(row.revision);
  }
  const snapshot = await ownerStreamSnapshot(env, row);
  return json({ ok: true, ...snapshot });
}

export async function onRequestPut({ request, env }) {
  const { session, error } = await ownerContext(request, env, { write: true });
  if (error) return error;

  let body;
  try {
    body = await readJson(request, MAX_STREAM_OWNER_BYTES);
  } catch (requestError) {
    if (requestError.message === 'PAYLOAD_TOO_LARGE') {
      return apiError(413, 'STREAM_SCENE_TOO_LARGE', 'Cette scène est trop volumineuse pour la diffusion.');
    }
    return apiError(400, 'INVALID_JSON', 'Scène de diffusion invalide.');
  }

  const state = await activeOwnerStreamState(env, session.userId);
  const row = state.stream;
  if (!row) {
    return state.expired
      ? apiError(404, 'STREAM_EXPIRED', 'La diffusion a expiré après deux heures sans modification.')
      : apiError(404, 'STREAM_NOT_ACTIVE', 'Aucun lien de diffusion actif.');
  }
  if (row.pausedAt) {
    return apiError(409, 'STREAM_PAUSED', 'La diffusion est actuellement sur off.');
  }
  if (typeof body?.streamId !== 'string' || body.streamId !== row.id) {
    return apiError(409, 'STREAM_LINK_CHANGED', 'Le lien de diffusion a changé pendant la synchronisation.');
  }
  try {
    const snapshot = await publishOwnerScene(env, row, body?.scene);
    return json({ ok: true, ...snapshot });
  } catch (requestError) {
    if (requestError.code === 'STREAM_VIEW_TOO_LARGE') {
      return apiError(413, requestError.code, 'La vue publique de cette scène est trop volumineuse.');
    }
    if (requestError.code === 'STREAM_REVOKED') {
      return apiError(404, requestError.code, 'Le lien de diffusion a été révoqué.');
    }
    if (requestError.code === 'STREAM_PAUSED') {
      return apiError(409, requestError.code, 'La diffusion est actuellement sur off.');
    }
    if (requestError.code === 'STREAM_CONCURRENT_UPDATE') {
      return apiError(409, requestError.code, 'Une modification simultanée empêche temporairement la synchronisation.');
    }
    if (String(requestError.code || '').endsWith('_ID_REQUIRED')
      || String(requestError.code || '').endsWith('_ID_DUPLICATE')
      || ['COUNTER_ID_INVALID', 'BOX_ID_INVALID'].includes(requestError.code)) {
      return apiError(409, 'STREAM_IDENTIFIERS_INVALID', 'La scène contient des identifiants absents ou ambigus.');
    }
    console.error('Cadence owner stream publication failed', requestError);
    return apiError(500, 'STREAM_PUBLISH_FAILED', 'La scène n’a pas pu être diffusée.');
  }
}
