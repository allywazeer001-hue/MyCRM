"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortalModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const passport_1 = require("@nestjs/passport");
const platform_express_1 = require("@nestjs/platform-express");
const prisma_module_1 = require("../prisma/prisma.module");
const portal_auth_controller_1 = require("./portal-auth.controller");
const portal_controller_1 = require("./portal.controller");
const portal_admin_controller_1 = require("./portal-admin.controller");
const portal_builder_controller_1 = require("./portal-builder.controller");
const portal_padmin_controller_1 = require("./portal-padmin.controller");
const portal_auth_service_1 = require("./portal-auth.service");
const portal_service_1 = require("./portal.service");
const portal_module_service_1 = require("./portal-module.service");
const portal_builder_service_1 = require("./portal-builder.service");
const portal_field_service_1 = require("./portal-field.service");
const portal_section_service_1 = require("./portal-section.service");
const portal_document_service_1 = require("./portal-document.service");
const portal_jwt_strategy_1 = require("./portal-jwt.strategy");
let PortalModule = class PortalModule {
};
exports.PortalModule = PortalModule;
exports.PortalModule = PortalModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            passport_1.PassportModule,
            jwt_1.JwtModule.register({}),
            platform_express_1.MulterModule.register({ storage: require('multer').memoryStorage() }),
        ],
        controllers: [
            portal_auth_controller_1.PortalAuthController,
            portal_controller_1.PortalController,
            portal_admin_controller_1.PortalAdminController,
            portal_builder_controller_1.PortalBuilderController,
            portal_padmin_controller_1.PortalPadminController,
        ],
        providers: [
            portal_auth_service_1.PortalAuthService,
            portal_service_1.PortalService,
            portal_module_service_1.PortalModuleService,
            portal_builder_service_1.PortalBuilderService,
            portal_field_service_1.PortalFieldService,
            portal_section_service_1.PortalSectionService,
            portal_document_service_1.PortalDocumentService,
            portal_jwt_strategy_1.PortalJwtStrategy,
        ],
    })
], PortalModule);
//# sourceMappingURL=portal.module.js.map