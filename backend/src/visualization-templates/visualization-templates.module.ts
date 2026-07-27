import { Module } from '@nestjs/common';
import { VisualizationTemplatesService } from './visualization-templates.service';
import { VisualizationTemplatesController } from './visualization-templates.controller';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [PermissionsModule],
  controllers: [VisualizationTemplatesController],
  providers: [VisualizationTemplatesService],
})
export class VisualizationTemplatesModule {}
