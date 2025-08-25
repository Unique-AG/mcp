import { join } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { AppConfig, AppSettings } from './app-settings.enum';
import { initOpenTelemetry, runWithInstrumentation } from './instrumentation';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });

  const configService = app.get<ConfigService<AppConfig, true>>(ConfigService);

  app.enableShutdownHooks();

  const logger = app.get(Logger);
  app.useLogger(logger);

  app.enableCors({
    origin: true,
  });

  app.useStaticAssets(join(__dirname, '..', 'public'));

  const port = configService.get(AppSettings.PORT, { infer: true });
  await app.listen(port);
  console.log(`Server is running on http://localhost:${port}`);
}

initOpenTelemetry();
void runWithInstrumentation(bootstrap, 'outlook-mcp');
