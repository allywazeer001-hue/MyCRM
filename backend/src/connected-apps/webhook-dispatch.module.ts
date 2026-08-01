import { Module } from '@nestjs/common';
import { WebhookDispatchService } from './webhook-dispatch.service';

// Deliberately standalone (not folded into ConnectedAppsModule): that module
// already imports RecordsModule for ExternalModulesController, and
// RecordsService is the consumer of this service — importing
// ConnectedAppsModule back from RecordsModule would be circular.
@Module({
  providers: [WebhookDispatchService],
  exports: [WebhookDispatchService],
})
export class WebhookDispatchModule {}
