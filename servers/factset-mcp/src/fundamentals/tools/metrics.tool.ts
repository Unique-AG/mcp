import path from "node:path";
import { Tool } from "@unique-ag/mcp-server-module";
// @ts-ignore - FactSet SDK doesn't provide TypeScript declarations
import { ApiClient, MetricsApi } from '@factset/sdk-factsetfundamentals';
// @ts-ignore - FactSet SDK doesn't provide TypeScript declarations
import { ConfidentialClient } from '@factset/sdk-utils';
import { Injectable, Logger } from "@nestjs/common";
import { z } from "zod";

const MetricsInputSchema = z.object({
  category: z
    .enum([
      'INCOME_STATEMENT',
      'BALANCE_SHEET', 
      'CASH_FLOW',
      'RATIOS',
      'FINANCIAL_SERVICES',
      'INDUSTRY_METRICS',
      'PENSION_AND_POSTRETIREMENT',
      'MARKET_DATA',
      'MISCELLANEOUS',
      'DATES'
    ])
    .optional()
    .describe(`Filters the list of FF_* metrics by major category:
      • INCOME_STATEMENT - Income Statement line items, such as Sales, Gross Profit, Net Income
      • BALANCE_SHEET - Balance Sheet line items, such as Assets, Liabilities, and Shareholders Equity  
      • CASH_FLOW - Cash Flow Statement line items, such as Financing activities, Operation, and Per Share
      • RATIOS - Pre-calculated Ratios, including Financial, Growth Rates, Profitability, Liquidity, Size, and Valuation
      • FINANCIAL_SERVICES - Financial Statement Items modified for Financial Services companies
      • INDUSTRY_METRICS - Industry Specific Line Items or Modifications
      • PENSION_AND_POSTRETIREMENT - Accumulated Pension Benefit Obligations and related data
      • MARKET_DATA - General Market Data, such as Shares Outstanding
      • MISCELLANEOUS - Corporation Data, Financial Records details, Indicators
      • DATES - Relevant Dates`),
  
  subcategory: z
    .enum([
      'ASSETS', 'BALANCE_SHEET', 'HEALTHCARE', 'LIABILITIES', 'PER_SHARE', 'SHAREHOLDERS_EQUITY', 'SUPPLEMENTAL',
      'CASH_FLOW', 'CHANGE_IN_CASH', 'FINANCING', 'INVESTING', 'OPERATING', 'DATES', 'INCOME_STATEMENT',
      'NON-OPERATING', 'RETAIL', 'AIRLINES', 'BANK', 'BANKING', 'HOTELS_AND_GAMING', 'METALS_AND_MINING',
      'OIL_AND_GAS', 'PHARMACEUTICAL', 'REIT', 'MARKET_DATA', 'CLASSIFICATION', 'CORPORATE_DATA',
      'FINANCIAL_RECORDS', 'INDICATOR', 'EMPLOYEES_AND_MANAGEMENT', 'PENSION_AND_POSTRETIREMENT',
      'FINANCIAL', 'GROWTH_RATE', 'LIQUIDITY', 'PROFITABILITY', 'SIZE', 'VALUATION', 'OTHER',
      'HOMEBUILDING', 'NET_INCOME', 'TELECOM', 'UTILITY', 'INSURANCE', 'EXPENSES', 'OPERATING_COST',
      'OPERATING_ACTIVITIES', 'NON-RECURRING_ITEMS', 'FINANCING_ACTIVITIES', 'INVESTING_ACTIVITIES', 'REVENUES'
    ])
    .optional()
    .describe(`Sub-Category Filter for the Primary Category. Choose a related sub-category for the Category requested:
      • INCOME_STATEMENT: INCOME_STATEMENT, NON-OPERATING, PER_SHARE, SUPPLEMENTAL, EXPENSES, OPERATING_COST, NON-RECURRING_ITEMS, REVENUES, OTHER
      • BALANCE_SHEET: ASSETS, BALANCE_SHEET, HEALTHCARE, LIABILITIES, PER_SHARE, SHAREHOLDERS_EQUITY, SUPPLEMENTAL
      • CASH_FLOW: CASH_FLOW, CHANGE_IN_CASH, FINANCING, INVESTING, OPERATING, PER_SHARE, SUPPLEMENTAL, FINANCING_ACTIVITIES, OPERATING_ACTIVITIES, INVESTING_ACTIVITIES
      • RATIOS: FINANCIAL, GROWTH_RATE, LIQUIDITY, PROFITABILITY, SIZE, VALUATION
      • FINANCIAL_SERVICES: BALANCE_SHEET, INCOME_STATEMENT, SUPPLEMENTAL
      • INDUSTRY_METRICS: AIRLINES, BANKING, HOTELS_AND_GAMING, METALS_AND_MINING, OIL_AND_GAS, PHARMACEUTICAL, REIT, RETAIL, BANK, INSURANCE, UTILITY
      • PENSION_AND_POSTRETIREMENT: PENSION_AND_POSTRETIREMENT
      • MARKET_DATA: MARKET_DATA
      • MISCELLANEOUS: CLASSIFICATION, CORPORATE_DATA, FINANCIAL_RECORDS, INDICATOR, EMPLOYEES_AND_MANAGEMENT
      • DATES: DATES`),
  
  metricDataType: z
    .enum(['integer', 'float', 'string'])
    .optional()
    .describe('Returns general data type of the metrics. When left blank, metrics with all data types will be returned. Options: integer (whole numbers), float (decimal numbers), string (text values)')
});

@Injectable()
export class MetricsTool {
  private readonly logger = new Logger(this.constructor.name);
  
  @Tool({
    name: 'fundamentals_metrics',
    title: 'Fundamentals Metrics',
    description: 'Returns available FactSet Fundamental metrics and ratios. Returns list of available FF_* metrics that can be used in the metrics parameter of related endpoints. These are related to FactSet Fundamentals standardized data. Leave Category and Subcategory blank to request all available items. For methodology definitions, reference the OApageID or OAurl response items.',
    parameters: MetricsInputSchema,
    annotations: {
      title: 'Fundamentals Metrics',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    _meta: {
      'unique.app/icon': 'chart-line',
      'unique.app/system-prompt': 'Retrieves the available fundamental metrics from FactSet that can be used for financial analysis. Filter by category and subcategory to narrow down the results. Returns metric identifiers, names, descriptions, and methodology references.',
    },
  })
  public async getMetrics({ category, subcategory, metricDataType }: z.infer<typeof MetricsInputSchema>) {
    const apiClient = ApiClient.instance;
    apiClient.factsetOauth2Client = new ConfidentialClient(path.join(__dirname, '../../../', 'factset-auth.json'));

    const api = new MetricsApi(apiClient);
    const { data, response } = await api.getFdsFundamentalsMetricsWithHttpInfo({
      category,
      subcategory,
      metricDataType,
    });
    this.logger.log({
      msg: 'FactSet Metrics HTTP Response',
      status: response.status,
    })
    return data;
  }
}