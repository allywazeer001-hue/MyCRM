import { Controller, Post, Body, HttpCode, Get, Query, ForbiddenException } from '@nestjs/common';
import { PortalAuthService } from './portal-auth.service';

@Controller('portal/auth')
export class PortalAuthController {
  constructor(private authService: PortalAuthService) {}

  @Post('register')
  register() {
    throw new ForbiddenException('Self-registration is disabled');
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() body: { email: string; password: string; orgSlug?: string }) {
    return this.authService.login(body);
  }

  @Post('activate')
  @HttpCode(200)
  activateAccount(@Body() body: { changeToken: string; newPassword: string }) {
    return this.authService.activateAccount(body.changeToken, body.newPassword);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refresh(body.refreshToken);
  }

  @Post('forgot-password')
  @HttpCode(200)
  forgotPassword(@Body() body: { email: string; orgSlug?: string }) {
    return this.authService.forgotPassword(body.email, body.orgSlug);
  }

  @Post('reset-password')
  @HttpCode(200)
  resetPassword(@Body() body: { token: string; newPassword: string }) {
    return this.authService.resetPassword(body.token, body.newPassword);
  }

  @Get('password-policy')
  getPasswordPolicy(@Query('orgSlug') orgSlug?: string) {
    return this.authService.getPasswordPolicyPublic(orgSlug);
  }

  @Post('logout')
  @HttpCode(200)
  logout() {
    return { message: 'Logged out successfully' };
  }
}
