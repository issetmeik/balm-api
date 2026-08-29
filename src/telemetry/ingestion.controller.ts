import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ingestTelemetryBody } from '../shared';
import { ZodBody } from '../common/zod.pipe';
import { CurrentUser, RequirePermissions, type AuthUser } from '../iam/auth/decorators';
import { IngestionService } from './ingestion.service';

@ApiTags('ingestion')
@Controller({ path: 'ingestion', version: '1' })
export class IngestionController {
  constructor(private readonly ingestion: IngestionService) {}

  /** Recebe um lote de leituras do app do motorista. Idempotente por dedupeKey. */
  @Post('telemetry')
  @HttpCode(202)
  @RequirePermissions('telemetry:ingest')
  ingest(
    @Body(new ZodBody(ingestTelemetryBody)) body: ReturnType<typeof ingestTelemetryBody.parse>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ingestion.ingest(body, user.id);
  }
}
