import { Tool } from '@unique-ag/mcp-server-module';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { MetricService, Span } from 'nestjs-otel';
import { serializeError } from 'serialize-error-cjs';
import * as z from 'zod';
import { FactsetClientCredentials } from '../../auth/factset.client-credentials';
import { BaseFactsetTool } from '../../base-factset.tool';
import { normalizeError } from '../../utils/normalize-error';
import { getFixedConsensus, getRollingConsensus } from '../@generated/consensus/consensus';
import {
  getFixedConsensusQueryParams,
  getRollingConsensusQueryParams,
} from '../@generated/consensus/consensus.zod';

@Injectable()
export class ConsensusTool extends BaseFactsetTool {
  private readonly logger = new Logger(this.constructor.name);

  public constructor(factsetCredentials: FactsetClientCredentials, metricService: MetricService) {
    super(factsetCredentials, metricService);
  }

  @Tool({
    name: 'estimates_rolling_consensus',
    title: '[Estimates API] Rolling Consensus Estimates',
    description:
      'Retrieves rolling consensus estimates for specified securities. Rolling consensus provides continuously updated analyst estimates that roll forward as new data becomes available. Returns mean, median, and standard deviation of estimates for various metrics like EPS, revenue, and other financial measures.',
    parameters: getRollingConsensusQueryParams,
    annotations: {
      title: '[Estimates API] Rolling Consensus Estimates',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    _meta: {
      'unique.app/icon': 'trending-up',
      'unique.app/system-prompt':
        'Use this tool to get rolling consensus analyst estimates that are continuously updated. Rolling consensus moves forward with the latest available estimates and is ideal for tracking current market expectations. Returns aggregated statistics (mean, median, standard deviation, high, low, count) for financial metrics like EPS, revenue, EBITDA, etc. Specify the metric using the metrics parameter, periodicity (ANN, QTR, SEMI), and date range. Use LOCAL for reporting currency or specify ISO codes.',
    },
  })
  @Span()
  public async getRollingConsensus(params: z.infer<typeof getRollingConsensusQueryParams>) {
    this.incrementActionCounter('consensus/rolling', 'estimates');

    try {
      const { data, status } = await this.callFactsetApiWithMetrics(
        'consensus/rolling',
        'estimates',
        getRollingConsensus,
        params,
      );

      this.logger.log({
        msg: 'FactSet Rolling Consensus HTTP Response',
        status,
      });
      return data;
    } catch (error) {
      this.incrementActionFailureCounter('consensus/rolling', 'estimates', 'factset_api_error');
      this.logger.error({
        msg: 'Failed to get FactSet rolling consensus',
        error: serializeError(normalizeError(error)),
      });
      throw new InternalServerErrorException(error);
    }
  }

  @Tool({
    name: 'estimates_fixed_consensus',
    title: '[Estimates API] Fixed Consensus Estimates',
    description:
      'Retrieves fixed consensus estimates for specified securities. Fixed consensus provides point-in-time analyst estimates as they existed on specific dates, useful for historical analysis and backtesting.',
    parameters: getFixedConsensusQueryParams,
    annotations: {
      title: '[Estimates API] Fixed Consensus Estimates',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    _meta: {
      'unique.app/icon': 'calendar-check',
      'unique.app/system-prompt':
        'Use this tool to get fixed consensus analyst estimates as they existed at specific points in time. Fixed consensus captures the state of estimates on particular dates and is ideal for historical analysis, backtesting, or understanding how expectations evolved. Returns aggregated statistics for financial metrics at the specified consensus date. Use the consensusStartDate and consensusEndDate to define the period of consensus dates to retrieve.',
    },
  })
  @Span()
  public async getFixedConsensus(params: z.infer<typeof getFixedConsensusQueryParams>) {
    this.incrementActionCounter('consensus/fixed', 'estimates');

    try {
      const { data, status } = await this.callFactsetApiWithMetrics(
        'consensus/fixed',
        'estimates',
        getFixedConsensus,
        params,
      );

      this.logger.log({
        msg: 'FactSet Fixed Consensus HTTP Response',
        status,
      });
      return data;
    } catch (error) {
      this.incrementActionFailureCounter('consensus/fixed', 'estimates', 'factset_api_error');
      this.logger.error({
        msg: 'Failed to get FactSet fixed consensus',
        error: serializeError(normalizeError(error)),
      });
      throw new InternalServerErrorException(error);
    }
  }
}
