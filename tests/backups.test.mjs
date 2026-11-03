// Off-site backups: encryption, S3 request signing (checked against AWS's own published example), a real backup from
// a running server into a stand-in S3 bucket, and the restore drill on what arrived.
// node tests/backups.test.mjs (or npm test)
import { spawn, spawnSync } from 'node:child_process';
import http from 'node:http';
import { mkdtempSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomBytes, createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { encrypt, decrypt, keyFrom, signV4 } = await import(path.join(REPO, 'server/offsite.js'));

let passN = 0, failN = 0;
const ok = (c, msg, extra) => { if (c) passN++; else { failN++; console.log('FAIL:', msg, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ''); } };
const throws = f => { try { f(); return false; } catch (e) { return true; } };

// ---- Encryption
const KEY = randomBytes(32).toString('hex'), key = keyFrom(KEY), msg = Buffer.from('kids’ chores and pocket money');
const box = encrypt(msg, key);
ok(decrypt(box, key).equals(msg), 'encrypt then decrypt gives the backup back');
ok(!box.includes(msg), 'the encrypted copy doesn’t contain the data');
const bad = Buffer.from(box); bad[bad.length - 1] ^= 1;
ok(throws(() => decrypt(bad, key)), 'a changed byte is caught');
ok(throws(() => decrypt(box, keyFrom(randomBytes(32).toString('base64')))), 'the wrong key can’t read it');
ok(throws(() => keyFrom('too-short')), 'a short key is refused');

// ---- Signing matches AWS's published example (S3, GET /test.txt with a byte range)
const E = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const aws = signV4({ method: 'GET', path: '/test.txt', headers: { host: 'examplebucket.s3.amazonaws.com', range: 'bytes=0-9', 'x-amz-content-sha256': E, 'x-amz-date': '20130524T000000Z' }, payloadHash: E, accessKey: 'AKIAIOSFODNN7EXAMPLE', secret: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', region: 'us-east-1', amzDate: '20130524T000000Z' });
ok(aws.endsWith('Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41'), 'request signing matches AWS’s example', aws);

// ---- A stand-in S3 bucket that keeps what it's sent (and can be told to fail)
const got = []; let failNext = false;
const s3 = http.createServer((req, res) => { const parts = []; req.on('data', d => parts.push(d)); req.on('end', () => { if (failNext) { failNext = false; res.writeHead(503); return res.end('SlowDown'); } got.push({ method: req.method, url: req.url, headers: req.headers, body: Buffer.concat(parts) }); res.writeHead(200); res.end(); }); });
await new Promise(r => s3.listen(8785, r));

async function server(port, env) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'cc-bk-'));
  const srv = spawn('node', [path.join(REPO, 'server/index.js'), '--port', String(port), '--static', path.join(REPO, 'public')], { env: { ...process.env, PGLITE_DIR: dir, DATABASE_URL: '', ...env } });
  let log = ''; srv.stdout.on('data', d => { log += d; }); srv.stderr.on('data', d => { log += d; });
  for (let i = 0; i < 150 && !/Chorecast server on/.test(log); i++) await new Promise(r => setTimeout(r, 100));
  return { srv, log: () => log };
}
const call = async (port, method, url, body, headers = {}) => { const r = await fetch(`http://localhost:${port}${url}`, { method, headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, ...(await r.json().catch(() => ({}))) }; };
const ADMIN = { authorization: 'Bearer admin-test-token-456' };
const A = await server(8784, { ADMIN_TOKEN: 'admin-test-token-456', BACKUP_BUCKET: 'cc-backups', BACKUP_ENDPOINT: 'http://localhost:8785', BACKUP_ACCESS_KEY: 'test-key', BACKUP_SECRET_KEY: 'test-secret', BACKUP_KEY: KEY });
const B = await server(8783, { ADMIN_TOKEN: 'admin-test-token-456' });
try {
  // A family to back up
  let cookie = ''; const P = async (method, url, body) => { const r = await fetch('http://localhost:8784' + url, { method, headers: { ...(cookie ? { cookie } : {}), 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); for (const c of r.headers.getSetCookie()) { const m = c.match(/^cc_session=([^;]*)/); if (m) cookie = 'cc_session=' + m[1]; } return r.json().catch(() => ({})); };
  await P('POST', '/api/auth/signup', { email: 'backup@test.localhost', password: 'correct-horse-9', name: 'P', consent: true });
  await P('PUT', '/api/docs/kids/k1', { name: 'Ari', age: 9, jars: { spend: 120, save: 300, invest: 0, give: 10 }, ledger: [], island: { items: [] } });

  ok((await call(8784, 'POST', '/api/admin/backup')).status === 404, 'the backup trigger needs the admin token');
  ok((await call(8783, 'POST', '/api/admin/backup', null, ADMIN)).code === 'not_set_up', 'without a bucket, backups say they aren’t set up');
  const run = await call(8784, 'POST', '/api/admin/backup', null, ADMIN);
  ok(run.ok && /^chorecast\/backup-\d{4}-\d\d-\d\d\.jsonl\.gz\.enc$/.test(run.key) && run.rows > 0, 'an off-site backup runs', run);
  const put = got[got.length - 1];
  ok(put && put.method === 'PUT' && put.url === `/cc-backups/${run.key}`, 'it lands in the bucket under its date', put && put.url);
  const hash = createHash('sha256').update(put.body).digest('hex');
  ok(put.headers['x-amz-content-sha256'] === hash, 'the upload says what it contains');
  const expect = signV4({ method: 'PUT', path: put.url, headers: { host: put.headers.host, 'x-amz-content-sha256': hash, 'x-amz-date': put.headers['x-amz-date'] }, payloadHash: hash, accessKey: 'test-key', secret: 'test-secret', region: 'auto', amzDate: put.headers['x-amz-date'] });
  ok(put.headers.authorization === expect, 'the upload is signed for the bucket', put.headers.authorization);
  ok(!put.body.includes(Buffer.from('backup@test.localhost')), 'what leaves the server is encrypted');

  // The restore drill on what arrived
  const file = path.join(mkdtempSync(path.join(os.tmpdir(), 'cc-bkf-')), 'backup.jsonl.gz.enc'); writeFileSync(file, put.body);
  const drill = spawnSync(process.execPath, [path.join(REPO, 'scripts/restore-drill.mjs'), file], { encoding: 'utf8', env: { ...process.env, BACKUP_KEY: KEY } });
  ok(drill.status === 0 && /Restore drill passed: 1 family/.test(drill.stdout), 'the restore drill brings the family back intact', drill.stdout + drill.stderr);
  const noKey = spawnSync(process.execPath, [path.join(REPO, 'scripts/restore-drill.mjs'), file], { encoding: 'utf8', env: { ...process.env, BACKUP_KEY: randomBytes(32).toString('hex') } });
  ok(noKey.status !== 0, 'the drill fails with the wrong key');

  const st = await call(8784, 'GET', '/api/admin/backup', null, ADMIN);
  ok(st.setUp && st.last && st.last.ok && st.last.key === run.key, 'the last backup is reported', st);
  failNext = true;
  const failed = await call(8784, 'POST', '/api/admin/backup', null, ADMIN);
  ok(failed.status === 500, 'a bucket that refuses makes the backup fail loudly', failed);
  const st2 = await call(8784, 'GET', '/api/admin/backup', null, ADMIN);
  ok(st2.last && st2.last.ok === false && /503/.test(st2.last.error), 'and the failure is recorded', st2);
} finally { A.srv.kill(); B.srv.kill(); s3.close(); await new Promise(r => setTimeout(r, 400)); }
console.log(`${passN} passed, ${failN} failed`);
if (failN) console.log((A.log() + B.log()).split('\n').filter(l => /Error|error|fail/i.test(l)).slice(0, 10).join('\n'));
process.exit(failN ? 1 : 0);
