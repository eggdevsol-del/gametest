// Checks App Store signed data (StoreKit 2 transactions and App Store Server Notifications V2) without calling Apple:
// each is a JWS whose x5c chain must run from Apple's receipt-signing certificate, through Apple's intermediate, to
// Apple Root CA - G3 (server/certs/AppleRootCA-G3.cer, fingerprint below), and whose ES256 signature must match.
import { X509Certificate, verify as verifySig } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const APPLE_ROOT_G3 = new X509Certificate(readFileSync(path.join(here, 'certs', 'AppleRootCA-G3.cer')));
const ROOT_FINGERPRINT = '63:34:3A:BF:B8:9A:6A:03:EB:B5:7E:9B:3F:5F:A7:BE:7C:4F:5C:75:6F:30:17:B3:A8:C4:88:C3:65:3E:91:79';
// Apple's marker extensions: 1.2.840.113635.100.6.11.1 on the signing certificate, 1.2.840.113635.100.6.2.1 on the intermediate.
const LEAF_OID = Buffer.from('060a2a864886f76364060b01', 'hex'), MID_OID = Buffer.from('060a2a864886f76364060201', 'hex');

const b64 = s => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
const validAt = (c, t) => t >= new Date(c.validFrom).getTime() && t <= new Date(c.validTo).getTime();

// Returns the JWS payload, or throws. `root` is only for tests, which sign with their own chain.
export function verifyAppleJws(jws, { root = APPLE_ROOT_G3 } = {}) {
  const parts = String(jws || '').split('.');
  if (parts.length !== 3) throw new Error('not a JWS');
  const head = JSON.parse(b64(parts[0]).toString('utf8'));
  if (head.alg !== 'ES256' || !Array.isArray(head.x5c) || head.x5c.length < 3) throw new Error('unexpected JWS header');
  const [leaf, mid, top] = head.x5c.slice(0, 3).map(c => new X509Certificate(Buffer.from(c, 'base64')));
  if (top.fingerprint256 !== root.fingerprint256 || (root === APPLE_ROOT_G3 && root.fingerprint256 !== ROOT_FINGERPRINT)) throw new Error('not signed by Apple');
  if (!leaf.raw.includes(LEAF_OID) || !mid.raw.includes(MID_OID)) throw new Error('not an App Store signing certificate');
  if (!leaf.verify(mid.publicKey) || !mid.verify(root.publicKey) || !leaf.checkIssued(mid) || !mid.checkIssued(root)) throw new Error('broken certificate chain');
  const payload = JSON.parse(b64(parts[1]).toString('utf8'));
  // Certificates are checked at the time Apple signed the data, as Apple's own library does.
  const at = Number(payload.signedDate) || Date.now();
  if (![leaf, mid, root].every(c => validAt(c, at))) throw new Error('certificate not valid at the signing date');
  if (!verifySig('sha256', Buffer.from(parts[0] + '.' + parts[1]), { key: leaf.publicKey, dsaEncoding: 'ieee-p1363' }, b64(parts[2]))) throw new Error('bad signature');
  return payload;
}
