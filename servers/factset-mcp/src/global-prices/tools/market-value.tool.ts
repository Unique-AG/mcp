import { Tool } from '@unique-ag/mcp-server-module';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { MetricService, Span } from 'nestjs-otel';
import { serializeError } from 'serialize-error-cjs';
import * as z from 'zod';
import { FactsetClientCredentials } from '../../auth/factset.client-credentials';
import { BaseFactsetTool } from '../../base-factset.tool';
import { normalizeError } from '../../utils/normalize-error';
import { getGPDMarketVal } from '../@generated/market-value/market-value';
import { getGPDMarketValQueryParams } from '../@generated/market-value/market-value.zod';

// Batch requests are complicated to deal with for agents, so we disable them for now.
const customMarketValueQueryParams = getGPDMarketValQueryParams.omit({ batch: true });

@Injectable()
export class MarketValueTool extends BaseFactsetTool {
  private readonly logger = new Logger(this.constructor.name);

  public constructor(factsetCredentials: FactsetClientCredentials, metricService: MetricService) {
    super(factsetCredentials, metricService);
  }

  @Tool({
    name: 'global_prices_market_value',
    title: '[Global Prices API] Market Capitalization',
    description:
      'Calculates market capitalization and enterprise value for securities. Returns the total market value of outstanding shares and related valuation metrics essential for company size assessment and peer comparison.',
    parameters: customMarketValueQueryParams,
    annotations: {
      title: '[Global Prices API] Market Capitalization',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    _meta: {
      'unique.app/icon': 'building',
      'unique.app/system-prompt':
        'Use this tool to get market capitalization and enterprise value data. Market cap is calculated as share price multiplied by shares outstanding, representing the total market value of a company. Also returns enterprise value which includes debt and excludes cash for a more comprehensive valuation. Essential for company size classification (large-cap, mid-cap, small-cap), peer comparison, and valuation analysis. Can retrieve historical market cap to track company growth.',
    },
  })
  @Span()
  public async getMarketValue(params: z.infer<typeof customMarketValueQueryParams>) {
    this.incrementActionCounter('market-value', 'global-prices');

    try {
      const { data, status } = await this.callFactsetApiWithMetrics(
        'market-value',
        'global-prices',
        getGPDMarketVal,
        params,
      );

      this.logger.log({
        msg: 'FactSet Market Value HTTP Response',
        status,
      });
      return data;
    } catch (error) {
      this.incrementActionFailureCounter('market-value', 'global-prices', 'factset_api_error');
      this.logger.error({
        msg: 'Failed to get FactSet market value',
        error: serializeError(normalizeError(error)),
      });
      throw new InternalServerErrorException(error);
    }
  }
}
