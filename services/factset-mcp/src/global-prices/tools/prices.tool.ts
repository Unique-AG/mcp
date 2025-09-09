import { Tool } from '@unique-ag/mcp-server-module';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { MetricService, Span } from 'nestjs-otel';
import { serializeError } from 'serialize-error-cjs';
import * as z from 'zod';
import { FactsetClientCredentials } from '../../auth/factset.client-credentials';
import { BaseFactsetTool } from '../../base-factset.tool';
import { normalizeError } from '../../utils/normalize-error';
import { getGPDPrices } from '../@generated/prices/prices';
import { getGPDPricesQueryParams } from '../@generated/prices/prices.zod';

// Batch requests are complicated to deal with for agents, so we disable them for now.
const customPricesQueryParams = getGPDPricesQueryParams.omit({ batch: true });

@Injectable()
export class PricesTool extends BaseFactsetTool {
  private readonly logger = new Logger(this.constructor.name);

  public constructor(factsetCredentials: FactsetClientCredentials, metricService: MetricService) {
    super(factsetCredentials, metricService);
  }

  @Tool({
    name: 'global_prices_prices',
    title: '[Global Prices API] Security Prices',
    description:
      'Retrieves end-of-day pricing data for global securities. Returns comprehensive price information including open, high, low, close, volume, and adjusted prices for equities, ETFs, mutual funds, and other instruments across global markets.',
    parameters: customPricesQueryParams,
    annotations: {
      title: '[Global Prices API] Security Prices',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    _meta: {
      'unique.app/icon': 'chart-candlestick',
      'unique.app/system-prompt':
        'Use this tool to get end-of-day pricing data for securities globally. Returns OHLCV (Open, High, Low, Close, Volume) data along with adjusted prices for splits and dividends. Supports various price types including trade prices, bid/ask, and VWAP. Can retrieve single-day or historical time series data. Specify fields like PRICE_OPEN, PRICE_HIGH, PRICE_LOW, PRICE_CLOSE, VOLUME, PRICE_CLOSE_ADJ for adjusted close. Supports multiple frequencies (D=Daily, W=Weekly, M=Monthly, etc.) and currencies.',
    },
  })
  @Span()
  public async getPrices(params: z.infer<typeof customPricesQueryParams>) {
    this.incrementActionCounter('prices', 'global-prices');

    try {
      const { data, status } = await this.callFactsetApiWithMetrics(
        'prices',
        'global-prices',
        getGPDPrices,
        params,
      );

      this.logger.log({
        msg: 'FactSet Global Prices HTTP Response',
        status,
      });
      return data;
    } catch (error) {
      this.incrementActionFailureCounter('prices', 'global-prices', 'factset_api_error');
      this.logger.error({
        msg: 'Failed to get FactSet global prices',
        error: serializeError(normalizeError(error)),
      });
      throw new InternalServerErrorException(error);
    }
  }
}
