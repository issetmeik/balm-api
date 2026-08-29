import { Inject, Injectable, Logger } from '@nestjs/common';
import * as argon2 from 'argon2';
import { authenticator } from 'otplib';
import {
  type LoginBody,
  type LoginResponse,
  type MeResponse,
  type TokenPair,
} from '../../shared';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RbacService } from '../rbac/rbac.service';
import { DomainError } from '../../common/domain-error';
import { ENV } from '../../config/config.module';
import type { Env } from '../../config/env';
import { TokensService } from './tokens.service';
import type { AuthUser } from './decorators';

interface ReqMeta {
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
    private readonly rbac: RbacService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async login(body: LoginBody, meta: ReqMeta): Promise<LoginResponse> {
    const user = await this.findLoginUser(body.email, body.tenantSlug);
    const genericFail = DomainError.unauthorized('E-mail ou senha incorretos.');

    if (!user) {
      // custo constante: evita enumeração de e-mails
      await argon2.hash('dummy-password-to-equalize-timing').catch(() => undefined);
      throw genericFail;
    }
    if (user.status === 'DISABLED') throw DomainError.unauthorized('Usuário desativado.');

    const ok = await argon2.verify(user.passwordHash, body.password).catch(() => false);
    if (!ok) throw genericFail;

    if (user.mfaEnabled) {
      if (!body.mfaCode) {
        return {
          mfaRequired: true as const,
          challengeToken: await this.tokens.signAccess({
            sub: user.id,
            tid: user.tenantId,
            plat: user.isPlatformStaff,
            roles: [],
          }),
        };
      }
      const valid = !!user.mfaSecret && authenticator.check(body.mfaCode, user.mfaSecret);
      if (!valid) throw DomainError.unauthorized('Código MFA inválido.');
    }

    return this.issueTokens(user.id, user.tenantId, user.isPlatformStaff, meta);
  }

  async refresh(presented: string | undefined, meta: ReqMeta): Promise<TokenPair> {
    if (!presented) throw DomainError.unauthorized('Refresh token ausente.');
    const tokenHash = this.tokens.hash(presented);

    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!record) throw DomainError.unauthorized('Sessão inválida.');

    if (record.revokedAt) {
      // Reuso de token revogado → compromete a família inteira.
      await this.prisma.refreshToken.updateMany({
        where: { familyId: record.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      this.logger.warn(
        { userId: record.userId, familyId: record.familyId },
        'Reuso de refresh token detectado — família revogada',
      );
      throw DomainError.unauthorized('Sessão expirada. Faça login novamente.');
    }
    if (record.expiresAt < new Date()) {
      throw DomainError.unauthorized('Sessão expirada.');
    }

    const rotated = this.tokens.rotateRefreshToken();
    const newRecord = await this.prisma.refreshToken.create({
      data: {
        userId: record.userId,
        tenantId: record.tenantId,
        familyId: record.familyId,
        tokenHash: rotated.hash,
        expiresAt: new Date(Date.now() + this.tokens.refreshTtlMs()),
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
    });
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date(), replacedBy: newRecord.id },
    });

    const access = await this.buildAccess(
      record.userId,
      record.tenantId,
      record.user.isPlatformStaff,
    );
    return {
      accessToken: access,
      refreshToken: rotated.value,
      expiresIn: 15 * 60,
    };
  }

  async logout(presented: string | undefined): Promise<void> {
    if (!presented) return;
    const tokenHash = this.tokens.hash(presented);
    const record = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (record) {
      await this.prisma.refreshToken.updateMany({
        where: { familyId: record.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
  }

  async me(authUser: AuthUser): Promise<MeResponse> {
    let tenant: MeResponse['tenant'] = null;
    if (authUser.tenantId) {
      const t = await this.prisma.tenant.findUnique({
        where: { id: authUser.tenantId },
      });
      if (t) tenant = { id: t.id, slug: t.slug, name: t.name, status: t.status };
    }
    const user = await this.prisma.user.findUnique({ where: { id: authUser.id } });
    return {
      user: {
        id: authUser.id,
        email: authUser.email,
        name: authUser.name,
        isPlatformStaff: authUser.isPlatformStaff,
        mfaEnabled: user?.mfaEnabled ?? false,
      },
      tenant,
      roles: authUser.roles,
      permissions: authUser.permissions,
    };
  }

  // ---- internos ----

  private async issueTokens(
    userId: string,
    tenantId: string | null,
    isPlatformStaff: boolean,
    meta: ReqMeta,
  ): Promise<TokenPair> {
    const refresh = this.tokens.newRefreshToken();
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tenantId,
        familyId: refresh.familyId,
        tokenHash: refresh.hash,
        expiresAt: new Date(Date.now() + this.tokens.refreshTtlMs()),
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
    });
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
    const access = await this.buildAccess(userId, tenantId, isPlatformStaff);
    return { accessToken: access, refreshToken: refresh.value, expiresIn: 15 * 60 };
  }

  private async buildAccess(
    userId: string,
    tenantId: string | null,
    isPlatformStaff: boolean,
  ): Promise<string> {
    const { roles } = await this.rbac.resolve(userId, tenantId);
    return this.tokens.signAccess({ sub: userId, tid: tenantId, plat: isPlatformStaff, roles });
  }

  private async findLoginUser(email: string, tenantSlug?: string) {
    if (tenantSlug) {
      const tenant = await this.prisma.tenant.findUnique({ where: { slug: tenantSlug } });
      if (!tenant) return null;
      return this.prisma.user.findUnique({
        where: { tenantId_email: { tenantId: tenant.id, email } },
      });
    }
    // sem slug: staff de plataforma ou usuário único com esse e-mail
    const platform = await this.prisma.user.findFirst({
      where: { email, tenantId: null },
    });
    if (platform) return platform;

    const matches = await this.prisma.user.findMany({ where: { email }, take: 2 });
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) {
      throw DomainError.validation(
        'Este e-mail pertence a mais de uma empresa. Informe o identificador da empresa (tenantSlug).',
      );
    }
    return null;
  }
}
