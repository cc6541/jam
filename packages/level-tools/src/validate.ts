import { Ajv } from 'ajv';
import type { ColorId, LevelDef } from '@jam/engine-screw';
import schema from '../schema/level.schema.json' with { type: 'json' };

export type ValidationResult = { ok: true; level: LevelDef } | { ok: false; errors: string[] };

const ajv = new Ajv({ allErrors: true });
const checkSchema = ajv.compile<LevelDef>(schema);

/** Schéma JSON puis contrôles sémantiques (docs/GAME-SPEC.md, section Niveau). */
export function validateLevel(input: unknown): ValidationResult {
  if (!checkSchema(input)) {
    const errors = (checkSchema.errors ?? []).map((e) => `${e.instancePath || '/'} ${e.message ?? 'invalide'}`);
    return { ok: false, errors };
  }
  const errors = semanticErrors(input);
  return errors.length === 0 ? { ok: true, level: input } : { ok: false, errors };
}

function semanticErrors(level: LevelDef): string[] {
  const errors: string[] = [];
  const { rules } = level;
  const duplicates = (ids: string[]) => ids.filter((id, i) => ids.indexOf(id) !== i);

  for (const id of duplicates(level.plates.map((p) => p.id))) errors.push(`plaque en double : ${id}`);
  for (const id of duplicates(level.screws.map((s) => s.id))) errors.push(`vis en double : ${id}`);

  const plateIds = new Set(level.plates.map((p) => p.id));
  const pinned = new Set<string>();
  for (const screw of level.screws) {
    for (const pin of screw.pins) {
      if (plateIds.has(pin)) pinned.add(pin);
      else errors.push(`vis ${screw.id} : plaque inconnue ${pin}`);
    }
  }
  for (const id of plateIds) if (!pinned.has(id)) errors.push(`plaque ${id} retenue par aucune vis`);

  const count = (colors: ColorId[]) => {
    const m = new Map<ColorId, number>();
    for (const c of colors) m.set(c, (m.get(c) ?? 0) + 1);
    return m;
  };
  const screwsByColor = count(level.screws.map((s) => s.color));
  const boxesByColor = count(level.boxQueue);
  for (const color of new Set([...screwsByColor.keys(), ...boxesByColor.keys()])) {
    const screws = screwsByColor.get(color) ?? 0;
    const boxes = boxesByColor.get(color) ?? 0;
    if (screws % rules.boxCapacity !== 0) {
      errors.push(`couleur ${color} : ${screws} vis, pas un multiple de ${rules.boxCapacity}`);
    } else if (screws !== boxes * rules.boxCapacity) {
      errors.push(`couleur ${color} : ${screws} vis pour ${boxes} boîte(s)`);
    }
  }

  if (rules.toolboxMaxSlots < rules.toolboxSlots) errors.push('rules : toolboxMaxSlots < toolboxSlots');
  return errors;
}
