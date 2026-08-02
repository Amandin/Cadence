import { requireCsrf, requireSession } from '../../_lib/auth.js';
import { apiError, json, requireTrustedOrigin } from '../../_lib/http.js';
import {
  activeOwnerStreamState,
  createOwnerStream,
  ownerStreamSnapshot,
  revokeOwnerStreams,
} from '../../_lib/scene-stream.js';

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
  const snapshot = await ownerStreamSnapshot(env, state.stream);
  return json({ ok: true, stream: snapshot.stream, expired: state.expired });
}

export async function onRequestPost({ request, env }) {
  const { session, error } = await ownerContext(request, env, { write: true });
  if (error) return error;
  try {
    const created = await createOwnerStream(env, session.userId);
    return json({ ok: true, ...created }, { status: 201 });
  } catch (requestError) {
    console.error('Cadence stream link creation failed', requestError);
    return apiError(500, 'STREAM_CREATE_FAILED', 'Le lien de diffusion n’a pas pu être créé.');
  }
}

export async function onRequestDelete({ request, env }) {
  const { session, error } = await ownerContext(request, env, { write: true });
  if (error) return error;
  try {
    await revokeOwnerStreams(env, session.userId);
    return json({ ok: true, stream: null });
  } catch (requestError) {
    console.error('Cadence stream revocation failed', requestError);
    return apiError(500, 'STREAM_REVOKE_FAILED', 'Le lien de diffusion n’a pas pu être révoqué.');
  }
}
