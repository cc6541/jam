import type {
  AdPlacement,
  AdsPort,
  AnalyticsPort,
  AnalyticsValue,
  ClockPort,
  IapPort,
  Product,
  PurchaseResult,
  RemoteConfigPort,
  RewardedResult,
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

export class FakeClock implements ClockPort {
  constructor(private time = 0) {}
  now() {
    return this.time;
  }
  set(time: number) {
    this.time = time;
  }
  advance(ms: number) {
    this.time += ms;
  }
}

export class MockAds implements AdsPort {
  readonly shown: { kind: 'rewarded' | 'interstitial'; placement: AdPlacement }[] = [];
  constructor(public rewardedResult: RewardedResult = { status: 'rewarded' }) {}
  async init() {}
  isRewardedReady(_placement: AdPlacement) {
    return this.rewardedResult.status !== 'unavailable';
  }
  async showRewarded(placement: AdPlacement) {
    this.shown.push({ kind: 'rewarded', placement });
    return this.rewardedResult;
  }
  async showInterstitial(placement: AdPlacement) {
    this.shown.push({ kind: 'interstitial', placement });
  }
}

export class MockIap implements IapPort {
  readonly purchases: string[] = [];
  private nextTransaction = 1;
  constructor(
    public products: Product[] = [],
    public result: 'purchased' | Exclude<PurchaseResult, { status: 'purchased' }> = 'purchased',
  ) {}
  async getProducts(ids: string[]) {
    return this.products.filter((p) => ids.includes(p.id));
  }
  async purchase(productId: string): Promise<PurchaseResult> {
    if (this.result !== 'purchased') return this.result;
    this.purchases.push(productId);
    return { status: 'purchased', productId, transactionId: `mock-${this.nextTransaction++}` };
  }
  async restore() {
    const owned = new Set(this.products.filter((p) => p.type === 'nonConsumable').map((p) => p.id));
    return [...new Set(this.purchases.filter((id) => owned.has(id)))];
  }
}

export class MockAnalytics implements AnalyticsPort {
  readonly events: { name: string; params: Record<string, AnalyticsValue> }[] = [];
  readonly userProperties = new Map<string, string>();
  logEvent(name: string, params: Record<string, AnalyticsValue> = {}) {
    this.events.push({ name, params });
  }
  setUserProperty(name: string, value: string) {
    this.userProperties.set(name, value);
  }
}

/** `config` : valeur renvoyée ; une `Error` simule un réseau absent. */
export class MockRemoteConfig implements RemoteConfigPort {
  constructor(public config: unknown = {}) {}
  async fetch() {
    if (this.config instanceof Error) throw this.config;
    return this.config;
  }
}
