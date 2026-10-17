// CLI silencieux : une ligne par pack, détails seulement pour les niveaux invalides.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { validateLevel } from './validate';

const root = resolve(import.meta.dirname, '../../..');
const appsDir = join(root, 'apps');
const command = process.argv[2];

const packs = existsSync(appsDir)
  ? readdirSync(appsDir)
      .map((app) => join(appsDir, app, 'levels'))
      .filter((dir) => existsSync(dir))
  : [];

let invalid = 0;
for (const dir of packs) {
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  const counts = { normal: 0, hard: 0, superHard: 0 };
  let packInvalid = 0;
  for (const file of files) {
    const result = validateLevel(JSON.parse(readFileSync(join(dir, file), 'utf8')));
    if (result.ok) counts[result.level.difficulty]++;
    else {
      packInvalid++;
      if (command === 'validate') console.error(`${file}: ${result.errors.slice(0, 3).join(' ; ')}`);
    }
  }
  invalid += packInvalid;
  const name = dir.slice(appsDir.length + 1);
  console.log(`${name}: ${files.length} niveaux, ${packInvalid} invalides, normal/hard/superHard=${counts.normal}/${counts.hard}/${counts.superHard}`);
}
if (packs.length === 0) console.log('aucun pack de niveaux');
// Le solveur (phase 3) ajoutera la preuve de solvabilité et le score de difficulté.
process.exit(invalid > 0 ? 1 : 0);
