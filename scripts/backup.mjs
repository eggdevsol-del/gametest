// Backs up the whole Chorecast database to one gzipped file of JSON lines, tables parents-first so a restore can load
// it in order. Uses DATABASE_URL (Railway Postgres) or the local embedded database, like the server.
//   node scripts/backup.mjs [file]        (default: chorecast-backup-<date>.jsonl.gz)
// Restore with scripts/restore.mjs into an empty database. Kids' data is in it, so keep the file somewhere private.
import { createWriteStream } from 'node:fs';
import zlib from 'node:zlib';
import { pathToFileURL } from 'node:url';
import { openDb } from '../server/db.js';

export async function tableOrder(db) {
  const tables = (await db.query(`select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name`)).rows.map(r => r.table_name);
  const fks = (await db.query(`select conrelid::regclass::text as child, confrelid::regclass::text as parent from pg_constraint where contype = 'f'`)).rows;
  const order = [], seen = new Set();
  const visit = t => { if (seen.has(t)) return; seen.add(t); for (const f of fks) if (f.child === t && f.parent !== t) visit(f.parent); order.push(t); };
  tables.forEach(visit);
  return order.filter(t => tables.includes(t));
}
export async function columnsOf(db, table) {
  return (await db.query(`select column_name, data_type from information_schema.columns where table_schema = 'public' and table_name = $1 order by ordinal_position`, [table])).rows;
}
const enc = v => (v instanceof Uint8Array ? { $b64: Buffer.from(v).toString('base64') } : v instanceof Date ? v.toISOString() : typeof v === 'bigint' ? String(v) : v);

export async function backup(db, file) {
  const gz = zlib.createGzip(), out = createWriteStream(file); gz.pipe(out);
  const write = obj => new Promise(res => { if (gz.write(JSON.stringify(obj) + '\n')) res(); else gz.once('drain', res); });
  const order = await tableOrder(db), counts = {};
  const version = (await db.query('select max(version) as v from schema_migrations')).rows[0].v;
  await write({ chorecast_backup: 1, at: new Date().toISOString(), migration: Number(version), tables: order });
  for (const t of order) {
    const cols = await columnsOf(db, t), names = cols.map(c => c.column_name);
    await write({ table: t, columns: cols });
    counts[t] = 0;
    for (let off = 0; ; off += 500) {
      const rows = (await db.query(`select ${names.map(n => `"${n}"`).join(', ')} from ${t} order by 1 limit 500 offset ${off}`)).rows;
      for (const r of rows) await write({ t, r: names.map(n => enc(r[n])) });
      counts[t] += rows.length;
      if (rows.length < 500) break;
    }
  }
  await new Promise(res => { out.on('finish', res); gz.end(); });
  return counts;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const file = process.argv[2] || `chorecast-backup-${new Date().toISOString().slice(0, 10)}.jsonl.gz`;
  const db = await openDb();
  const counts = await backup(db, file);
  await db.close();
  console.log(`backed up ${Object.values(counts).reduce((a, b) => a + b, 0)} rows from ${Object.keys(counts).length} tables to ${file}`);
}
