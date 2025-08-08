import { ConfigurableModuleBuilder } from '@nestjs/common';
import type { RouteInfo } from '@nestjs/common/interfaces';

export enum LoggerModuleOptions {
  ENABLE = 'ENABLE',
  LOG_LEVEL = 'LOG_LEVEL',
  EXCLUDE = 'EXCLUDE',
  REDACT = 'REDACT',
  CENSOR = 'CENSOR',
  DESTINATION = 'DESTINATION',
}

export interface ILoggerModuleOptions {
  ENABLE?: boolean;
  LOG_LEVEL?: string;
  EXCLUDE?: Array<string | RouteInfo>;
  REDACT?: string[];
  DESTINATION?: string;
  CENSOR?: (value: string, path: string) => string;
}

export const {
  ConfigurableModuleClass: LoggerConfigurableModule,
  MODULE_OPTIONS_TOKEN,
  OPTIONS_TYPE: LOGGER_OPTIONS_TYPE,
  ASYNC_OPTIONS_TYPE: LOGGER_ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<ILoggerModuleOptions>().setClassMethodName('forRoot').build();
