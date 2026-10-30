// Passwords are stored as salted scrypt hashes; sessions as SHA-256 hashes of a random token kept in an
// HttpOnly cookie, so a database leak exposes neither.
import { scrypt as scryptCb, randomBytes, timingSafeEqual, createHash, randomInt } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb);
const N = 16384, R = 8, P = 1, LEN = 64;

export async function hashPassword(pw) {
  const salt = randomBytes(16);
  const key = await scrypt(pw.normalize('NFKC'), salt, LEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(pw, stored) {
  const [alg, n, r, p, salt, hash] = String(stored || '').split('$');
  if (alg !== 'scrypt') return false;
  const want = Buffer.from(hash, 'base64');
  const got = await scrypt(pw.normalize('NFKC'), Buffer.from(salt, 'base64'), want.length, { N: +n, r: +r, p: +p });
  return got.length === want.length && timingSafeEqual(got, want);
}

export const newToken = () => randomBytes(32).toString('base64url');
export const sha256 = s => createHash('sha256').update(String(s)).digest('hex');

// Easy to read aloud or type on an iPad: no 0/O or 1/I/L.
const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const wordCode = n => Array.from({ length: n }, () => ALPHA[randomInt(ALPHA.length)]).join('');
export const digitCode = n => Array.from({ length: n }, () => randomInt(10)).join('');
// Shown once at sign-up; lets a parent reset their password without an email service.
export const recoveryCode = () => `${wordCode(4)}-${wordCode(4)}-${wordCode(4)}`;

export function parseCookies(h) {
  const out = {};
  for (const part of String(h || '').split(';')) { const i = part.indexOf('='); if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); }
  return out;
}

export function sessionCookie(token, secure, maxAgeSec) {
  return [`cc_session=${token}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAgeSec}`, secure ? 'Secure' : ''].filter(Boolean).join('; ');
}

// Small in-memory limiter for sign-in attempts: max `limit` hits per key per window.
const hits = new Map();
export function limited(key, limit = 10, windowMs = 15 * 60 * 1000) {
  const now = Date.now(), h = (hits.get(key) || []).filter(t => now - t < windowMs);
  h.push(now); hits.set(key, h);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some(t => now - t < windowMs)) hits.delete(k);
  return h.length > limit;
}

export const validEmail = e => typeof e === 'string' && e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
