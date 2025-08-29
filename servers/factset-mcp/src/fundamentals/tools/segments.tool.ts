import { Tool } from '@unique-ag/mcp-server-module';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { MetricService, Span } from 'nestjs-otel';
import { serializeError } from 'serialize-error-cjs';
import * as z from 'zod';
import { FactsetClientCredentials } from '../../auth/factset.client-credentials';
import { BaseFactsetTool } from '../../base-factset.tool';
import { normalizeError } from '../../utils/normalize-error';
import { getFdsSegments } from '../@generated/segments/segments';
import { getFdsSegmentsQueryParams } from '../@generated/segments/segments.zod';

// Batch requests are complicated to deal with for agents, so we disable them for now.
const customSegmentsQueryParams = getFdsSegmentsQueryParams.omit({ batch: true });

@Injectable()
export class SegmentsTool extends BaseFactsetTool {
  private readonly logger = new Logger(this.constructor.name);

  public constructor(factsetCredentials: FactsetClientCredentials, metricService: MetricService) {
    super(factsetCredentials, metricService);
  }

  @Tool({
    name: 'fundamentals_segments',
    title: '[Fundamentals API] Company Segments',
    description:
      'Retrieves company segment data (business or geographic) with financial metrics like sales, operating income, assets, depreciation, and capital expenditures. Segments provide a breakdown of company performance by business lines or geographic regions, offering insights into revenue sources and operational focus areas.',
    parameters: customSegmentsQueryParams,
    annotations: {
      title: '[Fundamentals API] Company Segments',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    _meta: {
      'unique.app/icon': 'chart-pie',
      'unique.app/system-prompt':
        'Use this tool to analyze company segment performance across business lines or geographic regions. Business segments (BUS) show revenue and metrics broken down by different business units or product lines. Geographic segments (GEO) show the same metrics broken down by geographic regions. Available metrics include SALES (Revenue), OPINC (Operating Income), ASSETS (Total Assets), DEP (Depreciation), and CAPEX (Capital Expenditures). This is useful for understanding revenue diversification, identifying key business drivers, and assessing geographic exposure.',
    },
  })
  @Span()
  public async getSegments(params: z.infer<typeof customSegmentsQueryParams>) {
    this.incrementActionCounter('fundamentals_segments');

    try {
      const { data, status } = await getFdsSegments(
        params,
        await this.getFactsetRequestOptions(),
      );
      this.logger.log({
        msg: 'FactSet Segments HTTP Response',
        status,
      });
      return data;
    } catch (error) {
      this.incrementActionFailureCounter('fundamentals_segments', 'factset_api_error');
      this.logger.error({
        msg: 'Failed to get FactSet segments',
        error: serializeError(normalizeError(error)),
      });
      throw new InternalServerErrorException(error);
    }
  }
}
