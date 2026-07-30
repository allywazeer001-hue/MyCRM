import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { NotificationsModule } from '../notifications/notifications.module';
import { ConnectedAppsService } from './connected-apps.service';
import { ConnectedAppsController } from './connected-apps.controller';
import { ConnectionRequestsController } from './connection-requests.controller';
import { OauthExternalController } from './oauth-external.controller';
import { ExternalUsersController } from './external-users.controller';
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
  ],
  // ConnectionRequestsController MUST be registered before ConnectedAppsController:
  // both share the /connected-apps prefix, and ConnectedAppsController's
  // GET /connected-apps/:id would otherwise swallow GET /connected-apps/requests
  // (Express matches routes in registration order; "requests" satisfies :id).
  controllers: [ConnectionRequestsController, ConnectedAppsController, OauthExternalController, ExternalUsersController],
  providers: [ConnectedAppsService, ConnectedAppJwtStrategy],
})
export class ConnectedAppsModule {}
