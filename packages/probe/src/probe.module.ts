import { Module } from '@nestjs/common';
import { ProbeController } from './probe.controller';
import { ConfigurableModuleClass } from './probe.module-definition';

@Module({
  imports: [],
  controllers: [ProbeController],
  providers: [],
  exports: [],
})
export class ProbeModule extends ConfigurableModuleClass {}
