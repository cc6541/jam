// pnpm levels:stats : une ligne par pack et par rôle (cases minimales et piège moyens), lu dans les métadonnées.
import { fileURLToPath } from 'node:url';
import type { LevelTier } from '@jam/engine-screw';
import { loadPacks, validateLevel } from '../index';

const appsDir = fileURLToPath(new URL('../../../../apps', import.meta.url));
const ORDER: LevelTier[] = ['tutorial', 'breather', 'normal', 'hard', 'superHard'];
const packs = new Map<string, { total: number; invalid: number; tiers: Map<LevelTier, { n: number; min: number; trap: number }> }>();
for (const { pack, json } of loadPacks(appsDir)) {
  const s = packs.get(pack) ?? { total: 0, invalid: 0, tiers: new Map() };
  s.total++;
  const valid = validateLevel(json);
  if (!valid.ok) s.invalid++;
  const meta = valid.ok ? valid.level.meta : undefined;
  if (meta) {
    const t = s.tiers.get(meta.tier) ?? { n: 0, min: 0, trap: 0 };
    s.tiers.set(meta.tier, { n: t.n + 1, min: t.min + meta.minSlots, trap: t.trap + meta.trapRate });
  }
  packs.set(pack, s);
}
if (packs.size === 0) console.log('aucun niveau');
for (const [pack, { total, invalid, tiers }] of packs) {
  console.log(`${pack}: ${total} niveaux, ${invalid} invalides`);
  for (const tier of ORDER) {
    const t = tiers.get(tier);
    if (t) console.log(`  ${tier}: ${t.n} niveaux, cases min. ${(t.min / t.n).toFixed(1)}/5, piège ${Math.round((t.trap / t.n) * 100)} %`);
  }
}
