import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { loginBody, refreshBody } from '../../shared';
import { ZodBody } from '../../common/zod.pipe';
import { AuthService } from './auth.service';
import { CurrentUser, Public, type AuthUser } from './decorators';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  private meta(req: Request) {
    return {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
  }

  private presentedRefresh(req: Request, bodyToken?: string): string | undefined {
    return bodyToken || (req.headers['x-refresh-token'] as string | undefined) || undefined;
  }

  @Public()
  @Post('login')
  login(
    @Body(new ZodBody(loginBody)) body: ReturnType<typeof loginBody.parse>,
    @Req() req: Request,
  ) {
    return this.auth.login(body, this.meta(req));
  }

  @Public()
  @Post('refresh')
  refresh(
    @Body(new ZodBody(refreshBody)) body: ReturnType<typeof refreshBody.parse>,
    @Req() req: Request,
  ) {
    return this.auth.refresh(this.presentedRefresh(req, body.refreshToken), this.meta(req));
  }

  @Public()
  @Post('logout')
  async logout(@Body() body: { refreshToken?: string }, @Req() req: Request) {
    await this.auth.logout(this.presentedRefresh(req, body?.refreshToken));
    return { ok: true };
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user);
  }
}
