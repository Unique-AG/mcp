import { Tool } from '@unique-ag/mcp-server-module';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { MetricService, Span } from 'nestjs-otel';
import { serializeError } from 'serialize-error-cjs';
import * as z from 'zod';
import { FactsetClientCredentials } from '../../auth/factset.client-credentials';
import { BaseFactsetTool } from '../../base-factset.tool';
import { normalizeError } from '../../utils/normalize-error';
import { getConsensusRatings, getDetailRatings } from '../@generated/ratings/ratings';
import {
  getConsensusRatingsQueryParams,
  getDetailRatingsQueryParams,
} from '../@generated/ratings/ratings.zod';

@Injectable()
export class RatingsTool extends BaseFactsetTool {
  private readonly logger = new Logger(this.constructor.name);

  public constructor(factsetCredentials: FactsetClientCredentials, metricService: MetricService) {
    super(factsetCredentials, metricService);
  }

  @Tool({
    name: 'estimates_consensus_ratings',
    title: '[Estimates API] Consensus Analyst Ratings',
    description:
      'Retrieves aggregated analyst ratings and recommendations for securities. Returns consensus buy/hold/sell ratings, average ratings scores, and the distribution of analyst recommendations.',
    parameters: getConsensusRatingsQueryParams,
    annotations: {
      title: '[Estimates API] Consensus Analyst Ratings',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    _meta: {
      'unique.app/icon': 'star',
      'unique.app/system-prompt':
        'Use this tool to get consensus analyst ratings and recommendations. Returns aggregated rating statistics including the number of buy/hold/sell recommendations, average rating score, and rating distribution. Useful for assessing overall analyst sentiment, identifying highly-rated stocks, and tracking rating changes over time. Includes both current ratings and historical rating trends.',
    },
  })
  @Span()
  public async getConsensusRatings(params: z.infer<typeof getConsensusRatingsQueryParams>) {
    this.incrementActionCounter('ratings/consensus', 'estimates');

    try {
      const { data, status } = await this.callFactsetApiWithMetrics(
        'ratings/consensus',
        'estimates',
        getConsensusRatings,
        params,
      );

      this.logger.log({
        msg: 'FactSet Consensus Ratings HTTP Response',
        status,
      });
      return data;
    } catch (error) {
      this.incrementActionFailureCounter('ratings/consensus', 'estimates', 'factset_api_error');
      this.logger.error({
        msg: 'Failed to get FactSet consensus ratings',
        error: serializeError(normalizeError(error)),
      });
      throw new InternalServerErrorException(error);
    }
  }

  @Tool({
    name: 'estimates_detail_ratings',
    title: '[Estimates API] Detailed Analyst Ratings',
    description:
      'Retrieves detailed individual analyst ratings and recommendations from specific brokers. Provides broker-level detail including individual analyst names, their ratings, price targets, and rating dates.',
    parameters: getDetailRatingsQueryParams,
    annotations: {
      title: '[Estimates API] Detailed Analyst Ratings',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    _meta: {
      'unique.app/icon': 'users',
      'unique.app/system-prompt':
        'Use this tool to get detailed analyst ratings from individual brokers and analysts. Returns specific broker recommendations, analyst names, rating actions (upgrade/downgrade/initiate), price targets, and rating dates. Useful for tracking individual analyst opinions, identifying rating changes, and understanding the range of views across different brokers. Can filter by specific brokers using includeIds.',
    },
  })
  @Span()
  public async getDetailRatings(params: z.infer<typeof getDetailRatingsQueryParams>) {
    this.incrementActionCounter('ratings/detail', 'estimates');

    try {
      const { data, status } = await this.callFactsetApiWithMetrics(
        'ratings/detail',
        'estimates',
        getDetailRatings,
        params,
      );

      this.logger.log({
        msg: 'FactSet Detail Ratings HTTP Response',
        status,
      });
      return data;
    } catch (error) {
      this.incrementActionFailureCounter('ratings/detail', 'estimates', 'factset_api_error');
      this.logger.error({
        msg: 'Failed to get FactSet detail ratings',
        error: serializeError(normalizeError(error)),
      });
      throw new InternalServerErrorException(error);
    }
  }
}
