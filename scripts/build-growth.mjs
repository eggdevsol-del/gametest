// Builds Character Growth for the app:
//  - joins chorecast-growth/*.js (in name order) into public/chorecast/growth.js. The parts share one scope:
//    01-core.js opens it and 99-end.js closes it.
//  - splits each chorecast-growth/content/<tree>.txt at its "@band" lines into public/chorecast/growth/<tree>.<band>.txt,
//    copies moments.txt and cases.txt if they're there, and writes growth/index.json with a version and counts.
//  - deletes old .txt packs it didn't write this time, so trees moved to content/parked stop shipping.
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
const counts = {}, hash = createHash('sha256'), wrote = new Set();
for (const f of (await readdir(path.join(src, 'content'))).filter(f => f.endsWith('.txt')).sort()) {
  const text = await readFile(path.join(src, 'content', f), 'utf8'); hash.update(text);
  if (f === 'moments.txt' || f === 'cases.txt') { await writeFile(path.join(out, 'growth', f), text); wrote.add(f); counts[f] = (text.match(f === 'moments.txt' ? /^@m /gm : /^@case/gm) || []).length; continue; }
  const tree = f.replace(/\.txt$/, ''); let band = null, buf = [];
  const flush = async () => { if (!band) return; const t = buf.join('\n') + '\n'; await writeFile(path.join(out, 'growth', `${tree}.${band}.txt`), t); wrote.add(`${tree}.${band}.txt`); counts[`${tree}.${band}`] = { units: (t.match(/^@unit/gm) || []).length, lessons: (t.match(/^@lesson/gm) || []).length }; };
  for (const line of text.split(/\r?\n/)) { const m = line.match(/^@band\s+(\w+)/); if (m) { await flush(); band = m[1]; buf = [`# ${tree} · ${band}`]; } else buf.push(line); }
  await flush();
}
for (const f of (await readdir(path.join(out, 'growth'))).filter(f => f.endsWith('.txt') && !wrote.has(f))) await unlink(path.join(out, 'growth', f));
const version = hash.digest('hex').slice(0, 10);
await writeFile(path.join(out, 'growth', 'index.json'), JSON.stringify({ version, built: new Date().toISOString(), counts }, null, 2) + '\n');
const lessons = Object.values(counts).reduce((a, c) => a + (c.lessons || 0), 0);
console.log(`growth.js ${(body.length / 1024).toFixed(0)} KB from ${parts.length} parts; content ${version}: ${lessons} lessons, ${counts['moments.txt'] || 0} moments, ${counts['cases.txt'] || 0} cases`);
