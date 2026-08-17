/* ============================================================
   Passwords, sessions and role checks.

   Hashing uses node:crypto scrypt rather than a bcrypt/argon2
   package: it is memory-hard, in the standard library, and needs
   no native build — which matters on a serverless runtime where
   cold starts pay for every dependency.
   ============================================================ */

import { randomBytes, scrypt as _scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { all, one, run } from './db.js';

const scrypt = promisify(_scrypt);

const KEYLEN = 64;
const COST = 16384;              // 2^14 — ~50ms, tuned for a serverless budget
const SESSION_DAYS = 30;
export const COOKIE = 'mh_session';

/* ---------------- passwords ---------------- */

export async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    throw new HttpError(400, 'Password must be at least 8 characters.');
  }
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEYLEN, { N: COST });
  return `scrypt$${COST}$${salt.toString('hex')}$${key.toString('hex')}`;
}

export async function verifyPassword(password, stored) {
  try {
    const [scheme, cost, saltHex, keyHex] = String(stored).split('$');
    if (scheme !== 'scrypt') return false;
    const key = await scrypt(password, Buffer.from(saltHex, 'hex'), KEYLEN, { N: Number(cost) });
    const expected = Buffer.from(keyHex, 'hex');
    // constant-time: a length mismatch must not short-circuit either
    return key.length === expected.length && timingSafeEqual(key, expected);
  } catch {
    return false;
  }
}

/* ---------------- sessions ---------------- */

export function newId(prefix = 'id') {
  return prefix + '_' + randomBytes(12).toString('hex');
}

export async function createSession(userId, userAgent) {
  const id = randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  await run(
    'insert into sessions (id, user_id, expires_at, user_agent, created_at) values (?, ?, ?, ?, ?)',
    [id, userId, expires, (userAgent || '').slice(0, 200), new Date().toISOString()]
  );
  return { id, expires };
}

export async function destroySession(id) {
  if (id) await run('delete from sessions where id = ?', [id]);
}

/** Resolve the signed-in user from the request cookie, or null. */
export async function currentUser(req) {
  const sid = readCookie(req, COOKIE);
  if (!sid) return null;

  const row = await one(
    `select u.id, u.email, u.first_name, u.last_name, u.phone, u.country,
            u.role, u.guest_id, u.active, s.expires_at
       from sessions s join users u on u.id = s.user_id
      where s.id = ?`,
    [sid]
  );
  if (!row) return null;

  if (new Date(row.expires_at) < new Date()) {
    await destroySession(sid);
    return null;
  }
  if (!row.active) return null;

  delete row.expires_at;
  return row;
}

/* ---------------- cookies ---------------- */

export function readCookie(req, name) {
  const header = req.headers?.cookie || '';
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

export function sessionCookie(value, expires) {
  const bits = [
    `${COOKIE}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    // Vercel is always https; locally the flag would stop the cookie sticking
    process.env.VERCEL ? 'Secure' : null,
    expires ? `Expires=${new Date(expires).toUTCString()}` : 'Max-Age=0'
  ];
  return bits.filter(Boolean).join('; ');
}

/* ---------------- guards ---------------- */

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const RANK = { guest: 1, staff: 2, manager: 3 };

/** Throws 401/403 unless the caller holds at least `role`. */
export async function requireRole(req, role = 'guest') {
  const user = await currentUser(req);
  if (!user) throw new HttpError(401, 'Please sign in.');
  if (RANK[user.role] < RANK[role]) throw new HttpError(403, 'You do not have access to that.');
  return user;
}

export async function requireStaff(req) { return requireRole(req, 'staff'); }
export async function requireManager(req) { return requireRole(req, 'manager'); }

/** Housekeeping — expired rows are dead weight on a shared database. */
export async function purgeExpiredSessions() {
  const res = await run('delete from sessions where expires_at < ?', [new Date().toISOString()]);
  return res.rowsAffected;
}

export async function listSessions(userId) {
  return all('select id, created_at, expires_at, user_agent from sessions where user_id = ?', [userId]);
}
