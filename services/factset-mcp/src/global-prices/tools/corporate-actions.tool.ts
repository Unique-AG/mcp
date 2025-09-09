import { Tool } from '@unique-ag/mcp-server-module';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { MetricService, Span } from 'nestjs-otel';
import { serializeError } from 'serialize-error-cjs';
import * as z from 'zod';
import { FactsetClientCredentials } from '../../auth/factset.client-credentials';
import { BaseFactsetTool } from '../../base-factset.tool';
import { normalizeError } from '../../utils/normalize-error';
import { getGPDCorporateActions } from '../@generated/corporate-actions/corporate-actions';
import { getGPDCorporateActionsQueryParams } from '../@generated/corporate-actions/corporate-actions.zod';

// Batch requests are complicated to deal with for agents, so we disable them for now.
const customCorporateActionsQueryParams = getGPDCorporateActionsQueryParams.omit({ batch: true });

@Injectable()
export class CorporateActionsTool extends BaseFactsetTool {
  private readonly logger = new Logger(this.constructor.name);

  public constructor(factsetCredentials: FactsetClientCredentials, metricService: MetricService) {
    super(factsetCredentials, metricService);
  }

  @Tool({
    name: 'global_prices_corporate_actions',
    title: '[Global Prices API] Corporate Actions',
    description:
      'Retrieves corporate action events including dividends, splits, spin-offs, mergers, and other capital changes. Essential for understanding historical price adjustments and distribution events.',
    parameters: customCorporateActionsQueryParams,
    annotations: {
      title: '[Global Prices API] Corporate Actions',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    _meta: {
      'unique.app/icon': 'git-branch',
      'unique.app/system-prompt':
        'Use this tool to get corporate action events for securities. Returns comprehensive data on dividends (cash and stock), stock splits, spin-offs, mergers, rights offerings, and other capital events. Includes event dates (announcement, ex-date, record date, payment date), adjustment factors, and distribution details. Essential for understanding price adjustments, calculating total returns, and tracking capital changes. Can filter by event type and date range.',
    },
  })
  @Span()
  public async getCorporateActions(params: z.infer<typeof customCorporateActionsQueryParams>) {
    this.incrementActionCounter('corporate-actions', 'global-prices');

    try {
      const { data, status } = await this.callFactsetApiWithMetrics(
        'corporate-actions',
        'global-prices',
        getGPDCorporateActions,
        params,
      );

      this.logger.log({
        msg: 'FactSet Corporate Actions HTTP Response',
        status,
      });
      return data;
    } catch (error) {
      this.incrementActionFailureCounter('corporate-actions', 'global-prices', 'factset_api_error');
      this.logger.error({
        msg: 'Failed to get FactSet corporate actions',
        error: serializeError(normalizeError(error)),
      });
      throw new InternalServerErrorException(error);
    }
  }
}
