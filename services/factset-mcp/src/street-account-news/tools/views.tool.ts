import { Tool } from '@unique-ag/mcp-server-module';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { MetricService, Span } from 'nestjs-otel';
import { serializeError } from 'serialize-error-cjs';
import * as z from 'zod';
import { FactsetClientCredentials } from '../../auth/factset.client-credentials';
import { BaseFactsetTool } from '../../base-factset.tool';
import { normalizeError } from '../../utils/normalize-error';
import { getStreetAccountViews } from '../@generated/views/views';

@Injectable()
export class ViewsTool extends BaseFactsetTool {
  private readonly logger = new Logger(this.constructor.name);

  public constructor(factsetCredentials: FactsetClientCredentials, metricService: MetricService) {
    super(factsetCredentials, metricService);
  }

  @Tool({
    name: 'street_account_news_views',
    title: '[Street Account News API] Available News Views',
    description:
      'Discovers available predefined news views and filters. Returns a list of curated news views that can be used to retrieve specific types of news headlines such as top stories, earnings news, M&A activity, etc.',
    parameters: z.object({}),
    annotations: {
      title: '[Street Account News API] Available News Views',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    _meta: {
      'unique.app/icon': 'eye',
      'unique.app/system-prompt':
        'Use this tool to discover available StreetAccount news views. Views are predefined filters for common news queries like "Top News", "Breaking News", "Earnings", "M&A", "Economic Indicators", etc. Returns view metadata including view names, descriptions, and update frequencies. Essential for finding the correct view identifier before using the headlines_by_view endpoint.',
    },
  })
  @Span()
  public async getViews() {
    this.incrementActionCounter('views', 'street-account-news');

    try {
      const { data, status } = await this.callFactsetApiWithMetrics(
        'views',
        'street-account-news',
        getStreetAccountViews,
        {},
      );

      this.logger.log({
        msg: 'FactSet Street Account Views HTTP Response',
        status,
      });
      return data;
    } catch (error) {
      this.incrementActionFailureCounter('views', 'street-account-news', 'factset_api_error');
      this.logger.error({
        msg: 'Failed to get FactSet street account views',
        error: serializeError(normalizeError(error)),
      });
      throw new InternalServerErrorException(error);
    }
  }
}
