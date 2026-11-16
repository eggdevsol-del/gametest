// Error tracking without a third party: errors are grouped in app_errors by a fingerprint of where and what, with a
// count. ERROR_WEBHOOK (a Slack or Discord incoming webhook) hears about each new kind of error, and again if it comes
// back after a day. Read them with GET /api/admin/errors and the ADMIN_TOKEN.
import { createHash } from 'node:crypto';

const WEBHOOK = process.env.ERROR_WEBHOOK || '';
const clip = (v, n) => String(v == null ? '' : v).slice(0, n);
// Ids, numbers and quoted values vary between occurrences of the same bug, so they don't count towards the fingerprint.
const shape = s => clip(s, 300).replace(/[0-9a-f]{8}-[0-9a-f-]{27}/gi, ':id').replace(/\d+/g, '0').replace(/(["'`]).*?\1/g, '$1…$1');

export function makeErrors(db) {
  async function record(source, place, err, familyId = null) {
    const message = clip(err && err.message ? err.message : err, 500), stack = clip(err && err.stack, 2000);
    const fp = createHash('sha256').update([source, shape(place), shape(message)].join('|')).digest('hex').slice(0, 32);
    try {
      const r = await db.query(`insert into app_errors (fingerprint, source, place, message, stack, family_id) values ($1, $2, $3, $4, $5, $6)
        on conflict (fingerprint) do update set count = app_errors.count + 1, last_at = now(), stack = coalesce(excluded.stack, app_errors.stack)
        returning count, alerted_at`, [fp, source, clip(place, 200), message, stack || null, familyId]);
      const row = r.rows[0];
      if (WEBHOOK && (!row.alerted_at || Date.now() - new Date(row.alerted_at).getTime() > 864e5)) {
        await db.query('update app_errors set alerted_at = now() where fingerprint = $1', [fp]);
        fetch(WEBHOOK, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: `Chorecast ${source} error (${row.count}×) at ${clip(place, 120)}: ${clip(message, 300)}`, content: `Chorecast ${source} error (${row.count}×) at ${clip(place, 120)}: ${clip(message, 300)}` }) }).catch(() => {});
      }
    } catch (e) { console.error('could not record error', e.message); }
  }
  const recent = async (limit = 50) => (await db.query('select fingerprint, source, place, message, stack, first_at, last_at, count from app_errors order by last_at desc limit $1', [limit])).rows;
  return { record, recent };
}
