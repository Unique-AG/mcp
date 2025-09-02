import { Tool } from '@unique-ag/mcp-server-module';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { MetricService, Span } from 'nestjs-otel';
import { serializeError } from 'serialize-error-cjs';
import * as z from 'zod';
import { FactsetClientCredentials } from '../../auth/factset.client-credentials';
import { BaseFactsetTool } from '../../base-factset.tool';
import { normalizeError } from '../../utils/normalize-error';
import {
  getAnalystRatings,
  getEstimates,
  getEstimateTypes,
  getSurpriseHistory,
} from '../@generated/estimates-and-ratings-reports/estimates-and-ratings-reports';
import {
  getAnalystRatingsQueryParams,
  getEstimatesQueryParams,
  getSurpriseHistoryQueryParams,
} from '../@generated/estimates-and-ratings-reports/estimates-and-ratings-reports.zod';

@Injectable()
export class EstimatesReportsTool extends BaseFactsetTool {
  private readonly logger = new Logger(this.constructor.name);

  public constructor(factsetCredentials: FactsetClientCredentials, metricService: MetricService) {
    super(factsetCredentials, metricService);
  }

  @Tool({
    name: 'estimates_analyst_ratings_report',
    title: '[Estimates API] Analyst Ratings Report',
    description:
      'Generates comprehensive analyst ratings reports for securities. Returns formatted reports with rating distributions, consensus recommendations, and recent rating changes.',
    parameters: getAnalystRatingsQueryParams,
    annotations: {
      title: '[Estimates API] Analyst Ratings Report',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    _meta: {
      'unique.app/icon': 'file-text',
      'unique.app/system-prompt':
        'Use this tool to generate analyst ratings reports. Returns comprehensive rating summaries including current consensus rating, rating distribution (buy/hold/sell counts), recent rating changes, and price target information. Formatted for easy presentation and analysis. Ideal for investment reports and rating overviews.',
    },
  })
  @Span()
  public async getAnalystRatingsReport(params: z.infer<typeof getAnalystRatingsQueryParams>) {
    this.incrementActionCounter('reports/analyst-ratings', 'estimates');

    try {
      const { data, status } = await this.callFactsetApiWithMetrics(
        'reports/analyst-ratings',
        'estimates',
        getAnalystRatings,
        params,
      );

      this.logger.log({
        msg: 'FactSet Analyst Ratings Report HTTP Response',
        status,
      });
      return data;
    } catch (error) {
      this.incrementActionFailureCounter(
        'reports/analyst-ratings',
        'estimates',
        'factset_api_error',
      );
      this.logger.error({
        msg: 'Failed to get FactSet analyst ratings report',
        error: serializeError(normalizeError(error)),
      });
      throw new InternalServerErrorException(error);
    }
  }

  @Tool({
    name: 'estimates_estimates_report',
    title: '[Estimates API] Estimates Summary Report',
    description:
      'Generates comprehensive estimates reports for securities. Returns formatted reports with consensus estimates, recent revisions, and estimate trends across multiple periods.',
    parameters: getEstimatesQueryParams,
    annotations: {
      title: '[Estimates API] Estimates Summary Report',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    _meta: {
      'unique.app/icon': 'file-bar-chart',
      'unique.app/system-prompt':
        'Use this tool to generate comprehensive estimates reports. Returns formatted summaries of consensus estimates for key metrics across multiple periods. Includes current estimates, recent revisions, number of estimates, and historical trends. Ideal for earnings previews and investment analysis reports.',
    },
  })
  @Span()
  public async getEstimatesReport(params: z.infer<typeof getEstimatesQueryParams>) {
    this.incrementActionCounter('reports/estimates', 'estimates');

    try {
      const { data, status } = await this.callFactsetApiWithMetrics(
        'reports/estimates',
        'estimates',
        getEstimates,
        params,
      );

      this.logger.log({
        msg: 'FactSet Estimates Report HTTP Response',
        status,
      });
      return data;
    } catch (error) {
      this.incrementActionFailureCounter('reports/estimates', 'estimates', 'factset_api_error');
      this.logger.error({
        msg: 'Failed to get FactSet estimates report',
        error: serializeError(normalizeError(error)),
      });
      throw new InternalServerErrorException(error);
    }
  }

  @Tool({
    name: 'estimates_surprise_history_report',
    title: '[Estimates API] Earnings Surprise History Report',
    description:
      'Generates historical earnings surprise reports. Returns formatted reports showing patterns of earnings beats and misses over multiple periods with surprise percentages and trends.',
    parameters: getSurpriseHistoryQueryParams,
    annotations: {
      title: '[Estimates API] Earnings Surprise History Report',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    _meta: {
      'unique.app/icon': 'history',
      'unique.app/system-prompt':
        'Use this tool to generate earnings surprise history reports. Returns formatted historical data showing actual vs. estimated results over multiple periods. Includes surprise amounts, percentages, and patterns of beats/misses. Useful for analyzing earnings consistency and forecasting future surprises.',
    },
  })
  @Span()
  public async getSurpriseHistoryReport(params: z.infer<typeof getSurpriseHistoryQueryParams>) {
    this.incrementActionCounter('reports/surprise-history', 'estimates');

    try {
      const { data, status } = await this.callFactsetApiWithMetrics(
        'reports/surprise-history',
        'estimates',
        getSurpriseHistory,
        params,
      );

      this.logger.log({
        msg: 'FactSet Surprise History Report HTTP Response',
        status,
      });
      return data;
    } catch (error) {
      this.incrementActionFailureCounter(
        'reports/surprise-history',
        'estimates',
        'factset_api_error',
      );
      this.logger.error({
        msg: 'Failed to get FactSet surprise history report',
        error: serializeError(normalizeError(error)),
      });
      throw new InternalServerErrorException(error);
    }
  }

  @Tool({
    name: 'estimates_estimate_types',
    title: '[Estimates API] Available Estimate Types',
    description:
      'Discovers available estimate types and categories. Returns a list of estimate type codes and descriptions that can be used in other estimates endpoints.',
    parameters: z.object({}),
    annotations: {
      title: '[Estimates API] Available Estimate Types',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    _meta: {
      'unique.app/icon': 'list',
      'unique.app/system-prompt':
        'Use this tool to discover available estimate types and categories. Returns metadata about estimate types including codes, descriptions, and applicable metrics. Essential for understanding what types of estimates are available before querying specific estimate data.',
    },
  })
  @Span()
  public async getEstimateTypes() {
    this.incrementActionCounter('estimate-types', 'estimates');

    try {
      const { data, status } = await this.callFactsetApiWithMetrics(
        'estimate-types',
        'estimates',
        getEstimateTypes,
        {},
      );

      this.logger.log({
        msg: 'FactSet Estimate Types HTTP Response',
        status,
      });
      return data;
    } catch (error) {
      this.incrementActionFailureCounter('estimate-types', 'estimates', 'factset_api_error');
      this.logger.error({
        msg: 'Failed to get FactSet estimate types',
        error: serializeError(normalizeError(error)),
      });
      throw new InternalServerErrorException(error);
    }
  }
}
