// A restore drill: proves a backup can actually be brought back. Restores it (plain, or an encrypted off-site copy
// with BACKUP_KEY set) into a throwaway embedded database and checks every table got exactly the rows the backup holds.
// Touches nothing else. Do one every month or so on a backup downloaded from the bucket.
//   node scripts/restore-drill.mjs <backup file>
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { restore, backupLines } from './restore.mjs';

const file = process.argv[2]; if (!file) { console.log('usage: node scripts/restore-drill.mjs <backup file>'); process.exit(2); }
const dir = mkdtempSync(path.join(os.tmpdir(), 'cc-drill-')), pg = new PGlite(path.join(dir, 'db')); await pg.waitReady;
const db = { kind: 'pglite', query: (t, p) => pg.query(t, p), exec: t => pg.exec(t), tx: fn => pg.transaction(t => fn({ q: (x, p) => t.query(x, p), exec: x => t.exec(x) })), close: () => pg.close() };
let ok = true;
try {
  // What the backup holds, table by table.
  const want = {}; let table = null, head = null;
  for await (const line of backupLines(file)) { if (!line) continue; const x = JSON.parse(line); if (!head) { head = x; continue; } if (x.table) { table = x.table; want[table] = 0; } else if (table) want[table]++; }
  const t0 = Date.now(); await restore(db, file);
  console.log(`Backup from ${head.at} (migration ${head.migration}), restored in ${((Date.now() - t0) / 1000).toFixed(1)}s:`);
  for (const [t, n] of Object.entries(want)) {
    if (t === 'schema_migrations') continue;
    const got = (await db.query(`select count(*)::int as n from ${t}`)).rows[0].n, same = got === n; if (!same) ok = false;
    console.log(`  ${same ? '✓' : '✗'} ${t.padEnd(24)} ${got} of ${n}`);
  }
  const fam = (await db.query('select count(*)::int as n from families')).rows[0].n;
  console.log(ok ? `\nRestore drill passed: ${fam} famil${fam === 1 ? 'y' : 'ies'} came back intact.` : '\nRestore drill FAILED: some tables did not come back in full.');
} catch (e) { ok = false; console.log('Restore drill FAILED:', e.message); }
finally { await db.close(); rmSync(dir, { recursive: true, force: true }); }
process.exit(ok ? 0 : 1);
