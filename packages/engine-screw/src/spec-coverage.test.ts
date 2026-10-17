// DoD phase 2 : chaque règle [Rn] de GAME-SPEC.md est citée par au moins un test.
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const rules = [...read('../../../docs/GAME-SPEC.md').matchAll(/\[(R\d+)\]/g)].map((m) => m[1]);
const tests = readdirSync(new URL('.', import.meta.url))
  .filter((f) => f.endsWith('.test.ts') && f !== 'spec-coverage.test.ts')
  .map((f) => read(`./${f}`))
  .join('\n');

describe('couverture de GAME-SPEC.md', () => {
  it('la spec numérote ses règles', () => {
    expect(rules.length).toBeGreaterThan(0);
  });
  it.each([...new Set(rules)])('la règle %s est testée', (rule) => {
    expect(tests).toContain(`[${rule}]`);
  });
});
