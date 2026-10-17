// pnpm levels:generate <app> [blocs=10] [seed=1] : écrit apps/<app>/levels/NNN.json.
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { generateCurve } from '../curve';

const [app = 'screw-jam', blocks = '10', seed = '1'] = process.argv.slice(2);
const dir = fileURLToPath(new URL(`../../../../apps/${app}/levels/`, import.meta.url));
mkdirSync(dir, { recursive: true });
const levels = generateCurve({
  appId: app,
  blocks: Number(blocks),
  seed: Number(seed),
  onProgress: (m) => console.log(m),
});
levels.forEach(({ level }, i) => {
  writeFileSync(`${dir}${String(i + 1).padStart(3, '0')}.json`, `${JSON.stringify(level)}\n`);
});
console.log(`${levels.length} niveaux écrits dans apps/${app}/levels/`);
