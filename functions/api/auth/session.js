import { currentSession, publicUser } from '../../_lib/auth.js';
import { json } from '../../_lib/http.js';

export async function onRequestGet({ request, env }) {
  const session = await currentSession(request, env);
  if (!session) return json({ ok: true, authenticated: false });
  return json({
    ok: true,
    authenticated: true,
    user: publicUser(session),
    csrfToken: session.csrfToken,
  });
}
