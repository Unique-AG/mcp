import { Tool } from '@unique-ag/mcp-server-module';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { MetricService, Span } from 'nestjs-otel';
import { serializeError } from 'serialize-error-cjs';
import * as z from 'zod';
import { FactsetClientCredentials } from '../../auth/factset.client-credentials';
import { BaseFactsetTool } from '../../base-factset.tool';
import { normalizeError } from '../../utils/normalize-error';
import { getGuidance } from '../@generated/guidance/guidance';
import { getGuidanceQueryParams } from '../@generated/guidance/guidance.zod';

@Injectable()
export class GuidanceTool extends BaseFactsetTool {
  private readonly logger = new Logger(this.constructor.name);

  public constructor(factsetCredentials: FactsetClientCredentials, metricService: MetricService) {
    super(factsetCredentials, metricService);
  }

  @Tool({
    name: 'estimates_guidance',
    title: '[Estimates API] Company Guidance',
    description:
      'Retrieves company-issued guidance and management forecasts. Returns official company guidance for revenue, earnings, and other metrics that companies provide to the market about their expected future performance.',
    parameters: getGuidanceQueryParams,
    annotations: {
      title: '[Estimates API] Company Guidance',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    _meta: {
      'unique.app/icon': 'target',
      'unique.app/system-prompt':
        'Use this tool to get official company guidance and management forecasts. Returns company-provided guidance ranges for metrics like revenue, EPS, EBITDA, and other financial measures. Includes guidance type (initial, raised, lowered, maintained), guidance period, and the date guidance was issued. Useful for comparing company expectations against analyst estimates and tracking guidance changes.',
    },
  })
  @Span()
  public async getGuidance(params: z.infer<typeof getGuidanceQueryParams>) {
    this.incrementActionCounter('guidance', 'estimates');

    try {
      const { data, status } = await this.callFactsetApiWithMetrics(
        'guidance',
        'estimates',
        getGuidance,
        params,
      );

      this.logger.log({
        msg: 'FactSet Guidance HTTP Response',
        status,
      });
      return data;
    } catch (error) {
      this.incrementActionFailureCounter('guidance', 'estimates', 'factset_api_error');
      this.logger.error({
        msg: 'Failed to get FactSet guidance',
        error: serializeError(normalizeError(error)),
      });
      throw new InternalServerErrorException(error);
    }
  }
}
