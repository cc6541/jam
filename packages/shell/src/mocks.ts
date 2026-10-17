// Implémentations en mémoire des ports, pour le développement et les tests.
import type {
  AdResult,
  AdsPort,
  AnalyticsPort,
  AnalyticsValue,
  ClockPort,
  FeedbackPort,
  HapticKind,
  IapPort,
  NotificationsPort,
  Ports,
  PurchaseResult,
  RemoteConfigPort,
  StoragePort,
} from './ports';

export class MemoryStorage implements StoragePort {
  readonly data = new Map<string, string>();
  async get(key: string) {
    return this.data.get(key) ?? null;
  }
  async set(key: string, value: string) {
    this.data.set(key, value);
  }
  async remove(key: string) {
    this.data.delete(key);
  }
  async keys() {
    return [...this.data.keys()];
  }
}

/** Horloge pilotable : `advance` fait avancer les deux temps, `setWall` simule un joueur qui change l'heure. */
export class FakeClock implements ClockPort {
  constructor(
    private wall = Date.UTC(2026, 0, 1),
    private mono = 0,
  ) {}
  now() {
    return this.wall;
  }
  monotonic() {
    return this.mono;
  }
  advance(ms: number) {
    this.wall += ms;
    this.mono += ms;
  }
  setWall(ms: number) {
    this.wall = ms;
  }
}

export class MockAds implements AdsPort {
  result: AdResult = 'completed';
  readonly shown: string[] = [];
  isReady(_kind: 'rewarded' | 'interstitial') {
    return this.result !== 'unavailable';
  }
  async showRewarded(placement: Parameters<AdsPort['showRewarded']>[0]) {
    this.shown.push(placement);
    return this.result;
  }
  async showInterstitial() {
    this.shown.push('interstitial');
    return this.result;
  }
}

export class MockIap implements IapPort {
  result: PurchaseResult['status'] = 'purchased';
  readonly bought = new Set<string>();
  async products(ids: string[]) {
    return ids.map((id) => ({ id, displayPrice: '0,99 €' }));
  }
  async purchase(productId: string): Promise<PurchaseResult> {
    if (this.result !== 'purchased') return { status: this.result };
    this.bought.add(productId);
    return { status: 'purchased', productId };
  }
  async owned() {
    return [...this.bought];
  }
}

export class MockAnalytics implements AnalyticsPort {
  readonly events: { name: string; params?: Record<string, AnalyticsValue> }[] = [];
  readonly userProperties = new Map<string, string>();
  event(name: string, params?: Record<string, AnalyticsValue>) {
    this.events.push(params ? { name, params } : { name });
  }
  setUserProperty(name: string, value: string) {
    this.userProperties.set(name, value);
  }
}

export class MockRemoteConfig implements RemoteConfigPort {
  constructor(public response: { json: unknown; serverDate: number | null } | null = null) {}
  async fetch() {
    return this.response;
  }
}

export class MockFeedback implements FeedbackPort {
  readonly log: string[] = [];
  haptic(kind: HapticKind) {
    this.log.push(`haptic:${kind}`);
  }
  sound(id: string) {
    this.log.push(`sound:${id}`);
  }
  music(track: string | null) {
    this.log.push(`music:${track ?? 'off'}`);
  }
}

export class MockNotifications implements NotificationsPort {
  readonly scheduled = new Map<string, { at: number; title: string; body: string }>();
  granted = true;
  async requestPermission() {
    return this.granted;
  }
  async schedule(id: string, at: number, title: string, body: string) {
    this.scheduled.set(id, { at, title, body });
  }
  async cancel(id: string) {
    this.scheduled.delete(id);
  }
}

export function createMockPorts() {
  return {
    storage: new MemoryStorage(),
    clock: new FakeClock(),
    ads: new MockAds(),
    iap: new MockIap(),
    analytics: new MockAnalytics(),
    remoteConfig: new MockRemoteConfig(),
    feedback: new MockFeedback(),
    notifications: new MockNotifications(),
  } satisfies Ports;
}
