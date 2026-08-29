import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { updateTenantSettingsBody } from '../../shared';
import { ZodBody } from '../../common/zod.pipe';
import { RequirePermissions, CurrentUser, type AuthUser } from '../auth/decorators';
import { TenantsService } from './tenants.service';
import { LimitsService } from '../limits/limits.service';

@ApiTags('tenant')
@Controller({ path: 'tenant', version: '1' })
export class TenantsController {
  constructor(
    private readonly tenants: TenantsService,
    private readonly limits: LimitsService,
  ) {}

  @Get()
  @RequirePermissions('tenant:read')
  current() {
    return this.tenants.current();
  }

  @Patch('settings')
  @RequirePermissions('tenant:settings')
  updateSettings(
    @Body(new ZodBody(updateTenantSettingsBody))
    body: ReturnType<typeof updateTenantSettingsBody.parse>,
  ) {
    return this.tenants.updateSettings(body);
  }

  @Get('usage')
  @RequirePermissions('tenant:usage:read')
  usage(@CurrentUser() user: AuthUser) {
    return this.limits.usage(user.tenantId as string);
  }
}
