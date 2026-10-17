// pnpm levels:validate : silencieux si tout passe, sinon une ligne par erreur.
// Le passage du solveur s'ajoute en phase 3.
import { fileURLToPath } from 'node:url';
import { loadPacks, validateLevel } from '../index';

const appsDir = fileURLToPath(new URL('../../../../apps', import.meta.url));
let failures = 0;
for (const { pack, file, json } of loadPacks(appsDir)) {
  const result = validateLevel(json);
  if (!result.ok) {
    failures++;
    for (const error of result.errors) console.error(`${pack}/${file}: ${error}`);
  }
}
if (failures > 0) {
  console.error(`${failures} niveau(x) invalide(s)`);
  process.exit(1);
}
