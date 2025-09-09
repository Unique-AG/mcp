import { Tool } from '@unique-ag/mcp-server-module';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { MetricService, Span } from 'nestjs-otel';
import { serializeError } from 'serialize-error-cjs';
import * as z from 'zod';
import { FactsetClientCredentials } from '../../auth/factset.client-credentials';
import { BaseFactsetTool } from '../../base-factset.tool';
import { normalizeError } from '../../utils/normalize-error';
import { getFdsFundamentals } from '../@generated/factset-fundamentals/factset-fundamentals';
import { getFdsFundamentalsQueryParams } from '../@generated/factset-fundamentals/factset-fundamentals.zod';

// Batch requests are complicated to deal with for agents, so we disable them for now.
const customFdsFundamentalsQueryParams = getFdsFundamentalsQueryParams.omit({ batch: true });

@Injectable()
export class FundamentalsTool extends BaseFactsetTool {
  private readonly logger = new Logger(this.constructor.name);

  public constructor(factsetCredentials: FactsetClientCredentials, metricService: MetricService) {
    super(factsetCredentials, metricService);
  }

  @Tool({
    name: 'fundamentals_fundamentals',
    title: '[Fundamentals API] Fundamentals Data',
    description:
      'Retrieves FactSet Fundamental standardized data for specified securities. Returns specific fundamental data items (metrics) for multiple securities across requested date ranges. Use the fundamentals_metrics tool first to discover available FF_* metrics.',
    parameters: customFdsFundamentalsQueryParams,
    annotations: {
      title: '[Fundamentals API] Fundamentals Data',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    _meta: {
      'unique.app/icon': 'chart-line',
      'unique.app/system-prompt':
        'Use this tool to retrieve specific FactSet Fundamental data items (FF_* metrics) for securities. You must specify valid metric codes which can be discovered using the fundamentals_metrics tool. Supports multiple securities (up to 250 without batching) and various periodicities (annual, quarterly, semi-annual with original or restated data). Can retrieve point-in-time data using fiscalPeriodStart/End or specific dates using date parameter. Results include the requested metric values along with metadata like currency, frequency, and fiscal period information. This is the primary tool for accessing standardized fundamental data across companies.',
    },
  })
  @Span()
  public async getFundamentals(params: z.infer<typeof customFdsFundamentalsQueryParams>) {
    this.incrementActionCounter('fundamentals', 'fundamentals');

    try {
      const { data, status } = await this.callFactsetApiWithMetrics(
        'fundamentals',
        'fundamentals',
        getFdsFundamentals,
        params,
      );
      this.logger.log({
        msg: 'FactSet Fundamentals HTTP Response',
        status,
      });
      return data;
    } catch (error) {
      this.incrementActionFailureCounter('fundamentals', 'fundamentals', 'factset_api_error');
      this.logger.error({
        msg: 'Failed to get FactSet fundamentals',
        error: serializeError(normalizeError(error)),
      });
      throw new InternalServerErrorException(error);
    }
  }
}
