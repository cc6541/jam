import { Ajv } from 'ajv';
import type { ColorId, LevelDef, Point } from '@jam/engine-screw';
import schema from '../schema/level.schema.json' with { type: 'json' };

export type ValidationResult = { ok: true; level: LevelDef } | { ok: false; errors: string[] };

const ajv = new Ajv({ allErrors: true });
const checkSchema = ajv.compile<LevelDef>(schema);

/** Valide un niveau : structure (schéma JSON) puis cohérence (règles de docs/GAME-SPEC.md, section Niveau). */
export function validateLevel(input: unknown): ValidationResult {
  if (!checkSchema(input)) {
    const errors = (checkSchema.errors ?? []).map((e) => `${e.instancePath || '/'} ${e.message ?? 'invalide'}`);
    return { ok: false, errors };
  }
  const errors = checkSemantics(input);
  return errors.length === 0 ? { ok: true, level: input } : { ok: false, errors };
}

function checkSemantics(level: LevelDef): string[] {
  const errors: string[] = [];
  const { board, plates, screws, boxQueue, rules } = level;

  duplicates([...plates.map((p) => p.id), ...screws.map((s) => s.id)]).forEach((id) =>
    errors.push(`id en double : ${id}`),
  );

  const plateIds = new Set(plates.map((p) => p.id));
  const pinned = new Set<string>();
  for (const s of screws) {
    for (const pin of s.pins) {
      if (plateIds.has(pin)) pinned.add(pin);
      else errors.push(`vis ${s.id} : plaque inconnue ${pin}`);
    }
    if (!inBoard(s.at, board)) errors.push(`vis ${s.id} : hors du plateau`);
  }
  for (const p of plates) {
    if (!pinned.has(p.id)) errors.push(`plaque ${p.id} : retenue par aucune vis`);
    if (!p.polygon.every((pt) => inBoard(pt, board))) errors.push(`plaque ${p.id} : hors du plateau`);
  }

  if (rules.toolboxMaxSlots < rules.toolboxSlots) errors.push('rules : toolboxMaxSlots < toolboxSlots');
  errors.push(...checkColorBalance(level));
  if (boxQueue.length < rules.activeBoxes) errors.push('boxQueue : moins de boîtes que activeBoxes');
  return errors;
}

/** Chaque boîte doit être remplissable exactement : les jokers comblent les manques de couleur. */
function checkColorBalance({ screws, boxQueue, rules }: LevelDef): string[] {
  const errors: string[] = [];
  const capacity = new Map<ColorId, number>();
  for (const c of boxQueue) capacity.set(c, (capacity.get(c) ?? 0) + rules.boxCapacity);

  const count = new Map<ColorId, number>();
  let jokers = 0;
  for (const s of screws) {
    if (s.kind.type === 'joker') jokers++;
    else count.set(s.color, (count.get(s.color) ?? 0) + 1);
  }

  let missing = 0;
  for (const [color, n] of count) {
    const cap = capacity.get(color) ?? 0;
    if (n > cap) errors.push(`couleur ${color} : ${n} vis pour ${cap} places`);
  }
  for (const [color, cap] of capacity) missing += Math.max(0, cap - (count.get(color) ?? 0));
  if (errors.length === 0 && missing !== jokers) {
    errors.push(`équilibre des couleurs : ${missing} places à combler pour ${jokers} jokers`);
  }
  return errors;
}

function inBoard(p: Point, board: LevelDef['board']): boolean {
  return p.x >= 0 && p.y >= 0 && p.x <= board.width && p.y <= board.height;
}

function duplicates(ids: string[]): string[] {
  const seen = new Set<string>();
  return [...new Set(ids.filter((id) => seen.size === seen.add(id).size))];
}
