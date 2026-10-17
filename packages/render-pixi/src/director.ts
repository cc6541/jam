// Traduit les GameEvent d'un coup en une timeline d'animations et d'haptique.
// Pur et sans règle de jeu : tout ce qui est positionnel vient des événements ou de l'état d'après.
import type { ColorId, GameEvent, GameState, Id } from '@jam/engine-screw';
import type { HapticCue } from './haptics';

export type Target =
  | { area: 'box'; boxIndex: number; slot: number }
  | { area: 'toolbox'; slot: number }
  | { area: 'holding'; slot: number };

export type Cue = { at: number } & (
  | { kind: 'pulse'; screwId: Id; tapsLeft: number }
  | { kind: 'move'; screwId: Id; to: Target; duration: number }
  | { kind: 'shake'; screwId: Id }
  | { kind: 'plateFall'; plateId: Id; duration: number }
  | { kind: 'boxSwap'; boxIndex: number; next: ColorId | null; duration: number }
  | { kind: 'toolboxResize'; slots: number }
  | { kind: 'haptic'; cue: HapticCue }
  | { kind: 'end'; result: 'won' | 'lost'; nearMiss: boolean }
);

export const TIMING = {
  move: 220,
  dispatch: 260,
  stagger: 60,
  plateDelay: 80,
  plateFall: 520,
  boxSwap: 300,
  end: 150,
} as const;

/** `after` sert à placer les vis dans la toolbox ou la réserve (leur ordre final). */
export function direct(events: readonly GameEvent[], after: Pick<GameState, 'toolbox' | 'holding'>): Cue[] {
  const cues: Cue[] = [];
  let cursor = 0; // début de la prochaine action séquentielle
  let settled = 0; // fin de la dernière animation lancée

  const run = (start: number, duration: number) => {
    settled = Math.max(settled, start + duration);
  };

  for (const e of events) {
    switch (e.type) {
      case 'screwTapped':
        cues.push({ at: cursor, kind: 'pulse', screwId: e.screwId, tapsLeft: e.tapsLeft });
        cues.push({ at: cursor, kind: 'haptic', cue: { type: 'impact', strength: 'light' } });
        break;
      case 'screwToBox': {
        const fromBoard = e.from === 'board';
        const duration = fromBoard ? TIMING.move : TIMING.dispatch;
        cues.push({ at: cursor, kind: 'move', screwId: e.screwId, to: { area: 'box', boxIndex: e.boxIndex, slot: e.slot }, duration });
        run(cursor, duration);
        if (!fromBoard) cursor += TIMING.stagger;
        break;
      }
      case 'screwToToolbox': {
        const slot = Math.max(0, after.toolbox.indexOf(e.screwId));
        cues.push({ at: cursor, kind: 'move', screwId: e.screwId, to: { area: 'toolbox', slot }, duration: TIMING.move });
        run(cursor, TIMING.move);
        break;
      }
      case 'toolboxCleared':
        e.screwIds.forEach((screwId, i) => {
          const slot = Math.max(0, after.holding.indexOf(screwId));
          const at = cursor + i * TIMING.stagger;
          cues.push({ at, kind: 'move', screwId, to: { area: 'holding', slot }, duration: TIMING.move });
          run(at, TIMING.move);
        });
        break;
      case 'plateFell': {
        const at = cursor + TIMING.plateDelay;
        cues.push({ at, kind: 'plateFall', plateId: e.plateId, duration: TIMING.plateFall });
        cues.push({ at, kind: 'haptic', cue: { type: 'impact', strength: 'medium' } });
        break;
      }
      case 'boxCompleted': {
        // La boîte part quand les vis qui la remplissent sont arrivées.
        const at = settled;
        cues.push({ at, kind: 'boxSwap', boxIndex: e.boxIndex, next: e.next, duration: TIMING.boxSwap });
        cues.push({ at, kind: 'haptic', cue: { type: 'impact', strength: 'heavy' } });
        run(at, TIMING.boxSwap);
        cursor = settled;
        break;
      }
      case 'toolboxSlotAdded':
        cues.push({ at: cursor, kind: 'toolboxResize', slots: e.slots });
        break;
      case 'rejected':
        if (e.reason === 'blocked') cues.push({ at: cursor, kind: 'haptic', cue: { type: 'notify', outcome: 'warning' } });
        break;
      case 'won':
      case 'lost': {
        const at = settled + TIMING.end;
        const nearMiss = e.type === 'lost' && e.nearMiss;
        cues.push({ at, kind: 'haptic', cue: { type: 'notify', outcome: e.type === 'won' ? 'success' : 'error' } });
        cues.push({ at, kind: 'end', result: e.type, nearMiss });
        break;
      }
    }
  }
  return cues.sort((a, b) => a.at - b.at);
}

/** Tap refusé sur une vis bloquée : le rendu la secoue (l'id vient de l'action, pas de l'événement). */
export function rejectedTapCues(screwId: Id, events: readonly GameEvent[]): Cue[] {
  return events.some((e) => e.type === 'rejected' && e.reason === 'blocked')
    ? [{ at: 0, kind: 'shake', screwId }, ...direct(events, { toolbox: [], holding: [] })]
    : [];
}
