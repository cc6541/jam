/** Sons de jeu, déclenchés par la timeline du director. L'app fournit l'implémentation (WebAudio, natif…). */
export type SoundId = 'tap' | 'unscrew' | 'drop' | 'plate' | 'box' | 'blocked' | 'powerup' | 'win' | 'lose';

export interface SoundPort {
  play(id: SoundId): void;
}

export const silentSound: SoundPort = { play: () => undefined };
