// Invariant 2 : toute clé de stockage est préfixée par le bundleId de l'app.
import type { StoragePort } from './ports';

/** Vue d'un StoragePort limitée aux clés d'une app. */
export class NamespacedStorage implements StoragePort {
  private readonly prefix: string;

  constructor(
    private readonly storage: StoragePort,
    bundleId: string,
  ) {
    if (!/^[a-z0-9]+(\.[a-z0-9-]+)+$/i.test(bundleId)) throw new Error(`bundleId invalide : ${bundleId}`);
    this.prefix = `${bundleId}:`;
  }

  get(key: string) {
    return this.storage.get(this.prefix + key);
  }
  set(key: string, value: string) {
    return this.storage.set(this.prefix + key, value);
  }
  remove(key: string) {
    return this.storage.remove(this.prefix + key);
  }
  async keys() {
    return (await this.storage.keys()).filter((k) => k.startsWith(this.prefix)).map((k) => k.slice(this.prefix.length));
  }
}

/** Document JSON versionné ; un contenu illisible ou d'une autre version retombe sur `defaults`. */
export class JsonDoc<T> {
  constructor(
    private readonly storage: StoragePort,
    private readonly key: string,
    private readonly version: number,
    private readonly defaults: () => T,
    private readonly migrate?: (data: unknown, fromVersion: number) => T | undefined,
  ) {}

  async load(): Promise<T> {
    const raw = await this.storage.get(this.key);
    if (raw === null) return this.defaults();
    try {
      const envelope = JSON.parse(raw) as { v?: unknown; data?: unknown };
      if (envelope.v === this.version) return envelope.data as T;
      if (typeof envelope.v === 'number') return this.migrate?.(envelope.data, envelope.v) ?? this.defaults();
    } catch {
      // Sauvegarde corrompue : on repart des valeurs par défaut plutôt que de bloquer le jeu.
    }
    return this.defaults();
  }

  save(data: T): Promise<void> {
    return this.storage.set(this.key, JSON.stringify({ v: this.version, data }));
  }
}
