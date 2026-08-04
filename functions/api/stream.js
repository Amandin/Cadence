import { apiError, json, readJson, requireTrustedOrigin } from '../_lib/http.js';
import { SCENE_STREAM_MAX_BATCH_CHANGES } from '../../shared/scene-stream-protocol.js';
import {
  bearerStreamToken,
  MAX_STREAM_WRITE_BYTES,
  publicIndicatorState,
  publicStream,
  publicStreamSnapshot,
  streamMetadata,
  streamById,
  updateGuestIndicator,
} from '../_lib/scene-stream.js';

function noChange(revision) {
  return new Response(null, {
    status: 204,
    headers: {
      'Cache-Control': 'no-store',
      'X-Cadence-Stream-Revision': String(revision),
    },
  });
}

function unavailable() {
  return apiError(404, 'STREAM_UNAVAILABLE', 'Cette diffusion n’est pas disponible.');
}

function paused(stream) {
  return json({
    ok: false,
    error: { code: 'STREAM_PAUSED', message: 'Cette diffusion est temporairement sur off.' },
    stream: {
      revision: Number(stream?.revision || 0),
      paused: true,
      serverTime: new Date().toISOString(),
    },
  }, { status: 423 });
}

function writeOutcome(result) {
  if (result.kind === 'invalid') {
    return { ok: false, status: 400, error: { code: 'STREAM_VALUE_INVALID', message: 'La valeur proposée est invalide.' } };
  }
  if (result.kind === 'forbidden') {
    return { ok: false, status: 403, error: { code: 'STREAM_WRITE_FORBIDDEN', message: 'Cet indicateur ne peut pas être modifié.' } };
  }
  if (result.kind === 'conflict') {
    return {
      ok: false,
      status: 409,
      error: { code: 'INDICATOR_VERSION_CONFLICT', message: 'Cet indicateur a été modifié plus récemment.' },
      indicator: publicIndicatorState(result),
    };
  }
  return {
    ok: true,
    indicator: publicIndicatorState(result),
    unchanged: result.unchanged === true,
  };
}

async function guestStream(request, env) {
  const token = bearerStreamToken(request);
  if (!token) return null;
  return publicStream(env, token);
}

export async function onRequestGet({ request, env }) {
  const stream = await guestStream(request, env);
  if (!stream) return unavailable();
  if (stream.pausedAt) return paused(stream);
  const searchParams = new URL(request.url).searchParams;
  const since = Number(searchParams.get('since'));
  if (searchParams.has('since') && Number.isInteger(since) && since === Number(stream.revision || 0)) {
    return noChange(stream.revision);
  }
  const snapshot = await publicStreamSnapshot(env, stream);
  if (!snapshot) return apiError(500, 'STREAM_INVALID', 'La diffusion est temporairement incohérente.');
  return json({ ok: true, ...snapshot });
}

export async function onRequestPatch({ request, env }) {
  const originError = requireTrustedOrigin(request, env);
  if (originError) return originError;
  const stream = await guestStream(request, env);
  if (!stream) return unavailable();
  if (stream.pausedAt) return paused(stream);

  let body;
  try {
    body = await readJson(request, MAX_STREAM_WRITE_BYTES);
  } catch (requestError) {
    if (requestError.message === 'PAYLOAD_TOO_LARGE') {
      return apiError(413, 'STREAM_WRITE_TOO_LARGE', 'Cette modification est trop volumineuse.');
    }
    return apiError(400, 'INVALID_JSON', 'Modification invalide.');
  }

  const changes = Array.isArray(body?.changes) ? body.changes : null;
  if (changes && (changes.length < 1 || changes.length > SCENE_STREAM_MAX_BATCH_CHANGES)) {
    return apiError(400, 'STREAM_BATCH_INVALID', `Un lot doit contenir entre 1 et ${SCENE_STREAM_MAX_BATCH_CHANGES} modifications.`);
  }

  const results = [];
  for (const change of changes || [body]) {
    results.push(writeOutcome(await updateGuestIndicator(env, stream, change)));
  }
  const refreshed = await streamById(env, stream.id);
  if (!refreshed) return unavailable();
  const revision = Number(refreshed?.revision || stream.revision || 0);
  if (changes) {
    return json({ ok: true, revision, stream: streamMetadata(refreshed), results });
  }
  const [outcome] = results;
  if (!outcome.ok) return json({
    ok: false,
    error: outcome.error,
    revision,
    stream: streamMetadata(refreshed),
    ...(outcome.indicator ? { indicator: outcome.indicator } : {}),
  }, { status: outcome.status });
  return json({
    ok: true,
    revision,
    stream: streamMetadata(refreshed),
    indicator: outcome.indicator,
    unchanged: outcome.unchanged,
  });
}
