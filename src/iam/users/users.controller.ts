import { Body, Controller, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { createUserBody, setUserRolesBody, updateUserBody } from '@coldchain/shared';
import { ZodBody } from '../../common/zod.pipe';
import { RequirePermissions } from '../auth/decorators';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller({ version: '1' })
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('users')
  @RequirePermissions('user:read')
  list() {
    return this.users.list();
  }

  @Post('users')
  @RequirePermissions('user:invite')
  create(@Body(new ZodBody(createUserBody)) body: ReturnType<typeof createUserBody.parse>) {
    return this.users.create(body);
  }

  @Patch('users/:id')
  @RequirePermissions('user:update')
  update(
    @Param('id') id: string,
    @Body(new ZodBody(updateUserBody)) body: ReturnType<typeof updateUserBody.parse>,
  ) {
    return this.users.update(id, body);
  }

  @Put('users/:id/roles')
  @RequirePermissions('role:manage')
  setRoles(
    @Param('id') id: string,
    @Body(new ZodBody(setUserRolesBody)) body: ReturnType<typeof setUserRolesBody.parse>,
  ) {
    return this.users.setRoles(id, body.roleKeys);
  }

  @Get('roles')
  @RequirePermissions('role:read')
  listRoles() {
    return this.users.listRoles();
  }
}
