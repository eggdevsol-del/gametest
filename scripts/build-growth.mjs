// Builds Character Growth for the app:
//  - joins chorecast-growth/*.js (in name order) into public/chorecast/growth.js. The parts share one scope:
//    01-core.js opens it and 99-end.js closes it.
//  - splits each chorecast-growth/content/<tree>.txt at its "@band" lines into public/chorecast/growth/<tree>.<band>.txt,
//    copies moments.txt and cases.txt if they're there, and writes growth/index.json with a version and counts.
//  - splits each language course (a file with an "@lang xx" line) at its "@stage" lines into growth/<xx>.s<n>.txt, and
//    lists every line in the language, per stage, in growth/<xx>.lines.json: what a fluent speaker records for a
//    language with no device voice, and what the checker holds the recordings against.
//  - deletes old .txt packs it didn't write this time, so trees moved to content/parked stop shipping.
// With --preview it also builds the language courses in content/parked, for checking them in the app before they go
// live. index.json then says "preview", and the checker (npm run build) fails until it's built again without it.
import { readdir, readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'chorecast-growth'), out = path.join(root, 'public', 'chorecast');
const parts = (await readdir(src)).filter(f => f.endsWith('.js')).sort();
const body = (await Promise.all(parts.map(f => readFile(path.join(src, f), 'utf8')))).join('\n');
await writeFile(path.join(out, 'growth.js'), body);

await mkdir(path.join(out, 'growth'), { recursive: true });
const preview = process.argv.includes('--preview');
const counts = {}, hash = createHash('sha256'), wrote = new Set();
// A line of a language as it's recorded and looked up: no «» marks, one space between words, the same Unicode form
const lineKey = s => String(s).replace(/[«»]/g, '').normalize('NFC').replace(/\s+/g, ' ').trim();
const langLines = text => {
  const out = new Set(), add = s => { const k = lineKey(s); if (k) out.add(k); };
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim(), i = t.indexOf(':'), key = t.slice(0, i).split('@')[0], f = t.slice(i + 1).split('|').map(x => x.trim());
    if (key === 'word' || key === 'say') add(f[0]); else if (key === 'line') add(f[1] || ''); else if (key === 'chant') f[0].split(';').forEach(add);
    for (const m of t.matchAll(/«([^»]+)»/g)) add(m[1]);
  }
  return [...out];
};
const parked = path.join(src, 'content', 'parked');
const sources = (await readdir(path.join(src, 'content'))).filter(f => f.endsWith('.txt')).sort().map(f => path.join(src, 'content', f));
if (preview) for (const f of (await readdir(parked)).filter(f => f.endsWith('.txt')).sort()) { if (/^@lang\s/m.test(await readFile(path.join(parked, f), 'utf8'))) sources.push(path.join(parked, f)); }
for (const file of sources) {
  const f = path.basename(file), text = await readFile(file, 'utf8'); hash.update(text);
  if (f === 'moments.txt' || f === 'cases.txt') { await writeFile(path.join(out, 'growth', f), text); wrote.add(f); counts[f] = (text.match(f === 'moments.txt' ? /^@m /gm : /^@case/gm) || []).length; continue; }
  const lm = text.match(/^@lang\s+(\w+)/m);
  if (lm) {
    const lang = lm[1], head = [], stages = []; let cur = null;
    for (const line of text.split(/\r?\n/)) { const m = line.match(/^@stage\s+(\d+)/); if (m) { cur = { n: +m[1], buf: [] }; stages.push(cur); } else if (cur) cur.buf.push(line); else if (/^@(lang|pairs)\b/.test(line)) head.push(line); }
    const lines = {};
    for (const s of stages) {
      const name = `${lang}.s${s.n}.txt`, t = [`# ${lang} · stage ${s.n}`, ...head, ...s.buf].join('\n') + '\n';
      await writeFile(path.join(out, 'growth', name), t); wrote.add(name); lines[`s${s.n}`] = langLines(s.buf.join('\n'));
      counts[`${lang}.s${s.n}`] = { lang, stage: s.n, units: (t.match(/^@unit/gm) || []).length, lessons: (t.match(/^@lesson/gm) || []).length, stories: (t.match(/^@story/gm) || []).length, lines: lines[`s${s.n}`].length };
    }
    await writeFile(path.join(out, 'growth', `${lang}.lines.json`), JSON.stringify(lines) + '\n'); wrote.add(`${lang}.lines.json`);
    continue;
  }
  const tree = f.replace(/\.txt$/, ''); let band = null, buf = [];
  const flush = async () => { if (!band) return; const t = buf.join('\n') + '\n'; await writeFile(path.join(out, 'growth', `${tree}.${band}.txt`), t); wrote.add(`${tree}.${band}.txt`); counts[`${tree}.${band}`] = { units: (t.match(/^@unit/gm) || []).length, lessons: (t.match(/^@lesson/gm) || []).length }; };
  for (const line of text.split(/\r?\n/)) { const m = line.match(/^@band\s+(\w+)/); if (m) { await flush(); band = m[1]; buf = [`# ${tree} · ${band}`]; } else buf.push(line); }
  await flush();
}
for (const f of (await readdir(path.join(out, 'growth'))).filter(f => (f.endsWith('.txt') || f.endsWith('.lines.json')) && !wrote.has(f))) await unlink(path.join(out, 'growth', f));
const version = hash.digest('hex').slice(0, 10);
await writeFile(path.join(out, 'growth', 'index.json'), JSON.stringify({ version, built: new Date().toISOString(), ...(preview ? { preview: true } : {}), counts }, null, 2) + '\n');
if (preview) console.log('PREVIEW build: parked language courses are included. Build again without --preview before committing.');
const lessons = Object.values(counts).reduce((a, c) => a + (c.lessons || 0), 0);
console.log(`growth.js ${(body.length / 1024).toFixed(0)} KB from ${parts.length} parts; content ${version}: ${lessons} lessons, ${counts['moments.txt'] || 0} moments, ${counts['cases.txt'] || 0} cases`);
