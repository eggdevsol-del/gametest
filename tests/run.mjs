// Runs every test suite against a real Chorecast server on throwaway embedded databases, one suite at a time (each
// starts its own servers on fixed ports), then the smoke test. Exits non-zero if anything fails.
//   npm test                      every suite
//   npm test -- plans family-shop just those
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url)), only = process.argv.slice(2);
const suites = readdirSync(here).filter(f => f.endsWith('.test.mjs')).map(f => f.replace('.test.mjs', '')).filter(n => !only.length || only.includes(n)).sort();
const runs = suites.map(n => [n, path.join(here, n + '.test.mjs')]);
if (!only.length) runs.push(['smoke', path.join(here, '..', 'scripts', 'smoke.mjs')]);
let failed = 0;
for (const [name, file] of runs) {
  const t0 = Date.now(), r = spawnSync(process.execPath, [file], { encoding: 'utf8', timeout: 15 * 60e3, env: { ...process.env } });
  const out = (r.stdout || '') + (r.stderr || ''), last = out.trim().split('\n').filter(l => /passed/.test(l)).pop() || '(no summary)';
  const bad = r.status !== 0; if (bad) failed++;
  console.log(`${bad ? '✗' : '✓'} ${name.padEnd(16)} ${last}  (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  if (bad) console.log(out.split('\n').filter(l => /FAIL|Error|error/.test(l)).slice(0, 15).map(l => '    ' + l).join('\n'));
}
console.log(failed ? `\n${failed} suite${failed === 1 ? '' : 's'} failed` : '\nAll suites passed');
process.exit(failed ? 1 : 0);
