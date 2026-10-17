// Adaptateurs web des ports du shell. Capacitor les remplacera (Preferences, Haptics) sans toucher au reste.
import type { Platform } from '@jam/cross-promo';
import type { ClockPort, RemoteConfigPort, StoragePort } from '@jam/shell';

/** localStorage, avec repli mémoire si le stockage est indisponible (navigation privée, quota). */
export class LocalStorageAdapter implements StoragePort {
  private readonly fallback = new Map<string, string>();

  private store(): Storage | undefined {
    try {
      return window.localStorage;
    } catch {
      return undefined;
    }
  }

  async get(key: string) {
    try {
      return this.store()?.getItem(key) ?? this.fallback.get(key) ?? null;
    } catch {
      return this.fallback.get(key) ?? null;
    }
  }

  async set(key: string, value: string) {
    try {
      this.store()?.setItem(key, value);
    } catch {
      // Quota ou mode privé : on garde au moins la session en mémoire.
    }
    this.fallback.set(key, value);
  }

  async remove(key: string) {
    try {
      this.store()?.removeItem(key);
    } catch {
      // Rien à faire.
    }
    this.fallback.delete(key);
  }

  async keys() {
    const keys = new Set(this.fallback.keys());
    try {
      const s = this.store();
      for (let i = 0; s && i < s.length; i++) {
        const k = s.key(i);
        if (k) keys.add(k);
      }
    } catch {
      // Rien à faire.
    }
    return [...keys];
  }
}

export const systemClock: ClockPort = { now: () => Date.now() };

/** JSON statique servi avec l'app (ou par GitHub Pages) ; échec réseau = exception, le shell retombe sur son cache. */
export class FetchRemoteConfig implements RemoteConfigPort {
  constructor(
    private readonly url: string,
    private readonly timeoutMs = 4000,
  ) {}

  async fetch() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(this.url, { signal: controller.signal, cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return (await response.json()) as unknown;
    } finally {
      clearTimeout(timer);
    }
  }
}

export function detectPlatform(): Platform {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'ios' : 'android';
}
