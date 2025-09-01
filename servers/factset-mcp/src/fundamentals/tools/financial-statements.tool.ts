import { Tool } from '@unique-ag/mcp-server-module';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { MetricService, Span } from 'nestjs-otel';
import { serializeError } from 'serialize-error-cjs';
import * as z from 'zod';
import { FactsetClientCredentials } from '../../auth/factset.client-credentials';
import { BaseFactsetTool } from '../../base-factset.tool';
import { normalizeError } from '../../utils/normalize-error';
import { getFinancials } from '../@generated/company-reports/company-reports';
import { getFinancialsQueryParams } from '../@generated/company-reports/company-reports.zod';

@Injectable()
export class FinancialStatementsTool extends BaseFactsetTool {
  private readonly logger = new Logger(this.constructor.name);

  public constructor(factsetCredentials: FactsetClientCredentials, metricService: MetricService) {
    super(factsetCredentials, metricService);
  }

  @Tool({
    name: 'fundamentals_company_reports_financial_statements',
    title: '[Fundamentals API] Company Reports: Financial Statements',
    description:
      'Retrieves detailed financial statement data (Income Statement, Balance Sheet, or Cash Flow) for a specified company. Returns line-item financial data with hierarchical display structure, including preliminary or final data for various fiscal periods (annual, quarterly, semi-annual, LTM, YTD). All values are absolute and can be retrieved in different currencies. Note: Due to variations in calculation time of average exchange rates, there may be some minor differences in the values of company report financial statement attributes if you are requesting for a currency other than local, when compared to the workstation.',
    parameters: getFinancialsQueryParams,
    annotations: {
      title: '[Fundamentals API] Company Reports: Financial Statements',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    _meta: {
      'unique.app/icon': 'receipt',
      'unique.app/system-prompt':
        'Use this tool to retrieve detailed financial statement data for a company. You must specify the statement type: BS (Balance Sheet) for assets, liabilities, and equity; IS (Income Statement) for revenue, expenses, and profit; or CF (Cash Flow) for operating, investing, and financing activities. The tool returns hierarchical line items with FactSet fundamental codes (ffCode) that can be used for further analysis. Periodicity options include ANN (Annual), QTR (Quarterly), SEMI (Semi-Annual), LTM (Last Twelve Months), and YTD (Year-to-Date), with _R variants including restatements. Use LOCAL currency for reporting currency, or specify ISO codes for conversions.',
    },
  })
  @Span()
  public async getFinancialStatements(params: z.infer<typeof getFinancialsQueryParams>) {
    this.incrementActionCounter('company-reports/financial_statements', 'fundamentals');

    try {
      const { data, status } = await this.callFactsetApiWithMetrics(
        'company-reports/financial_statements',
        'fundamentals',
        getFinancials,
        params,
      );
      this.logger.log({
        msg: 'FactSet Financial Statements HTTP Response',
        status,
      });
      return data;
    } catch (error) {
      this.incrementActionFailureCounter('company-reports/financial_statements', 'fundamentals', 'factset_api_error');
      this.logger.error({
        msg: 'Failed to get FactSet financial statements',
        error: serializeError(normalizeError(error)),
      });
      throw new InternalServerErrorException(error);
    }
  }
}
