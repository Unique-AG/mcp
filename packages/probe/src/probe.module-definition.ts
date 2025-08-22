import { ConfigurableModuleBuilder } from '@nestjs/common';

export enum ProbeModuleOptions {
  VERSION = 'VERSION',
}

export interface IProbeModuleOptions {
  VERSION?: string;
}

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
  new ConfigurableModuleBuilder<IProbeModuleOptions>().setClassMethodName('forRoot').build();
