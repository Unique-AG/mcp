import { DynamicModule, Module, RequestMethod } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import type { Options } from 'pino-http';
import type { PrettyOptions } from 'pino-pretty';
import { LOGGER_OPTIONS_TYPE, LoggerConfigurableModule } from './logger.module-definition';

const DEFAULT_LOG_LEVEL = 'info';
@Module({})
export class LoggerModule extends LoggerConfigurableModule {
  public static forRootAsync(options: typeof LOGGER_OPTIONS_TYPE): DynamicModule {
    const productionTarget = {
      target: 'pino/file',
    };
    const developmentTarget = {
      target: 'pino-http-print',
      options: {
        destination: options.DESTINATION ?? 1,
        all: true,
        translateTime: false,
        prettyOptions: {
          ignore: 'pid,hostname,context,req',
          translateTime: 'yyyy-mm-dd HH:MM:ss o',
          messageFormat: '\x1b[93;1m[{context}]\x1b[0m \x1b[97m{msg}\x1b[0m',
        } as PrettyOptions,
      },
    };

    return PinoLoggerModule.forRoot({
      pinoHttp: [
        {
          enabled: options.ENABLE ?? true,
          // eslint-disable-next-line no-process-env
          level: options.LOG_LEVEL ?? process.env.LOG_LEVEL ?? DEFAULT_LOG_LEVEL,
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.x_api_key',
              'req.headers["x-api-key"]',
              'config.headers.Authorization',
              'req.query["api-key"]',
              ...(options.REDACT ?? []),
            ],
            censor: (value: string, path: string[]) => {
              const pathAsString = path?.join('.') ?? '';
              if (typeof options.CENSOR === 'function') {
                return options.CENSOR(value, pathAsString);
              }
              return '[Redacted]';
            },
          },
          customProps: (req: Request) => {
            if ((req?.body as unknown as { operationName: string })?.operationName) {
              return {
                operationName: (req.body as unknown as { operationName: string }).operationName,
              };
            }
            return {};
          },
          transport:
            // eslint-disable-next-line no-process-env
            process.env.NODE_ENV !== 'production' ? developmentTarget : productionTarget,
        },
      ] as Options,
      exclude: [
        {
          method: RequestMethod.GET,
          path: 'probe',
        },
        {
          method: RequestMethod.GET,
          path: 'health',
        },
        {
          method: RequestMethod.GET,
          path: 'metrics',
        },
        ...(options.EXCLUDE ?? []),
      ],
    });
  }
}
