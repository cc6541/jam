// pnpm levels:stats : une ligne par pack (niveaux, difficulté min/moy/max, invalides).
import { fileURLToPath } from 'node:url';
import { solve } from '@jam/engine-screw';
import { loadPacks, validateLevel } from '../index';

const appsDir = fileURLToPath(new URL('../../../../apps', import.meta.url));
const packs = new Map<string, { total: number; invalid: number; scores: number[] }>();
for (const { pack, json } of loadPacks(appsDir)) {
  const s = packs.get(pack) ?? { total: 0, invalid: 0, scores: [] };
  s.total++;
  const valid = validateLevel(json);
  const solved = valid.ok ? solve(valid.level) : undefined;
  if (solved?.status === 'solved') s.scores.push(solved.difficulty.score);
  else s.invalid++;
  packs.set(pack, s);
}
if (packs.size === 0) console.log('aucun niveau');
for (const [pack, { total, invalid, scores }] of packs) {
  const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 'n/a';
  const range = scores.length ? `min ${Math.min(...scores)} / moy ${avg} / max ${Math.max(...scores)}` : 'n/a';
  console.log(`${pack}: ${total} niveaux, difficulté ${range}, ${invalid} invalides`);
}
