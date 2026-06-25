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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GalleryServeController = exports.GalleryController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const fs = require("fs");
const mime = require("mime-types");
const gallery_service_1 = require("./gallery.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let GalleryController = class GalleryController {
    constructor(svc) {
        this.svc = svc;
    }
    getCategories() {
        return this.svc.getCategories();
    }
    getStats(user) {
        return this.svc.getStats(user.organizationId);
    }
    findAll(user, query) {
        return this.svc.findAll(user.organizationId, query);
    }
    findOne(user, id) {
        return this.svc.findOne(user.organizationId, id);
    }
    upload(file, user, body) {
        return this.svc.uploadFile(user.organizationId, user.id, file, body);
    }
    update(user, id, body) {
        return this.svc.update(user.organizationId, id, body);
    }
    archive(user, id) {
        return this.svc.archive(user.organizationId, id);
    }
    unarchive(user, id) {
        return this.svc.unarchive(user.organizationId, id);
    }
    delete(user, id) {
        return this.svc.delete(user.organizationId, id);
    }
    trackDownload(id) {
        return this.svc.trackDownload(id);
    }
};
exports.GalleryController = GalleryController;
__decorate([
    (0, common_1.Get)('categories'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], GalleryController.prototype, "getCategories", null);
__decorate([
    (0, common_1.Get)('stats'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GalleryController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], GalleryController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], GalleryController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", void 0)
], GalleryController.prototype, "upload", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], GalleryController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/archive'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], GalleryController.prototype, "archive", null);
__decorate([
    (0, common_1.Post)(':id/unarchive'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], GalleryController.prototype, "unarchive", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], GalleryController.prototype, "delete", null);
__decorate([
    (0, common_1.Post)(':id/download'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], GalleryController.prototype, "trackDownload", null);
exports.GalleryController = GalleryController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('gallery'),
    __metadata("design:paramtypes", [gallery_service_1.GalleryService])
], GalleryController);
let GalleryServeController = class GalleryServeController {
    constructor(svc) {
        this.svc = svc;
    }
    serveFile(orgId, filename, res) {
        const { filePath, filename: name } = this.svc.serveFile(orgId, filename);
        const mimeType = mime.lookup(name) || 'application/octet-stream';
        res.set({
            'Content-Type': mimeType,
            'Content-Disposition': `inline; filename="${name}"`,
            'Cache-Control': 'public, max-age=86400',
        });
        return new common_1.StreamableFile(fs.createReadStream(filePath));
    }
};
exports.GalleryServeController = GalleryServeController;
__decorate([
    (0, common_1.Get)(':orgId/:filename'),
    __param(0, (0, common_1.Param)('orgId')),
    __param(1, (0, common_1.Param)('filename')),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", common_1.StreamableFile)
], GalleryServeController.prototype, "serveFile", null);
exports.GalleryServeController = GalleryServeController = __decorate([
    (0, common_1.Controller)('gallery/serve'),
    __metadata("design:paramtypes", [gallery_service_1.GalleryService])
], GalleryServeController);
//# sourceMappingURL=gallery.controller.js.map