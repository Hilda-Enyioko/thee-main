import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PROVIDER_ADAPTERS, ProviderAdapter } from './provider-adapter';

@Injectable()
export class AdapterRegistry {
  private readonly byKey: Map<string, ProviderAdapter>;

  constructor(@Inject(PROVIDER_ADAPTERS) adapters: ProviderAdapter[]) {
    this.byKey = new Map(adapters.map((a) => [a.key, a]));
  }

  get(key: string): ProviderAdapter {
    const adapter = this.byKey.get(key);
    if (!adapter) throw new ServiceUnavailableException(`No adapter is registered for "${key}"`);
    return adapter;
  }
}
