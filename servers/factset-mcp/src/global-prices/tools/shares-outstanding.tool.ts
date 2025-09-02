import { Tool } from '@unique-ag/mcp-server-module';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { MetricService, Span } from 'nestjs-otel';
import { serializeError } from 'serialize-error-cjs';
import * as z from 'zod';
import { FactsetClientCredentials } from '../../auth/factset.client-credentials';
import { BaseFactsetTool } from '../../base-factset.tool';
import { normalizeError } from '../../utils/normalize-error';
import { getSharesOutstanding } from '../@generated/shares-outstanding/shares-outstanding';
import { getSharesOutstandingQueryParams } from '../@generated/shares-outstanding/shares-outstanding.zod';

// Batch requests are complicated to deal with for agents, so we disable them for now.
const customSharesOutstandingQueryParams = getSharesOutstandingQueryParams.omit({ batch: true });

@Injectable()
export class SharesOutstandingTool extends BaseFactsetTool {
  private readonly logger = new Logger(this.constructor.name);

  public constructor(factsetCredentials: FactsetClientCredentials, metricService: MetricService) {
    super(factsetCredentials, metricService);
  }

  @Tool({
    name: 'global_prices_shares_outstanding',
    title: '[Global Prices API] Shares Outstanding',
    description:
      'Retrieves shares outstanding data for securities. Returns the number of shares currently held by all shareholders, essential for market capitalization calculations and per-share metrics.',
    parameters: customSharesOutstandingQueryParams,
    annotations: {
      title: '[Global Prices API] Shares Outstanding',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    _meta: {
      'unique.app/icon': 'coins',
      'unique.app/system-prompt':
        'Use this tool to get shares outstanding data for securities. Returns the total number of shares issued and currently held by shareholders, including restricted shares but excluding treasury shares. Essential for calculating market capitalization, earnings per share, and other per-share metrics. Provides historical shares outstanding to track dilution, buybacks, and capital changes over time. Can retrieve point-in-time or time series data.',
    },
  })
  @Span()
  public async getSharesOutstanding(params: z.infer<typeof customSharesOutstandingQueryParams>) {
    this.incrementActionCounter('shares-outstanding', 'global-prices');

    try {
      const { data, status } = await this.callFactsetApiWithMetrics(
        'shares-outstanding',
        'global-prices',
        getSharesOutstanding,
        params,
      );

      this.logger.log({
        msg: 'FactSet Shares Outstanding HTTP Response',
        status,
      });
      return data;
    } catch (error) {
      this.incrementActionFailureCounter('shares-outstanding', 'global-prices', 'factset_api_error');
      this.logger.error({
        msg: 'Failed to get FactSet shares outstanding',
        error: serializeError(normalizeError(error)),
      });
      throw new InternalServerErrorException(error);
    }
  }
}
