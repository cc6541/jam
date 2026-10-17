import { describe, expect, it } from 'vitest';
import { exampleLevel } from '@jam/engine-screw';
import { validateLevel } from './validate';

function errorsOf(input: unknown): string[] {
  const result = validateLevel(input);
  return result.ok ? [] : result.errors;
}

describe('validateLevel', () => {
  it('accepte le niveau d’exemple', () => {
    expect(validateLevel(exampleLevel())).toEqual({ ok: true, level: exampleLevel() });
  });

  it('rejette une vis qui retient une plaque inconnue', () => {
    const level = exampleLevel();
    level.screws[0]!.pins = ['p-absente'];
    expect(errorsOf(level)).toContain('vis s1 : plaque inconnue p-absente');
  });

  it('rejette une plaque retenue par aucune vis', () => {
    const level = exampleLevel();
    level.plates.push({ id: 'p-libre', z: 2, polygon: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 2 }] });
    expect(errorsOf(level)).toContain('plaque p-libre : retenue par aucune vis');
  });

  it('rejette un nombre de vis incompatible avec les boîtes', () => {
    const level = exampleLevel();
    level.screws.pop(); // retire le joker : il manque une vis bleue
    expect(errorsOf(level)).toContain('équilibre des couleurs : 1 places à combler pour 0 jokers');
  });

  it('rejette trop de vis d’une couleur', () => {
    const level = exampleLevel();
    level.screws[3]!.color = 'red';
    expect(errorsOf(level)).toContain('couleur red : 4 vis pour 3 places');
  });

  it('rejette un polygone de moins de 3 points (schéma)', () => {
    const level = exampleLevel();
    level.plates[0]!.polygon = [{ x: 0, y: 0 }];
    expect(errorsOf(level).some((e) => e.startsWith('/plates/0/polygon'))).toBe(true);
  });

  it('rejette les ids en double et les éléments hors plateau', () => {
    const level = exampleLevel();
    level.screws[1]!.id = 's1';
    level.screws[2]!.at = { x: 500, y: 50 };
    expect(errorsOf(level)).toEqual(expect.arrayContaining(['id en double : s1', 'vis s3 : hors du plateau']));
  });

  it('rejette un champ inconnu', () => {
    expect(errorsOf({ ...exampleLevel(), extra: true }).length).toBeGreaterThan(0);
  });
});
