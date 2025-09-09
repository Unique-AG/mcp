import { Tool } from '@unique-ag/mcp-server-module';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { MetricService, Span } from 'nestjs-otel';
import { serializeError } from 'serialize-error-cjs';
import * as z from 'zod';
import { FactsetClientCredentials } from '../../auth/factset.client-credentials';
import { BaseFactsetTool } from '../../base-factset.tool';
import { normalizeError } from '../../utils/normalize-error';
import { getEstimateMetrics } from '../@generated/data-items/data-items';
import { getEstimateMetricsQueryParams } from '../@generated/data-items/data-items.zod';

@Injectable()
export class MetricsTool extends BaseFactsetTool {
  private readonly logger = new Logger(this.constructor.name);

  public constructor(factsetCredentials: FactsetClientCredentials, metricService: MetricService) {
    super(factsetCredentials, metricService);
  }

  @Tool({
    name: 'estimates_metrics',
    title: '[Estimates API] Available Estimate Metrics',
    description:
      'Discovers available estimate metrics and data items. Returns a comprehensive list of metrics that can be used for estimates, actuals, and surprise calculations across different categories and periodicities.',
    parameters: getEstimateMetricsQueryParams,
    annotations: {
      title: '[Estimates API] Available Estimate Metrics',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    _meta: {
      'unique.app/icon': 'list-ordered',
      'unique.app/system-prompt':
        'Use this tool to discover available estimate metrics that can be used with other estimates endpoints. Returns metadata about metrics including metric codes, descriptions, categories (e.g., EPS, Sales, Margins), and applicable periodicities. Essential for finding the correct metric identifiers before querying estimates, actuals, or surprise data. Filter by category to find specific types of metrics.',
    },
  })
  @Span()
  public async getEstimateMetrics(params: z.infer<typeof getEstimateMetricsQueryParams>) {
    this.incrementActionCounter('data-items/metrics', 'estimates');

    try {
      const { data, status } = await this.callFactsetApiWithMetrics(
        'data-items/metrics',
        'estimates',
        getEstimateMetrics,
        params,
      );

      this.logger.log({
        msg: 'FactSet Estimate Metrics HTTP Response',
        status,
      });
      return data;
    } catch (error) {
      this.incrementActionFailureCounter('data-items/metrics', 'estimates', 'factset_api_error');
      this.logger.error({
        msg: 'Failed to get FactSet estimate metrics',
        error: serializeError(normalizeError(error)),
      });
      throw new InternalServerErrorException(error);
    }
  }
}
