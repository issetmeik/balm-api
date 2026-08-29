import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';

import { ConfigModule } from './config/config.module';
import { loadEnv } from './config/env';
import { PrismaModule } from './infra/prisma/prisma.module';
import { RbacModule } from './iam/rbac/rbac.module';
import { AuthModule } from './iam/auth/auth.module';
import { LimitsModule } from './iam/limits/limits.module';
import { AuditModule } from './audit/audit.module';
import { TenantsModule } from './iam/tenants/tenants.module';
import { PlansModule } from './iam/plans/plans.module';
import { UsersModule } from './iam/users/users.module';
import { PlatformModule } from './platform/platform.module';
import { TelemetryModule } from './telemetry/telemetry.module';
import { HealthModule } from './health/health.module';

import { RequestContextMiddleware } from './iam/tenant-context/request-context.middleware';
import { JwtAuthGuard } from './iam/auth/jwt-auth.guard';
import { PermissionsGuard } from './iam/rbac/permissions.guard';
import { ProblemDetailsFilter } from './common/problem-details.filter';
import { TenantContext } from './iam/tenant-context/tenant-context';

@Module({
  imports: [
    ConfigModule,
    LoggerModule.forRoot({
      pinoHttp: {
        level: loadEnv().LOG_LEVEL,
        transport:
          loadEnv().NODE_ENV === 'development'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        redact: ['req.headers.authorization', 'req.headers.cookie', 'req.body.password'],
        customProps: () => {
          const ctx = TenantContext.get();
          return { requestId: ctx?.requestId, tenantId: ctx?.tenantId, userId: ctx?.userId };
        },
      },
    }),
    PrismaModule,
    RbacModule,
    AuthModule,
    LimitsModule,
    AuditModule,
    TenantsModule,
    PlansModule,
    UsersModule,
    PlatformModule,
    TelemetryModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: ProblemDetailsFilter },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
