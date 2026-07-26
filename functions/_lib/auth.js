import { apiError, cookieValue } from './http.js';
import { sha256 } from './crypto.js';

export const SESSION_COOKIE = '__Host-cadence_session';

export async function currentSession(request, env) {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) return null;
  const tokenHash = await sha256(token);
  const now = new Date().toISOString();
  const session = await env.DB.prepare(`
    SELECT
      sessions.token_hash AS tokenHash,
      sessions.csrf_token AS csrfToken,
      sessions.expires_at AS expiresAt,
      accounts.id AS userId,
      accounts.email AS email,
      accounts.display_name AS displayName,
      accounts.role AS role,
      accounts.disabled AS disabled
    FROM sessions
    JOIN accounts ON accounts.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?
  `).bind(tokenHash, now).first();
  if (!session || session.disabled) return null;
  return session;
}

export async function requireSession(request, env) {
  const session = await currentSession(request, env);
  return session || apiError(401, 'AUTH_REQUIRED', 'Connexion requise.');
}

export function requireCsrf(request, session) {
  const csrf = request.headers.get('X-Cadence-CSRF') || '';
  return csrf && csrf === session.csrfToken
    ? null
    : apiError(403, 'CSRF_INVALID', 'Jeton de sécurité invalide.');
}

export function publicUser(session) {
  return {
    id: session.userId,
    email: session.email,
    displayName: session.displayName,
    role: session.role,
  };
}
