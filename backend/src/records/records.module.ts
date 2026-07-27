import { Module } from '@nestjs/common';
import { RecordsService } from './records.service';
import { RecordsController, LookupController } from './records.controller';
import { WorkflowsModule } from '../workflows/workflows.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { ProcessModule } from '../process/process.module';
import { BlueprintsModule } from '../blueprints/blueprints.module';
import { RelationResolverService } from './relation-resolver.service';
import { WebsocketModule } from '../websocket/websocket.module';
@Module({
  imports: [WorkflowsModule, PermissionsModule, ProcessModule, BlueprintsModule, WebsocketModule],
  controllers: [RecordsController, LookupController],
  providers: [RecordsService, RelationResolverService],
  exports: [RecordsService],
})
export class RecordsModule {}
