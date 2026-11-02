// Account emails (address checks and password resets) through Postmark when POSTMARK_TOKEN is set. Without it the
// email is written to the server log instead, which is enough for local development; MAIL_LOG_DIR also saves each one
// as a JSON file (the tests read the links from there).
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const TOKEN = process.env.POSTMARK_TOKEN || '', FROM = process.env.MAIL_FROM || 'Chorecast <hello@chorecast.app>';
export const mailReady = !!TOKEN;

export async function sendMail({ to, subject, text, tag }) {
  if (process.env.MAIL_LOG_DIR) await writeFile(path.join(process.env.MAIL_LOG_DIR, `${Date.now()}-${tag}.json`), JSON.stringify({ to, subject, text, tag }));
  if (!TOKEN) { console.log(`email (no POSTMARK_TOKEN, not sent) to ${to}: ${subject}`); return false; }
  const r = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json', 'x-postmark-server-token': TOKEN },
    body: JSON.stringify({ From: FROM, To: to, Subject: subject, TextBody: text, Tag: tag, MessageStream: 'outbound', TrackOpens: false, TrackLinks: 'None' }),
  });
  if (!r.ok) { console.error('email failed', r.status, (await r.text()).slice(0, 200)); return false; }
  return true;
}
