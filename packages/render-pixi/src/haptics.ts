/** Haptique fournie par l'app (Capacitor Haptics, ou navigator.vibrate en démo). */
export type HapticCue =
  | { type: 'impact'; strength: 'light' | 'medium' | 'heavy' }
  | { type: 'notify'; outcome: 'success' | 'warning' | 'error' };

export interface HapticsPort {
  play(cue: HapticCue): void;
}

export const silentHaptics: HapticsPort = { play: () => undefined };

/** Repli web : durées de vibration approximatives (le navigateur exige un premier geste de l'utilisateur). */
export const vibrateHaptics: HapticsPort = {
  play(cue) {
    if (!navigator.userActivation?.hasBeenActive) return;
    const ms = cue.type === 'impact' ? { light: 8, medium: 15, heavy: 25 }[cue.strength] : [20, 40, 20];
    navigator.vibrate?.(ms);
  },
};
