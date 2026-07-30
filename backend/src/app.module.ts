import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ModulesModule } from './modules/modules.module';
import { FieldsModule } from './fields/fields.module';
import { RecordsModule } from './records/records.module';
import { RelationshipsModule } from './relationships/relationships.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditModule } from './audit/audit.module';
import { FilesModule } from './files/files.module';
import { DashboardsModule } from './dashboards/dashboards.module';
import { VisualizationTemplatesModule } from './visualization-templates/visualization-templates.module';
import { ViewsModule } from './views/views.module';
import { PermissionsModule } from './permissions/permissions.module';
import { WebsocketModule } from './websocket/websocket.module';
import { GlobalListsModule } from './global-lists/global-lists.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { MediaModule } from './media/media.module';
import { FormsModule } from './forms/forms.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { UserPreferencesModule } from './user-preferences/user-preferences.module';
import { BlueprintsModule } from './blueprints/blueprints.module';
import { PortalModule } from './portal/portal.module';
import { DepartmentsModule } from './departments/departments.module';
import { ProcessModule } from './process/process.module';
import { TaskPanelsModule } from './task-panels/task-panels.module';
import { ReportsModule } from './reports/reports.module';
import { WorkspaceModule } from './workspace/workspace.module';
import { MessagesModule } from './messages/messages.module';
import { TrackerModule } from './tracker/tracker.module';
import { GalleryModule } from './gallery/gallery.module';
import { PublicationsModule } from './publications/publications.module';
import { CalendarSyncModule } from './calendar-sync/calendar-sync.module';
import { RequestTypesModule } from './request-types/request-types.module';
import { RequestBlueprintsModule } from './request-blueprints/request-blueprints.module';
import { RequestsModule } from './requests/requests.module';
import { IndustrySetupModule } from './industry-setup/industry-setup.module';
import { EmailTemplatesModule } from './email-templates/email-templates.module';
import { EmailsModule } from './emails/emails.module';
import { RecordRoutingModule } from './record-routing/record-routing.module';
import { FieldRulesModule } from './field-rules/field-rules.module';
import { PivotModule } from './pivot/pivot.module';
import { DataQualityModule } from './data-quality/data-quality.module';
import { ScheduledConfigurationsModule } from './scheduled-configurations/scheduled-configurations.module';
import { ConnectedAppsModule } from './connected-apps/connected-apps.module';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    ModulesModule,
    FieldsModule,
    RecordsModule,
    RelationshipsModule,
    WorkflowsModule,
    NotificationsModule,
    AuditModule,
    FilesModule,
    DashboardsModule,
    VisualizationTemplatesModule,
    ViewsModule,
    PermissionsModule,
    WebsocketModule,
    GlobalListsModule,
    AnnouncementsModule,
    MediaModule,
    FormsModule,
    AnalyticsModule,
    UserPreferencesModule,
    BlueprintsModule,
    PortalModule,
    DepartmentsModule,
    ProcessModule,
    TaskPanelsModule,
    ReportsModule,
    WorkspaceModule,
    MessagesModule,
    TrackerModule,
    GalleryModule,
    PublicationsModule,
    CalendarSyncModule,
    RequestTypesModule,
    RequestBlueprintsModule,
    RequestsModule,
    IndustrySetupModule,
    EmailTemplatesModule,
    EmailsModule,
    RecordRoutingModule,
    FieldRulesModule,
    PivotModule,
    DataQualityModule,
    ScheduledConfigurationsModule,
    ConnectedAppsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
