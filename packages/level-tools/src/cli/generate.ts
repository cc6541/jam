// pnpm levels:generate <app> [niveaux=100] [seed=1] : écrit apps/<app>/levels/NNN.json selon la courbe v2.
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { designLevel } from '../curve';

const [app = 'screw-jam', count = '100', seed = '1'] = process.argv.slice(2);
const dir = fileURLToPath(new URL(`../../../../apps/${app}/levels/`, import.meta.url));
mkdirSync(dir, { recursive: true });
let missed = 0;
for (let n = 1; n <= Number(count); n++) {
  const d = designLevel(app, n, Number(seed));
  if (d.miss > 0) missed++;
  writeFileSync(`${dir}${String(n).padStart(3, '0')}.json`, `${JSON.stringify(d.level)}\n`);
  const m = d.level.meta;
  if (n % 10 === 0 || d.miss > 0) {
    console.log(`${n} ${m?.tier} min=${m?.minSlots} piège=${Math.round((m?.trapRate ?? 0) * 100)}%${d.miss > 0 ? ` (écart ${d.miss.toFixed(2)})` : ''}`);
  }
}
console.log(`${count} niveaux écrits dans apps/${app}/levels/, ${missed} hors cible`);
