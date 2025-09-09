import { Tool } from '@unique-ag/mcp-server-module';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { MetricService, Span } from 'nestjs-otel';
import { serializeError } from 'serialize-error-cjs';
import * as z from 'zod';
import { FactsetClientCredentials } from '../../auth/factset.client-credentials';
import { BaseFactsetTool } from '../../base-factset.tool';
import { normalizeError } from '../../utils/normalize-error';
import { getFdsProfiles } from '../@generated/company-reports/company-reports';
import { getFdsProfilesQueryParams } from '../@generated/company-reports/company-reports.zod';

@Injectable()
export class CompanyProfileTool extends BaseFactsetTool {
  private readonly logger = new Logger(this.constructor.name);

  public constructor(factsetCredentials: FactsetClientCredentials, metricService: MetricService) {
    super(factsetCredentials, metricService);
  }

  @Tool({
    name: 'fundamentals_company_reports_profile',
    title: '[Fundamentals API] Company Reports: Profile',
    description:
      'Retrieves comprehensive company profile information including company name, headquarters address, industry classification, sector, CEO, business summary, exchange listing, market capitalization, shares outstanding, P/E ratio, year founded, number of employees, and contact details. Accepts up to 50 securities per request.',
    parameters: getFdsProfilesQueryParams,
    annotations: {
      title: '[Fundamentals API] Company Reports: Profile',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    _meta: {
      'unique.app/icon': 'building-2',
      'unique.app/system-prompt':
        'Use this tool to get comprehensive company overview and profile information. Returns details such as company name, physical address (including street, city, state, country, zip), contact information (phone, website), industry and sector classification (using RBIC system), key personnel (CEO), business summary, founding year, employee count, exchange listing, and key financial metrics (market cap, shares outstanding, P/E ratio). This is ideal for company research, due diligence, or when you need basic company information. Limited to 50 companies per request.',
    },
  })
  @Span()
  public async getCompanyProfile(params: z.infer<typeof getFdsProfilesQueryParams>) {
    this.incrementActionCounter('company-reports/profile', 'fundamentals');

    try {
      const { data, status } = await this.callFactsetApiWithMetrics(
        'company-reports/profile',
        'fundamentals',
        getFdsProfiles,
        params,
      );
      this.logger.log({
        msg: 'FactSet Company Profile HTTP Response',
        status,
      });
      return data;
    } catch (error) {
      this.incrementActionFailureCounter(
        'company-reports/profile',
        'fundamentals',
        'factset_api_error',
      );
      this.logger.error({
        msg: 'Failed to get FactSet company profile',
        error: serializeError(normalizeError(error)),
      });
      throw new InternalServerErrorException(error);
    }
  }
}
