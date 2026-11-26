import { Module } from '@nestjs/common';
import { AdapterRegistry } from './adapter.registry';
import { PROVIDER_ADAPTERS } from './provider-adapter';
import { SandboxAdapter } from './sandbox.adapter';

// A real provider = one new class implementing ProviderAdapter, added to the factory list below.
@Module({
  providers: [
    SandboxAdapter,
    { provide: PROVIDER_ADAPTERS, useFactory: (sandbox: SandboxAdapter) => [sandbox], inject: [SandboxAdapter] },
    AdapterRegistry,
  ],
  exports: [AdapterRegistry],
})
export class AdaptersModule {}
