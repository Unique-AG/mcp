import { Tool } from '@unique-ag/mcp-server-module';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { MetricService, Span } from 'nestjs-otel';
import { serializeError } from 'serialize-error-cjs';
import * as z from 'zod';
import { FactsetClientCredentials } from '../../auth/factset.client-credentials';
import { BaseFactsetTool } from '../../base-factset.tool';
import { normalizeError } from '../../utils/normalize-error';
import { getFdsFundamentalsMetrics } from '../@generated/metrics/metrics';
import { getFdsFundamentalsMetricsQueryParams } from '../@generated/metrics/metrics.zod';

@Injectable()
export class MetricsTool extends BaseFactsetTool {
  private readonly logger = new Logger(this.constructor.name);

  public constructor(
    factsetCredentials: FactsetClientCredentials,
    metricService: MetricService,
  ) {
    super(factsetCredentials, metricService);
  }

  @Tool({
    name: 'fundamentals_metrics',
    title: '[Fundamentals API] Available Metrics',
    description:
      'Discovers available FactSet Fundamental metrics and ratios. Returns a comprehensive list of FF_* metric codes that can be used with the fundamentals_fundamentals tool. Filter by category and subcategory to find specific types of metrics (e.g., Income Statement, Balance Sheet, Ratios, etc.).',
    parameters: getFdsFundamentalsMetricsQueryParams,
    annotations: {
      title: '[Fundamentals API] Available Metrics',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    _meta: {
      'unique.app/icon': 'box',
      'unique.app/system-prompt':
        'Use this tool to discover available FactSet Fundamental metric codes (FF_* identifiers) that can be used with the fundamentals_fundamentals tool. Returns metric metadata including the metric code, name, description, category, subcategory, and methodology references (OApageID/OAurl for detailed definitions). Filter by category (e.g., INCOME_STATEMENT, BALANCE_SHEET, CASH_FLOW, RATIOS) and subcategory to find specific metrics. This is essential for finding the correct metric codes before querying fundamental data.',
    },
  })
  @Span()
  public async getMetrics(params: z.infer<typeof getFdsFundamentalsMetricsQueryParams>) {
    this.incrementActionCounter('metrics', 'fundamentals');

    try {  
      const { data, status } = await this.callFactsetApiWithMetrics(
        'metrics',
        'fundamentals',
        getFdsFundamentalsMetrics,
        params,
      );
      this.logger.log({
        msg: 'FactSet Metrics HTTP Response',
        status,
      });
      return data;
    } catch (error) {
      this.incrementActionFailureCounter('metrics', 'fundamentals', 'factset_api_error');
      this.logger.error({
        msg: 'Failed to get FactSet metrics',
        error: serializeError(normalizeError(error)),
      });
      throw new InternalServerErrorException(error);
    }
  }
}
