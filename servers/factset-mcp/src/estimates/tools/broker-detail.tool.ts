import { Tool } from '@unique-ag/mcp-server-module';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { MetricService, Span } from 'nestjs-otel';
import { serializeError } from 'serialize-error-cjs';
import * as z from 'zod';
import { FactsetClientCredentials } from '../../auth/factset.client-credentials';
import { BaseFactsetTool } from '../../base-factset.tool';
import { normalizeError } from '../../utils/normalize-error';
import { getFixedDetail, getRollingDetail } from '../@generated/broker-detail/broker-detail';
import { getFixedDetailQueryParams, getRollingDetailQueryParams } from '../@generated/broker-detail/broker-detail.zod';

@Injectable()
export class BrokerDetailTool extends BaseFactsetTool {
  private readonly logger = new Logger(this.constructor.name);

  public constructor(factsetCredentials: FactsetClientCredentials, metricService: MetricService) {
    super(factsetCredentials, metricService);
  }

  @Tool({
    name: 'estimates_rolling_broker_detail',
    title: '[Estimates API] Rolling Broker Detail Estimates',
    description:
      'Retrieves detailed broker-level estimates with rolling consensus. Provides individual broker estimates including analyst names, broker codes, and their specific forecasts for financial metrics.',
    parameters: getRollingDetailQueryParams,
    annotations: {
      title: '[Estimates API] Rolling Broker Detail Estimates',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    _meta: {
      'unique.app/icon': 'user-check',
      'unique.app/system-prompt':
        'Use this tool to get detailed broker-level estimates with rolling updates. Returns individual broker forecasts including broker identification, analyst details, estimate values, and estimate dates. Useful for understanding the range of estimates, identifying outliers, and tracking changes in individual broker forecasts. Can filter by specific brokers using includeIds parameter.',
    },
  })
  @Span()
  public async getRollingBrokerDetail(params: z.infer<typeof getRollingDetailQueryParams>) {
    this.incrementActionCounter('broker-detail/rolling', 'estimates');

    try {
      const { data, status } = await this.callFactsetApiWithMetrics(
        'broker-detail/rolling',
        'estimates',
        getRollingDetail,
        params,
      );

      this.logger.log({
        msg: 'FactSet Rolling Broker Detail HTTP Response',
        status,
      });
      return data;
    } catch (error) {
      this.incrementActionFailureCounter('broker-detail/rolling', 'estimates', 'factset_api_error');
      this.logger.error({
        msg: 'Failed to get FactSet rolling broker detail',
        error: serializeError(normalizeError(error)),
      });
      throw new InternalServerErrorException(error);
    }
  }

  @Tool({
    name: 'estimates_fixed_broker_detail',
    title: '[Estimates API] Fixed Broker Detail Estimates',
    description:
      'Retrieves detailed broker-level estimates at fixed points in time. Provides historical broker estimates as they existed on specific dates for backtesting and historical analysis.',
    parameters: getFixedDetailQueryParams,
    annotations: {
      title: '[Estimates API] Fixed Broker Detail Estimates',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    _meta: {
      'unique.app/icon': 'user-square',
      'unique.app/system-prompt':
        'Use this tool to get detailed broker-level estimates at fixed points in time. Returns historical broker forecasts as they existed on specific consensus dates. Essential for understanding how individual broker estimates evolved over time and for point-in-time analysis. Includes broker identification, estimate values, and the dates when estimates were made.',
    },
  })
  @Span()
  public async getFixedBrokerDetail(params: z.infer<typeof getFixedDetailQueryParams>) {
    this.incrementActionCounter('broker-detail/fixed', 'estimates');

    try {
      const { data, status } = await this.callFactsetApiWithMetrics(
        'broker-detail/fixed',
        'estimates',
        getFixedDetail,
        params,
      );

      this.logger.log({
        msg: 'FactSet Fixed Broker Detail HTTP Response',
        status,
      });
      return data;
    } catch (error) {
      this.incrementActionFailureCounter('broker-detail/fixed', 'estimates', 'factset_api_error');
      this.logger.error({
        msg: 'Failed to get FactSet fixed broker detail',
        error: serializeError(normalizeError(error)),
      });
      throw new InternalServerErrorException(error);
    }
  }
}
