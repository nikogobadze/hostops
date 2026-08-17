/* ============================================================
   Applies lib/schema.sql to the Turso database.

     node scripts/migrate.mjs           create anything missing
     node scripts/migrate.mjs --drop    drop every table first

   The schema is written with IF NOT EXISTS throughout, so running
   it repeatedly is safe and is the normal way to add a table.
   ============================================================ */

import { db, all } from '../lib/db.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const drop = process.argv.includes('--drop');

if (drop) {
  const tables = await all(
    "select name from sqlite_master where type='table' and name not like 'sqlite_%'"
  );
  if (tables.length) {
    await db.execute('PRAGMA foreign_keys = OFF');
    for (const t of tables) {
      await db.execute(`DROP TABLE IF EXISTS "${t.name}"`);
      console.log('  dropped ' + t.name);
    }
    await db.execute('PRAGMA foreign_keys = ON');
  }
  console.log('dropped ' + tables.length + ' tables');
}

const sql = readFileSync(join(here, '..', 'lib', 'schema.sql'), 'utf8');

/* Strip line comments BEFORE splitting. Doing it after means a chunk
   that merely *starts* with a comment — every statement following a
   section banner — gets discarded along with its statement.
   The schema contains no string literal holding "--", so removing
   them line-wise is safe here. */
const statements = sql
  .split('\n')
  .map(line => line.replace(/--.*$/, ''))
  .join('\n')
  .split(';')
  .map(s => s.trim())
  .filter(Boolean);

let created = 0;
for (const body of statements) {
  try {
    await db.execute(body);
    created++;
  } catch (e) {
    console.error('\nFailed on:\n' + body.slice(0, 200) + '\n\n' + e.message);
    process.exit(1);
  }
}

const tables = await all(
  "select name from sqlite_master where type='table' and name not like 'sqlite_%' order by name"
);
console.log('\nran ' + created + ' statements');
console.log('tables now (' + tables.length + '): ' + tables.map(t => t.name).join(', '));
