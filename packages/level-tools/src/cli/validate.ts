// pnpm levels:validate : silencieux si tout passe, sinon une ligne par erreur.
// Un niveau est publiable s'il passe le schéma, les contrôles sémantiques et le solveur,
// et si son rôle déclaré correspond à sa place dans la courbe (docs/decisions/0008).
import { fileURLToPath } from 'node:url';
import { solve } from '@jam/engine-screw';
import { tierOf } from '../curve';
import { loadPacks, validateLevel } from '../index';

const appsDir = fileURLToPath(new URL('../../../../apps', import.meta.url));
let failures = 0;
for (const { pack, file, json } of loadPacks(appsDir)) {
  const result = validateLevel(json);
  const errors = result.ok ? [] : result.errors;
  if (result.ok) {
    const solved = solve(result.level, { randomRuns: 0 });
    if (solved.status !== 'solved') errors.push(`solveur : ${solved.status} (${solved.nodes} états)`);
    const n = Number(file.replace('.json', ''));
    const meta = result.level.meta;
    if (meta && Number.isFinite(n) && meta.tier !== tierOf(n)) errors.push(`rôle ${meta.tier}, attendu ${tierOf(n)}`);
  }
  if (errors.length > 0) failures++;
  for (const error of errors) console.error(`${pack}/${file}: ${error}`);
}
if (failures > 0) {
  console.error(`${failures} niveau(x) invalide(s)`);
  process.exit(1);
}
