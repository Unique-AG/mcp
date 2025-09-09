import { Tool } from '@unique-ag/mcp-server-module';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { MetricService, Span } from 'nestjs-otel';
import { serializeError } from 'serialize-error-cjs';
import * as z from 'zod';
import { FactsetClientCredentials } from '../../auth/factset.client-credentials';
import { BaseFactsetTool } from '../../base-factset.tool';
import { normalizeError } from '../../utils/normalize-error';
import { getSegmentActuals } from '../@generated/segment-actuals/segment-actuals';
import { getSegmentActualsQueryParams } from '../@generated/segment-actuals/segment-actuals.zod';

@Injectable()
export class SegmentActualsTool extends BaseFactsetTool {
  private readonly logger = new Logger(this.constructor.name);

  public constructor(factsetCredentials: FactsetClientCredentials, metricService: MetricService) {
    super(factsetCredentials, metricService);
  }

  @Tool({
    name: 'estimates_segment_actuals',
    title: '[Estimates API] Segment Actual Results',
    description:
      'Retrieves actual reported segment-level financial results. Provides historical segment performance broken down by business units or geographic regions, useful for comparing against segment estimates.',
    parameters: getSegmentActualsQueryParams,
    annotations: {
      title: '[Estimates API] Segment Actual Results',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    _meta: {
      'unique.app/icon': 'chart-bar',
      'unique.app/system-prompt':
        'Use this tool to get actual reported segment-level financial results. Returns historical segment performance for business units (BUS) or geographic regions (GEO). Provides actual values for metrics like segment revenue and operating income. Essential for analyzing segment performance trends, comparing actual results against estimates, and understanding business unit contributions.',
    },
  })
  @Span()
  public async getSegmentActuals(params: z.infer<typeof getSegmentActualsQueryParams>) {
    this.incrementActionCounter('segment-actuals', 'estimates');

    try {
      const { data, status } = await this.callFactsetApiWithMetrics(
        'segment-actuals',
        'estimates',
        getSegmentActuals,
        params,
      );

      this.logger.log({
        msg: 'FactSet Segment Actuals HTTP Response',
        status,
      });
      return data;
    } catch (error) {
      this.incrementActionFailureCounter('segment-actuals', 'estimates', 'factset_api_error');
      this.logger.error({
        msg: 'Failed to get FactSet segment actuals',
        error: serializeError(normalizeError(error)),
      });
      throw new InternalServerErrorException(error);
    }
  }
}
