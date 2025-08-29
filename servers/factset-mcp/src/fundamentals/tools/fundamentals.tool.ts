import { Tool } from '@unique-ag/mcp-server-module';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { MetricService, Span } from 'nestjs-otel';
import { serializeError } from 'serialize-error-cjs';
import * as z from 'zod';
import { FactsetClientCredentials } from '../../auth/factset.client-credentials';
import { BaseFactsetTool } from '../../base-factset.tool';
import { normalizeError } from '../../utils/normalize-error';
import { getFdsFundamentals } from '../@generated/factset-fundamentals/factset-fundamentals';
import { getFdsFundamentalsQueryParams } from '../@generated/factset-fundamentals/factset-fundamentals.zod';

// Batch requests are complicated to deal with for agents, so we disable them for now.
const customFdsFundamentalsQueryParams = getFdsFundamentalsQueryParams.omit({ batch: true });

@Injectable()
export class FundamentalsTool extends BaseFactsetTool {
  private readonly logger = new Logger(this.constructor.name);

  public constructor(factsetCredentials: FactsetClientCredentials, metricService: MetricService) {
    super(factsetCredentials, metricService);
  }

  @Tool({
    name: 'fundamentals_fundamentals',
    title: '[Fundamentals API] Fundamentals',
    description:
      'Retrieves FactSet Fundamental standardized data for specified securities. Use the fundamentals_metrics tool to retrieve a full list of valid metrics or data items.',
    parameters: customFdsFundamentalsQueryParams,
    annotations: {
      title: '[Fundamentals API] Fundamentals',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    _meta: {
      'unique.app/icon': 'chart-line',
    },
  })
  @Span()
  public async getFundamentals(params: z.infer<typeof customFdsFundamentalsQueryParams>) {
    this.incrementActionCounter('get_fundamentals');

    try {
      const { data, status } = await getFdsFundamentals(
        params,
        await this.getFactsetRequestOptions(),
      );
      this.logger.log({
        msg: 'FactSet Fundamentals HTTP Response',
        status,
      });
      return data;
    } catch (error) {
      this.incrementActionFailureCounter('get_fundamentals', 'factset_api_error');
      this.logger.error({
        msg: 'Failed to get FactSet fundamentals',
        error: serializeError(normalizeError(error)),
      });
      throw new InternalServerErrorException(error);
    }
  }
}
