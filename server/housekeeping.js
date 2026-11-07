// Daily clean-up, so nothing about a family is kept longer than the privacy policy says:
// - kids' job photos, a family-chosen number of days after a grown-up reviewed the job (60 unless changed);
// - photos no job or chore guide uses any more (a deleted job, a retake), a week after they were taken;
// - the event log after a year, lesson answers after two, the change log after 90 days;
// - sessions that have expired, and invite codes a month after they expired.
// A row in `housekeeping` records each day's run, so with several servers only one does it.

export const PHOTO_DAYS = [30, 60, 90, 180, 365];
export const DEFAULT_PHOTO_DAYS = 60;
export const KEEP_DAYS = { events: 365, growth_answers: 730, lang_reviews: 730, doc_changes: 90 };
const ORPHAN_DAYS = 7, DAY = 86400000;

export const photoDaysOf = settings => (PHOTO_DAYS.includes(settings && settings.photoDays) ? settings.photoDays : DEFAULT_PHOTO_DAYS);
const asObj = v => (typeof v === 'string' ? JSON.parse(v) : v) || {};
const serverRefs = list => list.filter(r => typeof r === 'string' && r.startsWith('s:')).map(r => r.slice(2));
const jobPhotoIds = d => serverRefs([d.photo, ...(Array.isArray(d.stepPhotos) ? d.stepPhotos : [])]);
const guidePhotoIds = d => serverRefs([...((d && d.steps) || []).map(x => x && x.photo), d && d.finish]);

// Removes one family's expired and unused photos. `clearJob(familyId, jobId)` takes the photo refs off a job and
// tells the family's devices. Returns how many photos went.
export async function cleanFamilyPhotos(db, familyId, clearJob, now = Date.now()) {
  const set = (await db.query('select data from family_settings where family_id = $1', [familyId])).rows[0];
  const days = photoDaysOf(set ? asObj(set.data) : {});
  const jobs = (await db.query('select id, data from jobs where family_id = $1', [familyId])).rows.map(r => ({ id: r.id, d: asObj(r.data) }));
  const expired = [], used = [];
  for (const { id, d } of jobs) {
    const ids = jobPhotoIds(d); if (!ids.length) continue;
    const reviewed = Number(d.reviewedAt);
    if (d.status !== 'pending' && reviewed && now - reviewed > days * DAY) { expired.push(...ids); await clearJob(familyId, id); } else used.push(...ids);
  }
  const guides = (await db.query('select data from chore_guides where family_id = $1', [familyId])).rows.flatMap(r => guidePhotoIds(asObj(r.data)));
  let gone = 0;
  if (expired.length) gone += (await db.query(`delete from photos where family_id = $1 and kind <> 'guide' and id = any($2) returning id`, [familyId, expired])).rows.length;
  const cutoff = new Date(now - ORPHAN_DAYS * DAY);
  gone += (await db.query(`delete from photos where family_id = $1 and kind <> 'guide' and created_at < $2 and not (id = any($3)) returning id`, [familyId, cutoff, used])).rows.length;
  gone += (await db.query(`delete from photos where family_id = $1 and kind = 'guide' and created_at < $2 and not (id = any($3)) returning id`, [familyId, cutoff, guides])).rows.length;
  return gone;
}

// One day's run. Returns what it did, or null when another server (or an earlier start) already ran today.
export async function runHousekeeping(db, clearJob, { force = false } = {}) {
  const claim = await db.query(`insert into housekeeping (job, last_run) values ('daily', now())
    on conflict (job) do update set last_run = now() where $1 or housekeeping.last_run < now() - interval '23 hours' returning job`, [force]);
  if (!claim.rows.length) return null;
  const out = { photos: 0 };
  for (const { family_id } of (await db.query('select distinct family_id from photos')).rows) out.photos += await cleanFamilyPhotos(db, family_id, clearJob);
  const del = async (sql, ...p) => (await db.query(sql + ' returning 1', p)).rows.length;
  out.events = await del(`delete from events where created_at < now() - $1 * interval '1 day'`, KEEP_DAYS.events);
  out.answers = await del(`delete from growth_answers where created_at < now() - $1 * interval '1 day'`, KEEP_DAYS.growth_answers);
  out.langReviews = await del(`delete from lang_reviews where created_at < now() - $1 * interval '1 day'`, KEEP_DAYS.lang_reviews);
  out.changes = await del(`delete from doc_changes where created_at < now() - $1 * interval '1 day'`, KEEP_DAYS.doc_changes);
  out.sessions = await del('delete from sessions where expires_at < now()');
  out.invites = await del(`delete from invites where expires_at < now() - interval '30 days'`);
  await db.query(`update housekeeping set detail = $1::jsonb where job = 'daily'`, [JSON.stringify(out)]);
  return out;
}
