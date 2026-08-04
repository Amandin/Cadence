import { currentSession, requireCsrf } from '../../_lib/auth.js';
import { expiredSessionCookie, json, requireTrustedOrigin } from '../../_lib/http.js';
import { pauseOwnerStreamsAfterDisconnect } from '../../_lib/scene-stream.js';

export async function onRequestPost({ request, env }) {
  const originError = requireTrustedOrigin(request, env);
  if (originError) return originError;
  const session = await currentSession(request, env);
  if (session) {
    const csrfError = requireCsrf(request, session);
    if (csrfError) return csrfError;
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(session.tokenHash).run();
    await pauseOwnerStreamsAfterDisconnect(env, session.userId);
  }
  return json({ ok: true }, { headers: { 'Set-Cookie': expiredSessionCookie() } });
}
