import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { loadEnv, type Env } from './env';

export const ENV = 'ENV';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: (raw) => loadEnv(raw as NodeJS.ProcessEnv),
    }),
  ],
  providers: [
    {
      provide: ENV,
      useFactory: (): Env => loadEnv(process.env),
    },
  ],
  exports: [ENV],
})
export class ConfigModule {}
