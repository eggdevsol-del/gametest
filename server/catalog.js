// The island shop's price list, read from the app's own public/chorecast/catalog.js (JSON after the "="), so the
// server checks kids' purchases against exactly what the shop shows.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = readFileSync(path.join(here, '..', 'public', 'chorecast', 'catalog.js'), 'utf8');
export const CATALOG = JSON.parse(src.slice(src.indexOf('{'), src.lastIndexOf('}') + 1));
export const ITEMS = new Map(CATALOG.items.map(i => [i.t, i]));
export const LAND = new Map(CATALOG.items.filter(i => i.land).map(i => [i.land, i]));
export const SIZES = new Map(CATALOG.items.filter(i => i.size).map(i => [i.size, i]));
// Looks by 'part:key', and chore tree types as 'tree:key'.
export const LOOKS = new Map([...CATALOG.looks.flatMap(p => p.opts.map(o => [`${p.k}:${o.k}`, o])), ...CATALOG.trees.map(o => [`tree:${o.k}`, o])]);
export const SETS = new Map(CATALOG.sets.map(s => [s.k, s]));
export const RULES = CATALOG.rules;
