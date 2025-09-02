import { Tool } from '@unique-ag/mcp-server-module';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { MetricService, Span } from 'nestjs-otel';
import { serializeError } from 'serialize-error-cjs';
import * as z from 'zod';
import { FactsetClientCredentials } from '../../auth/factset.client-credentials';
import { BaseFactsetTool } from '../../base-factset.tool';
import { normalizeError } from '../../utils/normalize-error';
import { getSegments } from '../@generated/segments/segments';
import { getSegmentsQueryParams } from '../@generated/segments/segments.zod';

@Injectable()
export class EstimatesSegmentsTool extends BaseFactsetTool {
  private readonly logger = new Logger(this.constructor.name);

  public constructor(factsetCredentials: FactsetClientCredentials, metricService: MetricService) {
    super(factsetCredentials, metricService);
  }

  @Tool({
    name: 'estimates_segments',
    title: '[Estimates API] Segment Estimates',
    description:
      'Retrieves analyst estimates broken down by business segments or geographic regions. Provides consensus estimates for segment-level revenue, operating income, and other metrics to analyze expectations for different parts of a business.',
    parameters: getSegmentsQueryParams,
    annotations: {
      title: '[Estimates API] Segment Estimates',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    _meta: {
      'unique.app/icon': 'layout-grid',
      'unique.app/system-prompt':
        'Use this tool to get analyst estimates broken down by business segments or geographic regions. Returns consensus estimates for segment-level metrics like revenue and operating income. Useful for understanding expectations for different business units, analyzing segment growth prospects, and identifying key revenue drivers. Specify segment type (BUS for business, GEO for geographic) and the metrics to retrieve.',
    },
  })
  @Span()
  public async getSegments(params: z.infer<typeof getSegmentsQueryParams>) {
    this.incrementActionCounter('segments', 'estimates');

    try {
      const { data, status } = await this.callFactsetApiWithMetrics(
        'segments',
        'estimates',
        getSegments,
        params,
      );

      this.logger.log({
        msg: 'FactSet Segments Estimates HTTP Response',
        status,
      });
      return data;
    } catch (error) {
      this.incrementActionFailureCounter('segments', 'estimates', 'factset_api_error');
      this.logger.error({
        msg: 'Failed to get FactSet segments estimates',
        error: serializeError(normalizeError(error)),
      });
      throw new InternalServerErrorException(error);
    }
  }
}
