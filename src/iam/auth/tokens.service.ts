import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'node:crypto';
import { ENV } from '../../config/config.module';
import type { Env } from '../../config/env';

export interface AccessClaims {
  sub: string;
  tid: string | null;
  plat: boolean;
  roles: string[];
}

@Injectable()
export class TokensService {
  constructor(
    private readonly jwt: JwtService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async signAccess(claims: AccessClaims): Promise<string> {
    return this.jwt.signAsync(claims, {
      secret: this.env.JWT_ACCESS_SECRET,
      expiresIn: this.env.JWT_ACCESS_TTL,
    });
  }

  async verifyAccess(token: string): Promise<AccessClaims> {
    return this.jwt.verifyAsync<AccessClaims>(token, {
      secret: this.env.JWT_ACCESS_SECRET,
    });
  }

  /** Refresh token opaco: valor aleatório entregue ao cliente, hash no banco. */
  newRefreshToken(): { value: string; hash: string; familyId: string } {
    const value = `${randomUUID()}.${randomUUID()}`;
    return { value, hash: this.hash(value), familyId: randomUUID() };
  }

  rotateRefreshToken(): { value: string; hash: string } {
    const value = `${randomUUID()}.${randomUUID()}`;
    return { value, hash: this.hash(value) };
  }

  hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  refreshTtlMs(): number {
    return parseDuration(this.env.JWT_REFRESH_TTL);
  }
}

function parseDuration(s: string): number {
  const m = /^(\d+)([smhd])$/.exec(s.trim());
  if (!m) return 30 * 24 * 3600 * 1000;
  const n = Number(m[1]);
  const unit = m[2];
  const mult = unit === 's' ? 1e3 : unit === 'm' ? 6e4 : unit === 'h' ? 36e5 : 864e5;
  return n * mult;
}
