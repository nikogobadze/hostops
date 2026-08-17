/* Confirms the database is reachable and reports what is in it. */

import { db, all } from '../lib/db.js';

const v = await db.execute('select sqlite_version() as v');
console.log('connected ✓   sqlite ' + v.rows[0].v);
console.log('database      ' + process.env.TURSO_DATABASE_URL);

const tables = await all(
  "select name from sqlite_master where type='table' and name not like 'sqlite_%' order by name"
);

if (!tables.length) {
  console.log('tables        (none — run `npm run db:migrate`)');
} else {
  console.log('tables        ' + tables.length);
  for (const t of tables) {
    const c = await all(`select count(*) as n from "${t.name}"`);
    console.log('  ' + t.name.padEnd(24) + String(c[0].n).padStart(7) + ' rows');
  }
}
