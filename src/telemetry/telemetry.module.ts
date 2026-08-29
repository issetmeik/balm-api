import { Module } from '@nestjs/common';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';
import { ReadingsController } from './readings.controller';

@Module({
  controllers: [IngestionController, ReadingsController],
  providers: [IngestionService],
})
export class TelemetryModule {}
