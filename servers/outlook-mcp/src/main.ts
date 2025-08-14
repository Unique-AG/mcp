import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@unique-ag/logger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AppConfig, AppSettings } from './app-settings.enum';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const configService = app.get<ConfigService<AppConfig, true>>(ConfigService);

  app.enableShutdownHooks();

  const logger = app.get(Logger);
  app.useLogger(logger);

  app.use(cookieParser());

  app.enableCors({
    origin: true,
    credentials: true,
  });

  const gracefulShutdown = async (signal: string) => {
    logger.log(`Received ${signal}. Starting graceful shutdown...`);

    // Set a timeout to force shutdown if cleanup takes too long
    const forceShutdownTimeout = setTimeout(() => {
      logger.warn('Graceful shutdown timeout exceeded, forcing exit...');
      process.exit(1);
    }, 5000); // 5 second timeout

    try {
      await app.close();
      clearTimeout(forceShutdownTimeout);
      logger.log('Application closed successfully');
      process.exit(0);
    } catch (error) {
      clearTimeout(forceShutdownTimeout);
      logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
  });
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });

  const port = configService.get(AppSettings.PORT, { infer: true });
  await app.listen(port);
  console.log(`Server is running on http://localhost:${port}`);
}
bootstrap();
