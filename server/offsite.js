// Off-site backups. Once a day the whole database (scripts/backup.mjs's gzipped JSON lines) is encrypted with
// AES-256-GCM and put in an S3-compatible bucket: AWS S3, Cloudflare R2 or Backblaze B2. Nothing happens unless
// BACKUP_BUCKET is set. Keep BACKUP_KEY somewhere safe and separate (a password manager): without it no backup can
// be read, which is the point, since they hold kids' data. Old backups are removed by the bucket's own lifecycle rule.
//   BACKUP_BUCKET       the bucket name
//   BACKUP_ENDPOINT     e.g. https://<account id>.r2.cloudflarestorage.com (default: AWS S3 in BACKUP_REGION)
//   BACKUP_REGION       default 'auto' (R2); for AWS, the bucket's region such as ap-southeast-2
//   BACKUP_ACCESS_KEY / BACKUP_SECRET_KEY   a key that can only write to that bucket
//   BACKUP_KEY          32 random bytes, as 64 hex characters or base64 (openssl rand -base64 32)
//   BACKUP_PREFIX       default 'chorecast/'
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { backup } from '../scripts/backup.mjs';

const MAGIC = Buffer.from('CCB1');
export function keyFrom(s) {
  const k = /^[0-9a-f]{64}$/i.test(String(s || '')) ? Buffer.from(s, 'hex') : Buffer.from(String(s || ''), 'base64');
  if (k.length !== 32) throw new Error('BACKUP_KEY must be 32 bytes, as 64 hex characters or base64.');
  return k;
}
// CCB1, a 12-byte IV, the 16-byte GCM tag, then the ciphertext. Any change to the file makes decrypting fail.
export function encrypt(buf, key) {
  const iv = randomBytes(12), c = createCipheriv('aes-256-gcm', key, iv), body = Buffer.concat([c.update(buf), c.final()]);
  return Buffer.concat([MAGIC, iv, c.getAuthTag(), body]);
}
export function decrypt(buf, key) {
  if (!buf.subarray(0, 4).equals(MAGIC)) throw new Error('That isn’t an encrypted Chorecast backup.');
  const d = createDecipheriv('aes-256-gcm', key, buf.subarray(4, 16)); d.setAuthTag(buf.subarray(16, 32));
  return Buffer.concat([d.update(buf.subarray(32)), d.final()]);
}
export const isEncrypted = buf => buf.length > 32 && buf.subarray(0, 4).equals(MAGIC);

export function offsiteConfig(env = process.env) {
  if (!env.BACKUP_BUCKET) return null;
  const region = env.BACKUP_REGION || 'auto';
  return {
    bucket: env.BACKUP_BUCKET, region, prefix: env.BACKUP_PREFIX ?? 'chorecast/',
    endpoint: (env.BACKUP_ENDPOINT || `https://s3.${region === 'auto' ? 'us-east-1' : region}.amazonaws.com`).replace(/\/+$/, ''),
    accessKey: env.BACKUP_ACCESS_KEY, secret: env.BACKUP_SECRET_KEY, key: keyFrom(env.BACKUP_KEY),
  };
}

// AWS Signature Version 4, as S3 and its look-alikes expect. headers must include host; returns the Authorization
// header for the request.
const sha256 = b => createHash('sha256').update(b).digest('hex'), hmac = (k, s) => createHmac('sha256', k).update(s).digest();
const uriEncode = s => encodeURIComponent(s).replace(/[!'()*]/g, ch => '%' + ch.charCodeAt(0).toString(16).toUpperCase());
export function signV4({ method, path: p, query = '', headers, payloadHash, accessKey, secret, region, service = 's3', amzDate }) {
  const day = amzDate.slice(0, 8), names = Object.keys(headers).map(h => h.toLowerCase()).sort(), lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), String(v).trim()]));
  const canonical = [method, p.split('/').map(uriEncode).join('/'), query, names.map(n => `${n}:${lower[n]}`).join('\n') + '\n', names.join(';'), payloadHash].join('\n');
  const scope = `${day}/${region}/${service}/aws4_request`, toSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonical)].join('\n');
  const kSign = hmac(hmac(hmac(hmac('AWS4' + secret, day), region), service), 'aws4_request');
  return `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${names.join(';')}, Signature=${createHmac('sha256', kSign).update(toSign).digest('hex')}`;
}
export async function putObject(cfg, key, body, now = new Date()) {
  const url = new URL(`${cfg.endpoint}/${cfg.bucket}/${key}`), amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const payloadHash = sha256(body), headers = { host: url.host, 'x-amz-content-sha256': payloadHash, 'x-amz-date': amzDate };
  const authorization = signV4({ method: 'PUT', path: url.pathname, headers, payloadHash, accessKey: cfg.accessKey, secret: cfg.secret, region: cfg.region, amzDate });
  const r = await fetch(url, { method: 'PUT', headers: { ...headers, authorization, 'content-type': 'application/octet-stream' }, body });
  if (!r.ok) throw new Error(`The backup bucket said ${r.status}: ${(await r.text()).slice(0, 200)}`);
}

// One backup: written to a temporary file, encrypted, uploaded as <prefix>backup-<date>.jsonl.gz.enc.
export async function runOffsiteBackup(db, cfg, now = new Date()) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'cc-backup-')), file = path.join(dir, 'backup.jsonl.gz');
  try {
    const counts = await backup(db, file), body = encrypt(readFileSync(file), cfg.key);
    const key = `${cfg.prefix}backup-${now.toISOString().slice(0, 10)}.jsonl.gz.enc`;
    await putObject(cfg, key, body, now);
    return { key, bytes: body.length, rows: Object.values(counts).reduce((a, b) => a + b, 0), tables: Object.keys(counts).length };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
