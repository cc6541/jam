import type { StoragePort } from './ports';

/** Invariant n°2 : chaque app ne voit que ses propres clés, préfixées par son bundleId. */
export function namespacedStorage(base: StoragePort, bundleId: string): StoragePort {
  if (!/^[a-z0-9]+(\.[a-z0-9-]+)+$/i.test(bundleId)) throw new Error(`bundleId invalide : ${bundleId}`);
  const prefix = `${bundleId}:`;
  return {
    get: (key) => base.get(prefix + key),
    set: (key, value) => base.set(prefix + key, value),
    remove: (key) => base.remove(prefix + key),
    keys: async () => (await base.keys()).filter((k) => k.startsWith(prefix)).map((k) => k.slice(prefix.length)),
  };
}
