// pnpm levels:validate : silencieux si tout passe, sinon une ligne par erreur.
// Un niveau est publiable s'il passe le schéma, les contrôles sémantiques et le solveur.
import { fileURLToPath } from 'node:url';
import { solve } from '@jam/engine-screw';
import { blockMeans } from '../curve';
import { loadPacks, validateLevel } from '../index';

const appsDir = fileURLToPath(new URL('../../../../apps', import.meta.url));
let failures = 0;
const scores = new Map<string, number[]>();
for (const { pack, file, json } of loadPacks(appsDir)) {
  const result = validateLevel(json);
  const errors = result.ok ? [] : result.errors;
  if (result.ok) {
    const solved = solve(result.level);
    if (solved.status === 'solved') scores.set(pack, [...(scores.get(pack) ?? []), solved.difficulty.score]);
    else errors.push(`solveur : ${solved.status} (${solved.nodes} états)`);
  }
  if (errors.length > 0) failures++;
  for (const error of errors) console.error(`${pack}/${file}: ${error}`);
}
// Courbe : la moyenne de difficulté ne baisse pas d'un bloc de 10 au suivant.
for (const [pack, list] of scores) {
  const means = blockMeans(list);
  means.forEach((m, i) => {
    const previous = means[i - 1];
    if (previous !== undefined && m < previous) {
      failures++;
      console.error(`${pack}: bloc ${i + 1} plus facile que le précédent (${m.toFixed(1)} < ${previous.toFixed(1)})`);
    }
  });
}
if (failures > 0) {
  console.error(`${failures} niveau(x) invalide(s)`);
  process.exit(1);
}
