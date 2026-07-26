import { constantTimeEqual, passwordHash, randomToken, sha256 } from '../../_lib/crypto.js';
import { apiError, json, readJson, requireTrustedOrigin, sessionCookie } from '../../_lib/http.js';

const DEFAULT_ITERATIONS = 310_000;
const DUMMY_SALT = 'Y2FkZW5jZS1kdW1teS1zYWx0';
const DUMMY_HASH = 'h7xqewOCcWQFZ9v1z1h1b2EGkqL3J4pMDV3uYj6lKq4=';
const LOCK_MINUTES = 15;
const MAX_FAILURES = 8;

function normalizedEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export async function onRequestPost({ request, env }) {
  const originError = requireTrustedOrigin(request, env);
  if (originError) return originError;

  let body;
  try {
    body = await readJson(request, 8_000);
  } catch {
    return apiError(400, 'INVALID_REQUEST', 'Requête invalide.');
  }

  const email = normalizedEmail(body.email);
  const password = String(body.password || '');
  if (!email || password.length < 1 || password.length > 256) {
    return apiError(400, 'INVALID_REQUEST', 'Adresse ou mot de passe invalide.');
  }

  const ipHash = await sha256(`ip:${request.headers.get('CF-Connecting-IP') || 'unknown'}`);
  const fifteenMinutesAgo = new Date(Date.now() - LOCK_MINUTES * 60_000).toISOString();
  const attempt = await env.DB.prepare('SELECT attempt_count AS attemptCount, window_started AS windowStarted FROM login_attempts WHERE fingerprint = ?')
    .bind(ipHash)
    .first();
  if (attempt && attempt.windowStarted > fifteenMinutesAgo && attempt.attemptCount >= 20) {
    return apiError(429, 'TOO_MANY_ATTEMPTS', 'Trop de tentatives. Réessaie dans quelques minutes.');
  }

  const account = await env.DB.prepare(`
    SELECT id, email, display_name AS displayName, role, disabled,
      password_hash AS passwordHash, password_salt AS passwordSalt,
      password_iterations AS passwordIterations,
      failed_login_count AS failedLoginCount, locked_until AS lockedUntil
    FROM accounts WHERE email = ?
  `).bind(email).first();

  const iterations = account?.passwordIterations || DEFAULT_ITERATIONS;
  const candidateHash = await passwordHash(password, account?.passwordSalt || DUMMY_SALT, iterations);
  const passwordValid = !!account && constantTimeEqual(candidateHash, account.passwordHash || DUMMY_HASH);
  const locked = !!account?.lockedUntil && account.lockedUntil > new Date().toISOString();

  if (!passwordValid || account?.disabled || locked) {
    const now = new Date().toISOString();
    if (!attempt || attempt.windowStarted <= fifteenMinutesAgo) {
      await env.DB.prepare('INSERT INTO login_attempts (fingerprint, window_started, attempt_count) VALUES (?, ?, 1) ON CONFLICT(fingerprint) DO UPDATE SET window_started = excluded.window_started, attempt_count = 1')
        .bind(ipHash, now).run();
    } else {
      await env.DB.prepare('UPDATE login_attempts SET attempt_count = attempt_count + 1 WHERE fingerprint = ?').bind(ipHash).run();
    }
    if (account && !locked) {
      const failures = Number(account.failedLoginCount || 0) + 1;
      const lockedUntil = failures >= MAX_FAILURES ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null;
      await env.DB.prepare('UPDATE accounts SET failed_login_count = ?, locked_until = ? WHERE id = ?')
        .bind(failures >= MAX_FAILURES ? 0 : failures, lockedUntil, account.id).run();
    }
    return apiError(401, 'INVALID_CREDENTIALS', 'Adresse ou mot de passe incorrect.');
  }

  const token = randomToken(32);
  const csrfToken = randomToken(24);
  const tokenHash = await sha256(token);
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString();
  await env.DB.batch([
    env.DB.prepare('UPDATE accounts SET failed_login_count = 0, locked_until = NULL, last_login_at = ? WHERE id = ?').bind(now, account.id),
    env.DB.prepare('DELETE FROM login_attempts WHERE fingerprint = ?').bind(ipHash),
    env.DB.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(now),
    env.DB.prepare('INSERT INTO sessions (token_hash, user_id, csrf_token, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(tokenHash, account.id, csrfToken, now, expiresAt, now),
  ]);

  return json({
    ok: true,
    authenticated: true,
    user: { id: account.id, email: account.email, displayName: account.displayName, role: account.role },
    csrfToken,
  }, { headers: { 'Set-Cookie': sessionCookie(token) } });
}
