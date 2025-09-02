import { Tool } from '@unique-ag/mcp-server-module';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { MetricService, Span } from 'nestjs-otel';
import { serializeError } from 'serialize-error-cjs';
import * as z from 'zod';
import { FactsetClientCredentials } from '../../auth/factset.client-credentials';
import { BaseFactsetTool } from '../../base-factset.tool';
import { normalizeError } from '../../utils/normalize-error';
import { getStreetAccountFilters } from '../@generated/filters/filters';

const filtersQueryParams = z.object({
  _attributes: z.array(z.enum(['structured', 'flattened'])).optional(),
});

@Injectable()
export class FiltersTool extends BaseFactsetTool {
  private readonly logger = new Logger(this.constructor.name);

  public constructor(factsetCredentials: FactsetClientCredentials, metricService: MetricService) {
    super(factsetCredentials, metricService);
  }

  @Tool({
    name: 'street_account_news_filters',
    title: '[Street Account News API] Available News Filters',
    description:
      'Discovers available news filters and categories. Returns comprehensive filter options including regions, sectors, topics, and categories that can be used to refine news headline searches.',
    parameters: filtersQueryParams,
    annotations: {
      title: '[Street Account News API] Available News Filters',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    _meta: {
      'unique.app/icon': 'settings-2',
      'unique.app/system-prompt':
        'Use this tool to discover available StreetAccount news filters and categories. Returns filter metadata including available regions (e.g., North America, Europe, Asia), sectors (e.g., Technology, Healthcare, Financials), topics (e.g., Earnings, M&A, IPOs), and news categories. Essential for understanding what filtering options are available before querying headlines. Helps construct precise news queries.',
    },
  })
  @Span()
  public async getFilters(params: z.infer<typeof filtersQueryParams>) {
    this.incrementActionCounter('filters', 'street-account-news');

    try {
      const { data, status } = await this.callFactsetApiWithMetrics(
        'filters',
        'street-account-news',
        getStreetAccountFilters,
        params,
      );

      this.logger.log({
        msg: 'FactSet Street Account Filters HTTP Response',
        status,
      });
      return data;
    } catch (error) {
      this.incrementActionFailureCounter('filters', 'street-account-news', 'factset_api_error');
      this.logger.error({
        msg: 'Failed to get FactSet street account filters',
        error: serializeError(normalizeError(error)),
      });
      throw new InternalServerErrorException(error);
    }
  }
}
