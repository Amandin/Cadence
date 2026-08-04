import { requireCsrf, requireSession } from './auth.js';
import { requireTrustedOrigin } from './http.js';

export function streamUnchangedResponse(revision) {
  return new Response(null, {
    status: 204,
    headers: {
      'Cache-Control': 'no-store',
      'X-Cadence-Stream-Revision': String(revision),
    },
  });
}

export async function ownerStreamContext(request, env, { write = false } = {}) {
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
