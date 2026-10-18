// Badge « Difficile » : la courbe trie chaque bloc de 10 niveaux par difficulté croissante
// (docs/decisions/0003), donc les deux derniers niveaux d'un bloc sont ses pics. Rien n'est calculé au runtime.
export const BLOCK = 10;

/** Pics de difficulté signalés au joueur, à partir du 3e bloc (les 20 premiers niveaux servent de prise en main). */
export function isHardLevel(level: number): boolean {
  return level > 2 * BLOCK && (level - 1) % BLOCK >= BLOCK - 2;
}
