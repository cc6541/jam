// Horloge monotone : refuse les retours en arrière (changement manuel de l'heure du téléphone).
// Pas de NTP : l'en-tête HTTP `Date` du fetch de la config statique peut servir de référence.
import type { ClockPort, StoragePort } from './ports';

const KEY = 'clock';

export class MonotonicClock implements ClockPort {
  private last: number;
  private offset = 0;
  /** Vrai si l'horloge système est revenue en arrière depuis le dernier passage. */
  rewound = false;

  private constructor(
    private readonly source: ClockPort,
    private readonly storage: StoragePort,
    last: number,
  ) {
    this.last = last;
  }

  /** `storage` doit être namespacé (NamespacedStorage). */
  static async create(source: ClockPort, storage: StoragePort): Promise<MonotonicClock> {
    const saved = Number(await storage.get(KEY));
    return new MonotonicClock(source, storage, Number.isFinite(saved) ? saved : 0);
  }

  now(): number {
    const t = this.source.now() + this.offset;
    if (t < this.last) {
      this.rewound = true;
      return this.last;
    }
    this.last = t;
    return t;
  }

  /** Recale sur une heure de référence (en-tête `Date`) si l'écart dépasse `toleranceMs`. */
  observeReference(referenceMs: number, toleranceMs = 5 * 60_000): void {
    const drift = referenceMs - this.source.now();
    if (Math.abs(drift - this.offset) > toleranceMs) this.offset = drift;
  }

  /** À appeler à la mise en arrière-plan de l'app. */
  flush(): Promise<void> {
    return this.storage.set(KEY, String(this.last));
  }
}
