import { Tool } from '@unique-ag/mcp-server-module';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { MetricService, Span } from 'nestjs-otel';
import { serializeError } from 'serialize-error-cjs';
import * as z from 'zod';
import { FactsetClientCredentials } from '../../auth/factset.client-credentials';
import { BaseFactsetTool } from '../../base-factset.tool';
import { normalizeError } from '../../utils/normalize-error';
import {
  getStreetAccountHeadlines,
  getStreetAccountHeadlinesByView,
} from '../@generated/headlines/headlines';
import {
  getStreetAccountHeadlinesBody,
  getStreetAccountHeadlinesByViewBody,
} from '../@generated/headlines/headlines.zod';

@Injectable()
export class HeadlinesTool extends BaseFactsetTool {
  private readonly logger = new Logger(this.constructor.name);

  public constructor(factsetCredentials: FactsetClientCredentials, metricService: MetricService) {
    super(factsetCredentials, metricService);
  }

  @Tool({
    name: 'street_account_news_headlines',
    title: '[Street Account News API] News Headlines',
    description:
      'Retrieves StreetAccount news headlines for specified securities and topics. Returns real-time news headlines with metadata including headline text, story details, publication time, categories, and related entities.',
    parameters: getStreetAccountHeadlinesBody,
    annotations: {
      title: '[Street Account News API] News Headlines',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    _meta: {
      'unique.app/icon': 'newspaper',
      'unique.app/system-prompt':
        'Use this tool to get real-time StreetAccount news headlines for securities and topics. Returns comprehensive news data including headline text, story details, publication timestamps, and categories. Can filter by tickers, date range, categories, regions, and topics. Supports pagination for large result sets. Ideal for news monitoring, sentiment analysis, and staying updated on market-moving events. Use predefined filters or custom search criteria.',
    },
  })
  @Span()
  public async getHeadlines(params: z.infer<typeof getStreetAccountHeadlinesBody>) {
    this.incrementActionCounter('headlines', 'street-account-news');

    try {
      const { data, status } = await this.callFactsetApiWithMetrics(
        'headlines',
        'street-account-news',
        getStreetAccountHeadlines,
        params,
      );

      this.logger.log({
        msg: 'FactSet Street Account Headlines HTTP Response',
        status,
      });
      return data;
    } catch (error) {
      this.incrementActionFailureCounter('headlines', 'street-account-news', 'factset_api_error');
      this.logger.error({
        msg: 'Failed to get FactSet street account headlines',
        error: serializeError(normalizeError(error)),
      });
      throw new InternalServerErrorException(error);
    }
  }

  @Tool({
    name: 'street_account_news_headlines_by_view',
    title: '[Street Account News API] News Headlines by View',
    description:
      'Retrieves StreetAccount news headlines using predefined views/filters. Views are curated collections of news based on specific criteria like top news, market movers, or specific sectors.',
    parameters: getStreetAccountHeadlinesByViewBody,
    annotations: {
      title: '[Street Account News API] News Headlines by View',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    _meta: {
      'unique.app/icon': 'filter',
      'unique.app/system-prompt':
        'Use this tool to get StreetAccount news headlines using predefined views. Views are curated news collections like "Top News", "Market Movers", "Earnings", etc. Simpler than custom filtering - just specify the view name to get relevant headlines. Returns the same comprehensive news data as regular headlines but filtered according to the view criteria. Use the views endpoint to discover available views.',
    },
  })
  @Span()
  public async getHeadlinesByView(params: z.infer<typeof getStreetAccountHeadlinesByViewBody>) {
    this.incrementActionCounter('headlines/by-view', 'street-account-news');

    try {
      const { data, status } = await this.callFactsetApiWithMetrics(
        'headlines/by-view',
        'street-account-news',
        getStreetAccountHeadlinesByView,
        params,
      );

      this.logger.log({
        msg: 'FactSet Street Account Headlines by View HTTP Response',
        status,
      });
      return data;
    } catch (error) {
      this.incrementActionFailureCounter(
        'headlines/by-view',
        'street-account-news',
        'factset_api_error',
      );
      this.logger.error({
        msg: 'Failed to get FactSet street account headlines by view',
        error: serializeError(normalizeError(error)),
      });
      throw new InternalServerErrorException(error);
    }
  }
}
