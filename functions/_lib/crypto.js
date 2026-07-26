const encoder = new TextEncoder();

function bytesToBase64(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function randomToken(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToBase64(bytes)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function passwordHash(password, saltBase64, iterations) {
  const passwordBytes = encoder.encode(password);
  let key;
  try {
    key = await crypto.subtle.importKey('raw', passwordBytes.buffer, { name: 'PBKDF2' }, false, ['deriveBits']);
  } catch {
    const error = new Error('PBKDF2 import is unavailable.');
    error.name = 'PBKDF2ImportError';
    throw error;
  }
  const salt = base64ToBytes(saltBase64);
  let bits;
  try {
    bits = await crypto.subtle.deriveBits({
      name: 'PBKDF2',
      hash: { name: 'SHA-256' },
      salt: salt.buffer,
      iterations,
    }, key, 256);
  } catch {
    const error = new Error('PBKDF2 derivation is unavailable.');
    error.name = 'PBKDF2DerivationError';
    throw error;
  }
  return bytesToBase64(new Uint8Array(bits));
}

export function constantTimeEqual(left, right) {
  const a = encoder.encode(String(left));
  const b = encoder.encode(String(right));
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (a[index % a.length] || 0) ^ (b[index % b.length] || 0);
  }
  return difference === 0;
}
