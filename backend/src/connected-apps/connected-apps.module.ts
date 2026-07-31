import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { NotificationsModule } from '../notifications/notifications.module';
import { FieldsModule } from '../fields/fields.module';
import { RecordsModule } from '../records/records.module';
import { ConnectedAppsService } from './connected-apps.service';
import { ConnectedAppsController } from './connected-apps.controller';
import { ConnectionRequestsController } from './connection-requests.controller';
import { OauthExternalController } from './oauth-external.controller';
import { ExternalUsersController } from './external-users.controller';
import { ExternalModulesController } from './external-modules.controller';
import { PairingController } from './pairing.controller';
import { ConnectedAppJwtStrategy } from './strategies/connected-app-jwt.strategy';

@Module({
  imports: [
    // Needed for ConnectedAppJwtStrategy — a second, explicitly-named Passport
    // strategy alongside AuthModule's unnamed end-user 'jwt' strategy.
    PassportModule,
    // Separate secret from the end-user session JwtModule in AuthModule —
    // connected-app access tokens and CRM login tokens must never be
    // interchangeable.
    JwtModule.register({
      secret: process.env.CONNECTED_APPS_JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
    // Separate instance scoped to this module only — deliberately NOT bound
    // globally (via APP_GUARD) so the rest of the already-shipped app isn't
    // retroactively rate-limited. Only this module's public, unauthenticated
    // endpoints (connection requests, OAuth token exchange) enforce it,
    // via @UseGuards(ThrottlerGuard) + @Throttle on those specific routes.
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    NotificationsModule,
    // For ExternalModulesController — reuses the same field/record logic the
    // internal Studio/records UI already uses instead of reimplementing it.
    FieldsModule,
    RecordsModule,
  ],
  // ConnectionRequestsController MUST be registered before ConnectedAppsController:
  // both share the /connected-apps prefix, and ConnectedAppsController's
  // GET /connected-apps/:id would otherwise swallow GET /connected-apps/requests
  // (Express matches routes in registration order; "requests" satisfies :id).
  // PairingController also shares that prefix (POST /connected-apps/pair) but
  // registers a POST route no other controller here defines, so its position
  // doesn't matter for route-matching — kept next to ConnectionRequestsController
  // since both are public, unauthenticated entry points for external apps.
  controllers: [
    ConnectionRequestsController,
    PairingController,
    ConnectedAppsController,
    OauthExternalController,
    ExternalUsersController,
    ExternalModulesController,
  ],
  providers: [ConnectedAppsService, ConnectedAppJwtStrategy],
})
export class ConnectedAppsModule {}
