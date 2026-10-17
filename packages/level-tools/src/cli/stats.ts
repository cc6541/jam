// pnpm levels:stats : une ligne par pack. La difficulté (solveur) arrive en phase 3.
import { fileURLToPath } from 'node:url';
import { loadPacks, validateLevel } from '../index';

const appsDir = fileURLToPath(new URL('../../../../apps', import.meta.url));
const packs = new Map<string, { total: number; invalid: number }>();
for (const { pack, json } of loadPacks(appsDir)) {
  const s = packs.get(pack) ?? { total: 0, invalid: 0 };
  s.total++;
  if (!validateLevel(json).ok) s.invalid++;
  packs.set(pack, s);
}
if (packs.size === 0) console.log('aucun niveau');
for (const [pack, s] of packs) console.log(`${pack}: ${s.total} niveaux, ${s.invalid} invalides, difficulté n/a`);
