// Makes the Claude-artifact version of Chorecast from public/chorecast/index.html (the source of truth):
// the artifact host adds its own <!doctype>, <head> skeleton and <body>, so those are stripped here.
// Usage: node scripts/chorecast-artifact.mjs <output.html>
import { readFile, writeFile } from 'node:fs/promises';
const out = process.argv[2]; if (!out) { console.error('usage: node scripts/chorecast-artifact.mjs <output.html>'); process.exit(1); }
const page = await readFile(new URL('../public/chorecast/index.html', import.meta.url), 'utf8');
const start = page.indexOf('<title>'), headEnd = page.indexOf('</head>\n<body>\n');
const html = page.slice(start, headEnd) + '\n' + page.slice(headEnd + '</head>\n<body>\n'.length).replace(/\n*<\/body>\n<\/html>\n?$/, '\n');
await writeFile(out, html);
console.log(`artifact page written to ${out} (${(html.length / 1024).toFixed(0)} KB)`);
