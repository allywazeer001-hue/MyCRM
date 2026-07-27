import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportFoldersController } from './report-folders.controller';
import { ReportFoldersService } from './report-folders.service';
import { PermissionsModule } from '../permissions/permissions.module';

// ReportFoldersController is registered before ReportsController so its
// literal `/reports/folders` routes are matched before ReportsController's
// `/reports/:id` — Nest/Express try routes in registration order, and `:id`
// would otherwise swallow "folders" as if it were a report id.
@Module({
  imports: [PermissionsModule],
  controllers: [ReportFoldersController, ReportsController],
  providers: [ReportsService, ReportFoldersService],
})
export class ReportsModule {}
