// Restores a backup from scripts/backup.mjs into an empty database (DATABASE_URL, or the local embedded one).
//   node scripts/restore.mjs <file>
// An encrypted off-site backup (server/offsite.js, .enc) is decrypted with BACKUP_KEY first.
// Runs the migrations first, loads each table in the backup's order (parents first), then moves id counters past the
// restored rows. It refuses a database that already has families in it.
import { createReadStream, readFileSync } from 'node:fs';
import { Readable } from 'node:stream';
import readline from 'node:readline';
import zlib from 'node:zlib';
import { pathToFileURL } from 'node:url';
import { openDb, migrate } from '../server/db.js';
import { isEncrypted, decrypt, keyFrom } from '../server/offsite.js';

// The backup's lines, from a plain .jsonl.gz or an encrypted off-site copy.
export function backupLines(file, key = process.env.BACKUP_KEY) {
  const head = readFileSync(file, { flag: 'r' }).subarray(0, 40);
  const gz = isEncrypted(head) ? Readable.from([decrypt(readFileSync(file), keyFrom(key))]) : createReadStream(file);
  return readline.createInterface({ input: gz.pipe(zlib.createGunzip()), crlfDelay: Infinity });
}

const dec = v => (v && typeof v === 'object' && !Array.isArray(v) && '$b64' in v ? Buffer.from(v.$b64, 'base64') : v);

export async function restore(db, file) {
  await migrate(db);
  if ((await db.query('select count(*)::int as n from families')).rows[0].n) throw new Error('This database already has families in it. Restore into an empty one.');
  const lines = backupLines(file);
  let head = null, cols = null, table = null, batch = [];
  const counts = {}, have = new Set((await db.query(`select table_name from information_schema.tables where table_schema = 'public'`)).rows.map(r => r.table_name));
  const flush = async () => {
    if (!batch.length) return;
    const names = cols.map(c => `"${c.column_name}"`), cast = cols.map(c => (c.data_type === 'jsonb' ? '::jsonb' : c.data_type === 'json' ? '::json' : ''));
    const ph = batch.map((_, i) => `(${cols.map((_, j) => `$${i * cols.length + j + 1}${cast[j]}`).join(', ')})`).join(', ');
    const vals = batch.flatMap(r => r.map((v, j) => (cast[j] && v != null ? JSON.stringify(v) : dec(v))));
    await db.query(`insert into ${table} (${names.join(', ')}) values ${ph}`, vals);
    counts[table] = (counts[table] || 0) + batch.length; batch = [];
  };
  for await (const line of lines) {
    if (!line) continue;
    const x = JSON.parse(line);
    if (!head) {
      if (!x.chorecast_backup) throw new Error('That isn’t a Chorecast backup.');
      head = x;
      const v = Number((await db.query('select max(version) as v from schema_migrations')).rows[0].v);
      if (v < head.migration) throw new Error(`The backup is from a newer version (migration ${head.migration}); this code has ${v}.`);
      continue;
    }
    if (x.table) {
      await flush();
      table = x.table === 'schema_migrations' || !have.has(x.table) ? null : x.table; cols = x.columns;
      continue;
    }
    if (!table) continue;
    batch.push(x.r);
    if (batch.length >= 200) await flush();
  }
  await flush();
  // Serial ids (events, the change log) carry on after the restored rows.
  for (const t of Object.keys(counts)) {
    for (const c of (await db.query(`select column_name from information_schema.columns where table_schema = 'public' and table_name = $1 and column_default like 'nextval%'`, [t])).rows) {
      await db.query(`select setval(pg_get_serial_sequence($1, $2), greatest(1, (select coalesce(max("${c.column_name}"), 0) from ${t})))`, [t, c.column_name]);
    }
  }
  return counts;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const file = process.argv[2]; if (!file) { console.error('usage: node scripts/restore.mjs <backup file>'); process.exit(1); }
  const db = await openDb();
  try {
    const counts = await restore(db, file);
    console.log(`restored ${Object.values(counts).reduce((a, b) => a + b, 0)} rows into ${Object.keys(counts).length} tables`);
  } catch (e) { console.error(e.message); process.exitCode = 1; } finally { await db.close(); }
}
