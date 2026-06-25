"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var CalendarSyncController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarSyncController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const calendar_sync_service_1 = require("./calendar-sync.service");
const google_sheets_service_1 = require("./google-sheets.service");
let CalendarSyncController = CalendarSyncController_1 = class CalendarSyncController {
    constructor(svc, sheets) {
        this.svc = svc;
        this.sheets = sheets;
        this.logger = new common_1.Logger(CalendarSyncController_1.name);
    }
    getAuthUrl(user, returnTo) {
        const url = this.svc.getAuthUrl(user.id, user.orgId ?? user.organizationId, returnTo);
        return { url };
    }
    async handleCallback(code, state, res) {
        try {
            const redirectUrl = await this.svc.handleOAuthCallback(code, state);
            return res.redirect(redirectUrl);
        }
        catch (err) {
            this.logger.error('OAuth callback error:', err?.message);
            const base = process.env.FRONTEND_URL?.split(',')[0] ?? 'http://localhost:3000';
            return res.redirect(`${base}/settings/calendar-sync?error=${encodeURIComponent(err?.message ?? 'Connection failed')}`);
        }
    }
    async disconnect(user) {
        await this.svc.disconnect(user.id);
    }
    getStatus(user) {
        return this.svc.getStatus(user.id);
    }
    listCalendars(user) {
        return this.svc.listCalendars(user.id);
    }
    createCloudBoxCalendar(user) {
        return this.svc.createCloudBoxCalendar(user.id);
    }
    saveSettings(user, body) {
        return this.svc.saveSettings(user.id, body);
    }
    bulkSyncTasks(user) {
        const uid = user.id;
        const oid = user.orgId ?? user.organizationId;
        return this.svc.bulkSyncTasks(uid, oid);
    }
    syncSingleTask() {
        return { message: 'Trigger sync via workspace operations or use bulk sync' };
    }
    async removeSyncForTask(id, user) {
        await this.svc.removeSyncForTask(id, user.id);
    }
    getSyncStatusForTasks(user, taskIds) {
        return this.svc.getSyncStatusForTasks(taskIds ?? [], user.id);
    }
    listSheets(user) {
        return this.sheets.listSheets(user.id);
    }
    createSheet(user, title) {
        return this.sheets.createSheet(user.id, title || 'Form Responses');
    }
    getSheetTabs(user, spreadsheetId) {
        return this.sheets.getSheetTabs(user.id, spreadsheetId);
    }
};
exports.CalendarSyncController = CalendarSyncController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('auth/url'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('returnTo')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CalendarSyncController.prototype, "getAuthUrl", null);
__decorate([
    (0, common_1.Get)('auth/callback'),
    __param(0, (0, common_1.Query)('code')),
    __param(1, (0, common_1.Query)('state')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], CalendarSyncController.prototype, "handleCallback", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Delete)('disconnect'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CalendarSyncController.prototype, "disconnect", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('status'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CalendarSyncController.prototype, "getStatus", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('calendars'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CalendarSyncController.prototype, "listCalendars", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('calendars/create-cloudbox'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CalendarSyncController.prototype, "createCloudBoxCalendar", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Patch)('settings'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], CalendarSyncController.prototype, "saveSettings", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('sync/tasks/bulk'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CalendarSyncController.prototype, "bulkSyncTasks", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('sync/tasks/:id'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CalendarSyncController.prototype, "syncSingleTask", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Delete)('sync/tasks/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CalendarSyncController.prototype, "removeSyncForTask", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('status/tasks'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)('taskIds')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Array]),
    __metadata("design:returntype", void 0)
], CalendarSyncController.prototype, "getSyncStatusForTasks", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('sheets'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CalendarSyncController.prototype, "listSheets", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('sheets'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)('title')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CalendarSyncController.prototype, "createSheet", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('sheets/:spreadsheetId/tabs'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('spreadsheetId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CalendarSyncController.prototype, "getSheetTabs", null);
exports.CalendarSyncController = CalendarSyncController = CalendarSyncController_1 = __decorate([
    (0, common_1.Controller)('calendar-sync'),
    __metadata("design:paramtypes", [calendar_sync_service_1.CalendarSyncService,
        google_sheets_service_1.GoogleSheetsService])
], CalendarSyncController);
//# sourceMappingURL=calendar-sync.controller.js.map