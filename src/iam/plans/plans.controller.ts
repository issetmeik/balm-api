import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { Public } from '../auth/decorators';

@ApiTags('plans')
@Controller({ path: 'plans', version: '1' })
export class PlansController {
  constructor(private readonly prisma: PrismaService) {}

  /** Catálogo público de planos (só os visíveis). */
  @Public()
  @Get()
  async list() {
    const plans = await this.prisma.plan.findMany({
      where: { isPublic: true },
      include: { limits: true },
      orderBy: { priceCents: 'asc' },
    });
    return {
      data: plans.map((p) => ({
        slug: p.slug,
        name: p.name,
        priceCents: p.priceCents,
        limits: Object.fromEntries(p.limits.map((l) => [l.key, l.value])),
      })),
    };
  }
}
