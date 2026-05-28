"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const schedule_1 = require("@nestjs/schedule");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const organizations_module_1 = require("./organizations/organizations.module");
const modules_module_1 = require("./modules/modules.module");
const fields_module_1 = require("./fields/fields.module");
const records_module_1 = require("./records/records.module");
const relationships_module_1 = require("./relationships/relationships.module");
const workflows_module_1 = require("./workflows/workflows.module");
const notifications_module_1 = require("./notifications/notifications.module");
const audit_module_1 = require("./audit/audit.module");
const files_module_1 = require("./files/files.module");
const dashboards_module_1 = require("./dashboards/dashboards.module");
const views_module_1 = require("./views/views.module");
const permissions_module_1 = require("./permissions/permissions.module");
const websocket_module_1 = require("./websocket/websocket.module");
const global_lists_module_1 = require("./global-lists/global-lists.module");
const forms_module_1 = require("./forms/forms.module");
const analytics_module_1 = require("./analytics/analytics.module");
const user_preferences_module_1 = require("./user-preferences/user-preferences.module");
const blueprints_module_1 = require("./blueprints/blueprints.module");
const portal_module_1 = require("./portal/portal.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            throttler_1.ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
            schedule_1.ScheduleModule.forRoot(),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            organizations_module_1.OrganizationsModule,
            modules_module_1.ModulesModule,
            fields_module_1.FieldsModule,
            records_module_1.RecordsModule,
            relationships_module_1.RelationshipsModule,
            workflows_module_1.WorkflowsModule,
            notifications_module_1.NotificationsModule,
            audit_module_1.AuditModule,
            files_module_1.FilesModule,
            dashboards_module_1.DashboardsModule,
            views_module_1.ViewsModule,
            permissions_module_1.PermissionsModule,
            websocket_module_1.WebsocketModule,
            global_lists_module_1.GlobalListsModule,
            forms_module_1.FormsModule,
            analytics_module_1.AnalyticsModule,
            user_preferences_module_1.UserPreferencesModule,
            blueprints_module_1.BlueprintsModule,
            portal_module_1.PortalModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map