import { Tool } from '@unique-ag/mcp-server-module';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { MetricService, Span } from 'nestjs-otel';
import { serializeError } from 'serialize-error-cjs';
import * as z from 'zod';
import { FactsetClientCredentials } from '../../auth/factset.client-credentials';
import { BaseFactsetTool } from '../../base-factset.tool';
import { normalizeError } from '../../utils/normalize-error';
import { getFundamentals } from '../@generated/company-reports/company-reports';
import { getFundamentalsQueryParams } from '../@generated/company-reports/company-reports.zod';

@Injectable()
export class CompanyFundamentalsTool extends BaseFactsetTool {
  private readonly logger = new Logger(this.constructor.name);

  public constructor(factsetCredentials: FactsetClientCredentials, metricService: MetricService) {
    super(factsetCredentials, metricService);
  }

  @Tool({
    name: 'fundamentals_company_reports_fundamentals',
    title: '[Fundamentals API] Company Reports: Key Fundamentals',
    description:
      'Retrieves comprehensive fundamental metrics and ratios for specified companies, including per-share metrics (EPS, book value, cash flow, revenue per share), financial ratios (P/E, P/B, current ratio, ROE, ROA, debt-to-equity), dividend information (yield, payout ratio, growth rates), and key financial figures (enterprise value, net income, total assets, revenue). Returns latest available data or specific periodicity (annual/quarterly/semi-annual).',
    parameters: getFundamentalsQueryParams,
    annotations: {
      title: '[Fundamentals API] Company Reports: Key Fundamentals',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    _meta: {
      'unique.app/icon': 'chart-candlestick',
      'unique.app/system-prompt':
        'Use this tool to retrieve a comprehensive set of key fundamental metrics and financial ratios for companies. Returns structured data in categories: Per-Share Metrics (EPS, book value, cash flow, sales per share, TTM EPS), Financial Ratios (valuation ratios like P/E, P/B, P/S; liquidity ratios like current and quick ratio; profitability ratios like ROE, ROA, ROIC; leverage ratios like debt-to-equity; efficiency ratios like asset turnover, inventory turnover; margin ratios like gross, EBIT, EBITDA margins), Dividend Data (yield, annual and per-share amounts, ex-dividend date, payout ratio, 3 and 5-year growth rates), and Key Figures (enterprise value, net income, total assets, revenue, shares outstanding, employee count). Ideal for financial analysis, peer comparison, and investment research. Limited to 50 companies per request.',
    },
  })
  @Span()
  public async getCompanyFundamentals(params: z.infer<typeof getFundamentalsQueryParams>) {
    this.incrementActionCounter('fundamentals_company_reports_fundamentals');

    try {
      const { data, status } = await getFundamentals(
        params,
        await this.getFactsetRequestOptions(),
      );
      this.logger.log({
        msg: 'FactSet Company Fundamentals HTTP Response',
        status,
      });
      return data;
    } catch (error) {
      this.incrementActionFailureCounter('fundamentals_company_reports_fundamentals', 'factset_api_error');
      this.logger.error({
        msg: 'Failed to get FactSet company fundamentals',
        error: serializeError(normalizeError(error)),
      });
      throw new InternalServerErrorException(error);
    }
  }
}
