import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { createTenantBody } from '@coldchain/shared';
import { ZodBody } from '../common/zod.pipe';
import { PlatformOnly, RequirePermissions } from '../iam/auth/decorators';
import { PlatformService } from './platform.service';

const updateTenantBody = z.object({
  status: z.enum(['TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELED']).optional(),
  planSlug: z.string().optional(),
});

@ApiTags('platform')
@PlatformOnly()
@Controller({ path: 'platform', version: '1' })
export class PlatformController {
  constructor(private readonly platform: PlatformService) {}

  @Get('tenants')
  @RequirePermissions('platform:tenant:manage')
  listTenants() {
    return this.platform.listTenants();
  }

  @Post('tenants')
  @RequirePermissions('platform:tenant:manage')
  createTenant(
    @Body(new ZodBody(createTenantBody)) body: ReturnType<typeof createTenantBody.parse>,
  ) {
    return this.platform.createTenant(body);
  }

  @Patch('tenants/:id')
  @RequirePermissions('platform:tenant:manage')
  updateTenant(
    @Param('id') id: string,
    @Body(new ZodBody(updateTenantBody)) body: ReturnType<typeof updateTenantBody.parse>,
  ) {
    return this.platform.updateTenant(id, body);
  }
}
