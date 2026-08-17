/* ============================================================
   Turso / libSQL connection

   Credentials come from the environment and never touch the
   browser: this module is only ever imported by code running on
   the server (the /api functions and the scripts in /scripts).
   ============================================================ */

import { createClient } from '@libsql/client';
import { readFileSync, existsSync } from 'node:fs';

/* --- in local dev there is no Vercel to inject env vars --- */
if (!process.env.TURSO_DATABASE_URL && existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    if (!process.env[key]) process.env[key] = t.slice(i + 1).trim();
  }
}

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  throw new Error(
    'TURSO_DATABASE_URL is not set. Locally put it in .env.local; ' +
    'on Vercel add it under Settings → Environment Variables.'
  );
}

export const db = createClient({ url, authToken });

/* ============================================================
   Small helpers so call sites stay readable
   ============================================================ */

/** All matching rows as plain objects. */
export async function all(sql, args = []) {
  const res = await db.execute({ sql, args });
  return res.rows.map(toObject);
}

/** First matching row, or null. */
export async function one(sql, args = []) {
  const rows = await all(sql, args);
  return rows.length ? rows[0] : null;
}

/** Run a statement; returns { rowsAffected, lastInsertRowid }. */
export async function run(sql, args = []) {
  const res = await db.execute({ sql, args });
  return { rowsAffected: res.rowsAffected, lastInsertRowid: res.lastInsertRowid };
}

/** Run several statements atomically. `stmts` is [{ sql, args }]. */
export async function tx(stmts) {
  return db.batch(stmts, 'write');
}

/**
 * libSQL returns row objects with a null prototype and BigInt for
 * integers, neither of which survives JSON.stringify cleanly.
 */
function toObject(row) {
  const out = {};
  for (const key of Object.keys(row)) {
    const v = row[key];
    out[key] = typeof v === 'bigint' ? Number(v) : v;
  }
  return out;
}

/** SQLite has no boolean type; store 0/1 and convert at the edges. */
export const bool = v => (v ? 1 : 0);
export const unbool = v => v === 1 || v === true;

/** Columns that hold JSON are stored as text. */
export const json = v => (v === undefined || v === null ? null : JSON.stringify(v));
export function unjson(v, fallback = null) {
  if (v === null || v === undefined) return fallback;
  try { return JSON.parse(v); } catch { return fallback; }
}
