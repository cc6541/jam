// Tweens pilotés par le delta du ticker : aucune horloge, aucun setTimeout.

export type Easing = (t: number) => number;

export const easings = {
  linear: (t: number) => t,
  outCubic: (t: number) => 1 - (1 - t) ** 3,
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
  inQuad: (t: number) => t * t,
  outBack: (t: number) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2,
} satisfies Record<string, Easing>;

export interface Tween {
  /** Retard avant le début, en ms. */
  delay: number;
  duration: number;
  easing: Easing;
  /** Appelé avec la progression [0, 1] après easing. */
  update: (t: number) => void;
  onComplete?: () => void;
}

interface Running extends Tween {
  elapsed: number;
  started: boolean;
}

export class TweenRunner {
  private running: Running[] = [];

  add(tween: Tween): void {
    this.running.push({ ...tween, elapsed: 0, started: false });
  }

  get busy(): boolean {
    return this.running.length > 0;
  }

  /** Avance de `dt` ms. */
  tick(dt: number): void {
    const done: Running[] = [];
    for (const tw of this.running) {
      tw.elapsed += dt;
      const local = tw.elapsed - tw.delay;
      if (local < 0) continue;
      tw.started = true;
      const t = tw.duration <= 0 ? 1 : Math.min(1, local / tw.duration);
      try {
        tw.update(tw.easing(t));
      } catch (error) {
        // Une animation qui échoue est abandonnée : elle ne doit jamais bloquer le jeu.
        console.error(error);
        done.push(tw);
        continue;
      }
      if (t >= 1) done.push(tw);
    }
    if (done.length === 0) return;
    this.running = this.running.filter((tw) => !done.includes(tw));
    for (const tw of done) {
      try {
        tw.onComplete?.();
      } catch (error) {
        console.error(error);
      }
    }
  }

  /** Termine tout immédiatement (ex. : coup suivant joué pendant l'animation). */
  finishAll(): void {
    while (this.running.length > 0) this.tick(Number.POSITIVE_INFINITY);
  }
}
