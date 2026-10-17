// Générateur procédural seedé. Produit des niveaux candidats ; level-tools les résout et les trie
// pour tenir la courbe de difficulté.
import { DEFAULT_RULES } from './rules';
import { Rng } from './rng';
import type { ColorId, LevelDef, LevelRules, PlateDef, Point, ScrewDef } from './types';

export const COLORS: readonly ColorId[] = ['red', 'blue', 'yellow', 'green', 'purple', 'orange'];

export interface GeneratorParams {
  /** Nombre de groupes de vis (une boîte chacun) : vis = groupes × boxCapacity. */
  groups: number;
  colors: number;
  plates: number;
  /** Part des vis à plusieurs taps (0 à 1). */
  multiTapRate: number;
  rules?: Partial<LevelRules>;
}

const BOARD = { width: 100, height: 140 } as const;
const INSET = 4;

function rectangle(x: number, y: number, w: number, h: number): Point[] {
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ];
}

/** Emplacements de vis d'une plaque rectangulaire : coins rentrés, puis milieux des côtés. */
function anchors(x: number, y: number, w: number, h: number): Point[] {
  const [l, r, t, b] = [x + INSET, x + w - INSET, y + INSET, y + h - INSET];
  const [cx, cy] = [Math.round(x + w / 2), Math.round(y + h / 2)];
  return [
    { x: l, y: t },
    { x: r, y: b },
    { x: r, y: t },
    { x: l, y: b },
    { x: cx, y: t },
    { x: cx, y: b },
    { x: l, y: cy },
    { x: r, y: cy },
  ];
}

export function generateLevel(id: string, seed: number, params: GeneratorParams): LevelDef {
  const rng = new Rng(seed);
  const rules: LevelRules = { ...DEFAULT_RULES, ...params.rules };
  const screwCount = params.groups * rules.boxCapacity;
  const plateCount = Math.max(1, Math.min(params.plates, screwCount));

  // Plaques : rectangles qui se chevauchent, z = ordre d'empilement.
  const plates: PlateDef[] = [];
  const slots: Point[][] = [];
  for (let z = 0; z < plateCount; z++) {
    const w = rng.int(30, 60);
    const h = rng.int(30, 70);
    const x = rng.int(0, BOARD.width - w);
    const y = rng.int(0, BOARD.height - h);
    plates.push({ id: `p${z + 1}`, z, polygon: rectangle(x, y, w, h) });
    slots.push(anchors(x, y, w, h));
  }

  // Répartition des vis : au moins une par plaque, au plus une par emplacement.
  const perPlate = plates.map(() => 1);
  for (let left = screwCount - plateCount; left > 0; ) {
    const i = rng.int(0, plateCount - 1);
    if ((perPlate[i] ?? 0) < (slots[i]?.length ?? 0)) {
      perPlate[i] = (perPlate[i] ?? 0) + 1;
      left--;
    }
  }

  // Couleurs : chaque groupe est un triplet d'une couleur, chaque couleur utilisée au moins une fois.
  const palette = rng.shuffle(COLORS).slice(0, Math.max(1, Math.min(params.colors, COLORS.length, params.groups)));
  const groups = palette.concat(Array.from({ length: params.groups - palette.length }, () => rng.pick(palette)));
  const screwColors = rng.shuffle(groups.flatMap((c) => Array<ColorId>(rules.boxCapacity).fill(c)));

  const screws: ScrewDef[] = [];
  plates.forEach((plate, i) => {
    const points = slots[i] ?? [];
    for (let k = 0; k < (perPlate[i] ?? 0); k++) {
      const color = screwColors[screws.length] ?? 'red';
      const multi = rng.next() < params.multiTapRate;
      screws.push({
        id: `s${screws.length + 1}`,
        color,
        kind: multi ? { type: 'multiTap', taps: rng.int(2, 3) } : { type: 'standard' },
        at: points[k] ?? { x: 0, y: 0 },
        pins: [plate.id],
      });
    }
  });

  return {
    schemaVersion: 1,
    id,
    seed,
    board: { ...BOARD },
    plates,
    screws,
    boxQueue: rng.shuffle(groups),
    rules,
  };
}
