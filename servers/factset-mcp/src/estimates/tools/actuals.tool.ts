import { Tool } from '@unique-ag/mcp-server-module';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { MetricService, Span } from 'nestjs-otel';
import { serializeError } from 'serialize-error-cjs';
import * as z from 'zod';
import { FactsetClientCredentials } from '../../auth/factset.client-credentials';
import { BaseFactsetTool } from '../../base-factset.tool';
import { normalizeError } from '../../utils/normalize-error';
import { getActuals } from '../@generated/actuals/actuals';
import { getActualsQueryParams } from '../@generated/actuals/actuals.zod';

@Injectable()
export class ActualsTool extends BaseFactsetTool {
  private readonly logger = new Logger(this.constructor.name);

  public constructor(factsetCredentials: FactsetClientCredentials, metricService: MetricService) {
    super(factsetCredentials, metricService);
  }

  @Tool({
    name: 'estimates_actuals',
    title: '[Estimates API] Reported Actuals',
    description:
      'Retrieves actual reported financial results for specified securities. Provides historical reported data that can be compared against estimates to analyze forecast accuracy and calculate surprise metrics.',
    parameters: getActualsQueryParams,
    annotations: {
      title: '[Estimates API] Reported Actuals',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    _meta: {
      'unique.app/icon': 'file-check',
      'unique.app/system-prompt':
        'Use this tool to get actual reported financial results for companies. Returns the reported values for metrics like EPS, revenue, EBITDA, etc. as announced by companies. Useful for comparing actual results against estimates, calculating earnings surprises, and analyzing historical performance. Specify the metric, periodicity (ANN, QTR, SEMI), and fiscal period range to retrieve actuals.',
    },
  })
  @Span()
  public async getActuals(params: z.infer<typeof getActualsQueryParams>) {
    this.incrementActionCounter('actuals', 'estimates');

    try {
      const { data, status } = await this.callFactsetApiWithMetrics(
        'actuals',
        'estimates',
        getActuals,
        params,
      );

      this.logger.log({
        msg: 'FactSet Actuals HTTP Response',
        status,
      });
      return data;
    } catch (error) {
      this.incrementActionFailureCounter('actuals', 'estimates', 'factset_api_error');
      this.logger.error({
        msg: 'Failed to get FactSet actuals',
        error: serializeError(normalizeError(error)),
      });
      throw new InternalServerErrorException(error);
    }
  }
}
