// Each kid's Cosy Studio (the homes game's save) syncs with their account: migration 023 makes home_saves, a device
// writes the kid's save as the `homes` collection, and the family's sync sends it to every device.
// node tests/home-saves.test.mjs (or npm test)
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let passN = 0, failN = 0;
const ok = (c, msg, extra) => { if (c) passN++; else { failN++; console.log('FAIL:', msg, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ''); } };
const PORT = 8803, BASE = 'http://localhost:' + PORT, dir = mkdtempSync(path.join(os.tmpdir(), 'cc-homes-'));
const srv = spawn('node', [path.join(REPO, 'server/index.js'), '--port', String(PORT), '--static', path.join(REPO, 'public')], { env: { ...process.env, PGLITE_DIR: dir, DATABASE_URL: '' } });
let log = ''; srv.stdout.on('data', d => { log += d; }); srv.stderr.on('data', d => { log += d; });
for (let i = 0; i < 150 && !/Chorecast server on/.test(log); i++) await new Promise(r => setTimeout(r, 100));
ok(/Chorecast server on/.test(log), 'server starts', log);
ok(/migration applied: 023_home_saves\.sql/.test(log), 'migration 023 makes home_saves', log.slice(-600));

let cookie = '';
const C = async (method, url, body) => {
  const r = await fetch(BASE + url, { method, headers: { ...(cookie ? { cookie } : {}), ...(body !== undefined ? { 'content-type': 'application/json' } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined });
  for (const c of r.headers.getSetCookie()) { const m = c.match(/^cc_session=([^;]*)/); if (m) cookie = m[1] ? 'cc_session=' + m[1] : ''; }
  return { status: r.status, ...(await r.json().catch(() => ({}))) };
};
try {
  ok((await C('POST', '/api/auth/signup', { email: 'homes@test.localhost', password: 'correct-horse-9', name: 'Homes', consent: true })).status === 200, 'a grown-up signs up');
  const kid = { name: 'Ari', age: 8, avatar: '🦊', hue: '#4DABF7', order: 0, createdAt: Date.now(), jars: { spend: 0, save: 0, invest: 0, give: 0 }, island: { items: [], xpSpent: 0 } };
  const w = await C('PUT', '/api/docs/kids/k1', kid); ok(w.status === 200, 'a kid is added', w);
  const save = { v: 1, cur: 'studio', spent: 450, savedAt: Date.now(), homes: { studio: { items: [{ id: 'a1', t: 'bed', x: 1, z: 1, r: 0 }], ext: { rooms: [{ x: 12, z: 1, w: 3, d: 4, name: 'Room 1', doorAt: 2 }], dx: 0, dz: 0 } } } };
  const h = await C('PUT', '/api/docs/homes/k1', save); ok(h.status === 200, 'the kid’s studio saves', h);
  const s1 = await C('GET', '/api/sync');
  ok(s1.homes && s1.homes.k1 && s1.homes.k1.spent === 450, 'the family’s sync carries it', s1.homes);
  ok(s1.homes.k1.homes.studio.ext.rooms[0].doorAt === 2, 'a built-on room and its doorway come back as saved', s1.homes.k1.homes.studio.ext);
  const later = { ...save, spent: 600, savedAt: Date.now() + 1000 };
  ok((await C('PUT', '/api/docs/homes/k1', later)).status === 200, 'a newer save replaces it');
  ok((await C('GET', '/api/sync')).homes.k1.spent === 600, 'and the sync has the newer one');
} catch (e) { failN++; console.log('FAIL: threw', e); }
srv.kill();
console.log(`${passN} passed, ${failN} failed`);
process.exit(failN ? 1 : 0);
