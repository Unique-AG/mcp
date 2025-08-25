import { IncomingMessage } from 'node:http';
import { RequestMethod } from '@nestjs/common';
import type { Params } from 'nestjs-pino';

export const productionTarget = {
  target: 'pino/file',
};

export const developmentTarget = {
  target: 'pino-http-print',
  options: {
    destination: 1,
    all: true,
    translateTime: false,
    colorize: true,
    prettyOptions: {
      ignore: 'pid,hostname,context,req',
      translateTime: 'yyyy-mm-dd HH:MM:ss o',
      messageFormat: '\x1b[93;1m[{context}]\x1b[0m \x1b[97m{msg}\x1b[0m',
    },
  },
};

export const defaultLoggerOptions: Params = {
  pinoHttp: {
    enabled: true,
    // eslint-disable-next-line no-process-env
    level: 'info',
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.x_api_key',
        'req.headers["x-api-key"]',
        'config.headers.Authorization',
        'req.query["api-key"]',
      ],
      censor: () => '[Redacted]',
    },
    customProps: (req: IncomingMessage) => {
      if ((req as unknown as { body: { operationName: string } })?.body?.operationName) {
        return {
          operationName: (req as unknown as { body: { operationName: string } }).body.operationName,
        };
      }
      return {};
    },
    transport:
      // eslint-disable-next-line no-process-env
      process.env.NODE_ENV !== 'production' ? developmentTarget : productionTarget,
  },
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
  ],
};
