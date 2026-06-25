"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlueprintsModule = void 0;
const common_1 = require("@nestjs/common");
const blueprints_controller_1 = require("./blueprints.controller");
const blueprints_service_1 = require("./blueprints.service");
const prisma_module_1 = require("../prisma/prisma.module");
const notifications_module_1 = require("../notifications/notifications.module");
const websocket_module_1 = require("../websocket/websocket.module");
let BlueprintsModule = class BlueprintsModule {
};
exports.BlueprintsModule = BlueprintsModule;
exports.BlueprintsModule = BlueprintsModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, notifications_module_1.NotificationsModule, websocket_module_1.WebsocketModule],
        controllers: [blueprints_controller_1.BlueprintsController],
        providers: [blueprints_service_1.BlueprintsService],
        exports: [blueprints_service_1.BlueprintsService],
    })
], BlueprintsModule);
//# sourceMappingURL=blueprints.module.js.map