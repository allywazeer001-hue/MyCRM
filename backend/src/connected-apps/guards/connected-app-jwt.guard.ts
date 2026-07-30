import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class ConnectedAppJwtGuard extends AuthGuard('connected-app-jwt') {}
