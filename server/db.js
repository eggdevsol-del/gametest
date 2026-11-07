// Database access. On Railway, DATABASE_URL points at the attached Postgres. Without it (local development),
// an embedded Postgres (PGlite) keeps data in .data/pglite, so the same SQL and migrations run everywhere.
import { readdir, readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export async function openDb() {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { default: pg } = await import('pg');
    const pool = new pg.Pool({ connectionString: url, max: 10 });
    pool.on('error', e => console.error('postgres pool error', e));
    return {
      kind: 'postgres',
      query: (text, params) => pool.query(text, params),
      exec: text => pool.query(text),
      async tx(fn) {
        const c = await pool.connect();
        try {
          await c.query('begin');
          const out = await fn({ q: (t, p) => c.query(t, p), exec: t => c.query(t) });
          await c.query('commit');
          return out;
        } catch (e) { await c.query('rollback').catch(() => {}); throw e; } finally { c.release(); }
      },
      close: () => pool.end(),
    };
  }
  if (process.env.RAILWAY_ENVIRONMENT) console.warn('DATABASE_URL is not set: using the embedded database, which is wiped on every deploy. Add Postgres to the Railway project and set DATABASE_URL=${{Postgres.DATABASE_URL}} on this service.');
  const { PGlite } = await import('@electric-sql/pglite');
  const dir = process.env.PGLITE_DIR || path.join(here, '..', '.data', 'pglite');
  await mkdir(path.dirname(dir), { recursive: true });
  const db = new PGlite(dir);
  await db.waitReady;
  return {
    kind: 'pglite',
    query: (text, params) => db.query(text, params),
    exec: text => db.exec(text),
    tx: fn => db.transaction(t => fn({ q: (x, p) => t.query(x, p), exec: x => t.exec(x) })),
    close: () => db.close(),
  };
}

// Applies every migrations/NNN_name.sql not yet recorded in schema_migrations, in order, each in its own
// transaction. New features add a new numbered file; applied files are never edited.
export async function migrate(db) {
  await db.exec(`create table if not exists schema_migrations (version integer primary key, name text not null, applied_at timestamptz not null default now())`);
  if (db.kind === 'postgres') await db.query('select pg_advisory_lock(7310421)');
  try {
    const done = new Set((await db.query('select version from schema_migrations')).rows.map(r => Number(r.version)));
    const files = (await readdir(path.join(here, 'migrations'))).filter(f => /^\d+_[\w-]+\.sql$/.test(f)).sort();
    for (const f of files) {
      const version = parseInt(f, 10);
      if (done.has(version)) continue;
      const sql = await readFile(path.join(here, 'migrations', f), 'utf8');
      await db.tx(async t => {
        await t.exec(sql);
        await t.q('insert into schema_migrations (version, name) values ($1, $2)', [version, f]);
      });
      console.log(`migration applied: ${f}`);
    }
  } finally {
    if (db.kind === 'postgres') await db.query('select pg_advisory_unlock(7310421)');
  }
}
