import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MulterModule } from '@nestjs/platform-express';
import { PrismaModule } from '../prisma/prisma.module';
import { PortalAuthController } from './portal-auth.controller';
import { PortalController } from './portal.controller';
import { PortalAdminController } from './portal-admin.controller';
import { PortalBuilderController } from './portal-builder.controller';
import { PortalPadminController } from './portal-padmin.controller';
import { PortalAuthService } from './portal-auth.service';
import { PortalService } from './portal.service';
import { PortalModuleService } from './portal-module.service';
import { PortalBuilderService } from './portal-builder.service';
import { PortalFieldService } from './portal-field.service';
import { PortalSectionService } from './portal-section.service';
import { PortalDocumentService } from './portal-document.service';
import { PortalJwtStrategy } from './portal-jwt.strategy';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.register({}),
    MulterModule.register({ storage: require('multer').memoryStorage() }),
  ],
  controllers: [
    PortalAuthController,
    PortalController,
    PortalAdminController,
    PortalBuilderController,
    PortalPadminController,
  ],
  providers: [
    PortalAuthService,
    PortalService,
    PortalModuleService,
    PortalBuilderService,
    PortalFieldService,
    PortalSectionService,
    PortalDocumentService,
    PortalJwtStrategy,
  ],
})
export class PortalModule {}
