import { Controller, Get, Inject, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { type IProbeModuleOptions, MODULE_OPTIONS_TOKEN } from './probe.module-definition';

@Controller({ path: 'probe', version: VERSION_NEUTRAL })
@ApiTags('Monitoring')
export class ProbeController {
  public constructor(@Inject(MODULE_OPTIONS_TOKEN) private readonly options: IProbeModuleOptions) {}

  @Get()
  @ApiExcludeEndpoint()
  public async probe(): Promise<{ version: string }> {
    const version = this.options.VERSION ?? 'unset';
    return { version };
  }
}
