export function json(data, init = {}) {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Cache-Control', 'no-store');
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function apiError(status, code, message) {
  return json({ ok: false, error: { code, message } }, { status });
}

export async function readJson(request, maximumBytes = 2_500_000) {
  const contentLength = Number(request.headers.get('Content-Length') || 0);
  if (contentLength > maximumBytes) throw new Error('PAYLOAD_TOO_LARGE');
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maximumBytes) throw new Error('PAYLOAD_TOO_LARGE');
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('INVALID_JSON');
  }
}

function configuredOrigins(env) {
  return String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function requestOriginAllowed(request, env) {
  const origin = request.headers.get('Origin');
  if (!origin) return false;
  const currentOrigin = new URL(request.url).origin;
  return origin === currentOrigin || configuredOrigins(env).includes(origin);
}

export function requireTrustedOrigin(request, env) {
  return requestOriginAllowed(request, env)
    ? null
    : apiError(403, 'ORIGIN_FORBIDDEN', 'Origine de la requête refusée.');
}

export function cookieValue(request, name) {
  const cookies = request.headers.get('Cookie') || '';
  for (const part of cookies.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name) return decodeURIComponent(part.slice(separator + 1).trim());
  }
  return '';
}

export function sessionCookie(token, maxAgeSeconds = 60 * 60 * 24 * 30) {
  return `__Host-cadence_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAgeSeconds}`;
}

export function expiredSessionCookie() {
  return '__Host-cadence_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0';
}
