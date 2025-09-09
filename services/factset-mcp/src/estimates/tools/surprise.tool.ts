import { Tool } from '@unique-ag/mcp-server-module';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { MetricService, Span } from 'nestjs-otel';
import { serializeError } from 'serialize-error-cjs';
import * as z from 'zod';
import { FactsetClientCredentials } from '../../auth/factset.client-credentials';
import { BaseFactsetTool } from '../../base-factset.tool';
import { normalizeError } from '../../utils/normalize-error';
import { getSurprise } from '../@generated/surprise/surprise';
import { getSurpriseQueryParams } from '../@generated/surprise/surprise.zod';

@Injectable()
export class SurpriseTool extends BaseFactsetTool {
  private readonly logger = new Logger(this.constructor.name);

  public constructor(factsetCredentials: FactsetClientCredentials, metricService: MetricService) {
    super(factsetCredentials, metricService);
  }

  @Tool({
    name: 'estimates_surprise',
    title: '[Estimates API] Earnings Surprise',
    description:
      'Calculates earnings surprise metrics by comparing actual reported results against consensus estimates. Returns surprise amount, percentage, and standardized surprise scores to measure how companies performed relative to expectations.',
    parameters: getSurpriseQueryParams,
    annotations: {
      title: '[Estimates API] Earnings Surprise',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    _meta: {
      'unique.app/icon': 'sparkles',
      'unique.app/system-prompt':
        'Use this tool to analyze earnings surprises by comparing actual reported results against analyst estimates. Returns surprise metrics including absolute surprise amount, surprise percentage, and standardized surprise score. Useful for identifying companies that beat or miss expectations, analyzing earnings patterns, and assessing market reactions. Specify the metric (e.g., EPS, revenue), statistic type (mean/median), and date range.',
    },
  })
  @Span()
  public async getSurprise(params: z.infer<typeof getSurpriseQueryParams>) {
    this.incrementActionCounter('surprise', 'estimates');

    try {
      const { data, status } = await this.callFactsetApiWithMetrics(
        'surprise',
        'estimates',
        getSurprise,
        params,
      );

      this.logger.log({
        msg: 'FactSet Surprise HTTP Response',
        status,
      });
      return data;
    } catch (error) {
      this.incrementActionFailureCounter('surprise', 'estimates', 'factset_api_error');
      this.logger.error({
        msg: 'Failed to get FactSet surprise',
        error: serializeError(normalizeError(error)),
      });
      throw new InternalServerErrorException(error);
    }
  }
}
