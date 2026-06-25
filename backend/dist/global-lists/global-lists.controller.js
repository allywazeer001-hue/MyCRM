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
exports.GlobalListsController = void 0;
const common_1 = require("@nestjs/common");
const global_lists_service_1 = require("./global-lists.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const swagger_1 = require("@nestjs/swagger");
let GlobalListsController = class GlobalListsController {
    constructor(svc) {
        this.svc = svc;
    }
    getPublished() {
        return this.svc.getPublishedLists();
    }
    findAll(user) {
        return this.svc.findAll(user.organizationId);
    }
    findOne(id, user) {
        return this.svc.findOne(id, user.organizationId);
    }
    create(body, user) {
        return this.svc.create(user.organizationId, body);
    }
    update(id, body, user) {
        return this.svc.update(id, user.organizationId, body);
    }
    remove(id, user) {
        return this.svc.remove(id, user.organizationId);
    }
    linkParentList(id, body, user) {
        return this.svc.setLinkedParentList(id, user.organizationId, body.parentListId);
    }
    getByLinkedParent(id, parentItemId, user) {
        return this.svc.getItemsByLinkedParent(id, user.organizationId, parentItemId);
    }
    linkItemChildList(id, itemId, body, user) {
        return this.svc.linkItemChildList(id, user.organizationId, itemId, body.childListId);
    }
    getItems(id, parentId, search, user) {
        return this.svc.getItems(id, user.organizationId, parentId, search);
    }
    getTree(id, user) {
        return this.svc.getItemTree(id, user.organizationId);
    }
    addItem(id, body, user) {
        return this.svc.addItem(id, user.organizationId, body);
    }
    bulkCreateItems(id, body, user) {
        return this.svc.bulkCreateItems(user.organizationId, id, body.items ?? []);
    }
    updateItem(id, itemId, body, user) {
        return this.svc.updateItem(id, user.organizationId, itemId, body);
    }
    removeItem(id, itemId, user) {
        return this.svc.removeItem(id, user.organizationId, itemId);
    }
    getItem(id, itemId, user) {
        return this.svc.getItem(id, user.organizationId, itemId);
    }
    getChildren(id, itemId, user) {
        return this.svc.getItemChildren(id, user.organizationId, itemId);
    }
    getAncestors(id, itemId, user) {
        return this.svc.getItemAncestors(id, user.organizationId, itemId);
    }
};
exports.GlobalListsController = GlobalListsController;
__decorate([
    (0, common_1.Get)('published'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], GlobalListsController.prototype, "getPublished", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GlobalListsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], GlobalListsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], GlobalListsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], GlobalListsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], GlobalListsController.prototype, "remove", null);
__decorate([
    (0, common_1.Patch)(':id/link-parent'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], GlobalListsController.prototype, "linkParentList", null);
__decorate([
    (0, common_1.Get)(':id/by-parent/:parentItemId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('parentItemId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], GlobalListsController.prototype, "getByLinkedParent", null);
__decorate([
    (0, common_1.Patch)(':id/items/:itemId/link-child-list'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('itemId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], GlobalListsController.prototype, "linkItemChildList", null);
__decorate([
    (0, common_1.Get)(':id/items'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('parentId')),
    __param(2, (0, common_1.Query)('search')),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], GlobalListsController.prototype, "getItems", null);
__decorate([
    (0, common_1.Get)(':id/tree'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], GlobalListsController.prototype, "getTree", null);
__decorate([
    (0, common_1.Post)(':id/items'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], GlobalListsController.prototype, "addItem", null);
__decorate([
    (0, common_1.Post)(':id/items/bulk'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], GlobalListsController.prototype, "bulkCreateItems", null);
__decorate([
    (0, common_1.Patch)(':id/items/:itemId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('itemId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], GlobalListsController.prototype, "updateItem", null);
__decorate([
    (0, common_1.Delete)(':id/items/:itemId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('itemId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], GlobalListsController.prototype, "removeItem", null);
__decorate([
    (0, common_1.Get)(':id/items/:itemId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('itemId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], GlobalListsController.prototype, "getItem", null);
__decorate([
    (0, common_1.Get)(':id/items/:itemId/children'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('itemId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], GlobalListsController.prototype, "getChildren", null);
__decorate([
    (0, common_1.Get)(':id/items/:itemId/ancestors'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('itemId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], GlobalListsController.prototype, "getAncestors", null);
exports.GlobalListsController = GlobalListsController = __decorate([
    (0, swagger_1.ApiTags)('global-lists'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('global-lists'),
    __metadata("design:paramtypes", [global_lists_service_1.GlobalListsService])
], GlobalListsController);
//# sourceMappingURL=global-lists.controller.js.map