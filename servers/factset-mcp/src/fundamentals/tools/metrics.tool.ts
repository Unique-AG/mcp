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
    title: 'Fundamentals Metrics',
    description:
      'Returns available FactSet Fundamental metrics and ratios. Returns list of available FF_* metrics that can be used in the metrics parameter of related endpoints. These are related to FactSet Fundamentals standardized data. Leave Category and Subcategory blank to request all available items. For methodology definitions, reference the OApageID or OAurl response items.',
    parameters: getFdsFundamentalsMetricsQueryParams,
    annotations: {
      title: 'Fundamentals Metrics',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    _meta: {
      'unique.app/icon': 'chart-line',
      'unique.app/system-prompt':
        'Retrieves the available fundamental metrics from FactSet that can be used for financial analysis. Filter by category and subcategory to narrow down the results. Returns metric identifiers, names, descriptions, and methodology references.',
    },
  })
  @Span()
  public async getMetrics(params: z.infer<typeof getFdsFundamentalsMetricsQueryParams>) {
    this.incrementActionCounter('get_metrics');

    try {  
      const { data, status } = await getFdsFundamentalsMetrics(params, await this.getFactsetRequestOptions());
      this.logger.log({
        msg: 'FactSet Metrics HTTP Response',
        status,
      });
      return data;
    } catch (error) {
      this.incrementActionFailureCounter('get_metrics', 'factset_api_error');
      this.logger.error({
        msg: 'Failed to get FactSet metrics',
        error: serializeError(normalizeError(error)),
      });
      throw new InternalServerErrorException(error);
    }
  }
}
