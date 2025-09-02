import { Tool } from '@unique-ag/mcp-server-module';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { MetricService, Span } from 'nestjs-otel';
import { serializeError } from 'serialize-error-cjs';
import * as z from 'zod';
import { FactsetClientCredentials } from '../../auth/factset.client-credentials';
import { BaseFactsetTool } from '../../base-factset.tool';
import { normalizeError } from '../../utils/normalize-error';
import { getReturns } from '../@generated/returns/returns';
import { getReturnsQueryParams } from '../@generated/returns/returns.zod';

// Batch requests are complicated to deal with for agents, so we disable them for now.
const customReturnsQueryParams = getReturnsQueryParams.omit({ batch: true });

@Injectable()
export class ReturnsTool extends BaseFactsetTool {
  private readonly logger = new Logger(this.constructor.name);

  public constructor(factsetCredentials: FactsetClientCredentials, metricService: MetricService) {
    super(factsetCredentials, metricService);
  }

  @Tool({
    name: 'global_prices_returns',
    title: '[Global Prices API] Total Returns',
    description:
      'Calculates total return performance for securities over various time periods. Returns cumulative and annualized returns including dividends and other distributions, essential for performance measurement and comparison.',
    parameters: customReturnsQueryParams,
    annotations: {
      title: '[Global Prices API] Total Returns',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    _meta: {
      'unique.app/icon': 'trending-up-down',
      'unique.app/system-prompt':
        'Use this tool to calculate total returns for securities including price appreciation and dividends. Returns both cumulative and annualized performance over standard periods (1D, 1W, 1M, 3M, 6M, YTD, 1Y, 3Y, 5Y, 10Y, ITD). Essential for performance analysis, peer comparison, and portfolio evaluation. Specify return type (GROSS for total return, NET for after-tax, PRICE for price-only) and frequency. Results include both absolute returns and annualized rates for multi-period calculations.',
    },
  })
  @Span()
  public async getReturns(params: z.infer<typeof customReturnsQueryParams>) {
    this.incrementActionCounter('returns', 'global-prices');

    try {
      const { data, status } = await this.callFactsetApiWithMetrics(
        'returns',
        'global-prices',
        getReturns,
        params,
      );

      this.logger.log({
        msg: 'FactSet Returns HTTP Response',
        status,
      });
      return data;
    } catch (error) {
      this.incrementActionFailureCounter('returns', 'global-prices', 'factset_api_error');
      this.logger.error({
        msg: 'Failed to get FactSet returns',
        error: serializeError(normalizeError(error)),
      });
      throw new InternalServerErrorException(error);
    }
  }
}
