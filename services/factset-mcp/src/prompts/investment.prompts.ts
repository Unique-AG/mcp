import { Prompt } from '@unique-ag/mcp-server-module';
import { Injectable, Scope } from '@nestjs/common';
import * as z from 'zod';

const FinancialHealthAnalysisSchema = z.object({
  stock_isin: z.string().describe('Stock ticker or ISIN').meta({ title: 'Security' }),
});

const GrowthOutlookAnalysisSchema = z.object({
  stock_isin: z.string().describe('Stock ticker or ISIN').meta({ title: 'Security' }),
});

const TimingAnalysisSchema = z.object({
  stock_isin: z.string().describe('Stock ticker or ISIN').meta({ title: 'Security' }),
  timeframe: z
    .string()
    .describe("Analysis period: '1week', '1month', '3months'")
    .meta({ title: 'Timeframe' }),
});

const ComprehensiveInvestmentAnalysisSchema = z.object({
  stock_isin: z.string().describe('Stock ticker or ISIN').meta({ title: 'Security' }),
  investment_objective: z
    .string()
    .describe("Client profile: 'conservative', 'growth', 'aggressive'")
    .meta({ title: 'Investment Objective' }),
});

const EarningsPreviewSchema = z.object({
  stock_isin: z.string().describe('Stock ticker or ISIN').meta({ title: 'Security' }),
  event_window: z
    .string()
    .describe("Earnings window (e.g., 'next', 'last 4', 'next 30d')")
    .meta({ title: 'Event Window' }),
});

const CorporateActionsImpactSchema = z.object({
  stock_isin: z.string().describe('Stock ticker or ISIN').meta({ title: 'Security' }),
  lookback: z
    .string()
    .describe("Lookback period for actions (e.g., '30d', '90d', '1y')")
    .meta({ title: 'Lookback Period' }),
});

@Injectable({ scope: Scope.REQUEST })
export class InvestmentPrompts {
  @Prompt({
    name: 'financial_health_analysis',
    title: 'Financial Health Analysis',
    description: 'Analyze the financial strength and business quality of {stock_isin}',
    parameters: FinancialHealthAnalysisSchema,
    _meta: { 'unique.app/category': 'Research' },
  })
  public financialHealthAnalysis({ stock_isin }: z.infer<typeof FinancialHealthAnalysisSchema>) {
    return {
      description:
        'Assess profitability, efficiency, leverage, liquidity, and durability with fundamentals and peer context.',
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text:
              `Task: Analyze the financial strength and business quality for "${stock_isin}".\n\n` +
              `Use tools to:\n` +
              `1) Fundamentals: key financial statements and metrics (revenue growth, margins, FCF, ROE/ROIC, leverage, interest coverage).\n` +
              `2) Fundamentals Metrics: quality signals (stability of margins, accruals, cash conversion, working capital trends).\n` +
              `3) Segments/Profiles: business mix, segment profitability and concentration.\n` +
              `4) Peer context: compare core metrics vs primary peers if available.\n\n` +
              `Deliver:\n` +
              `- Summary of financial strength (profitability, efficiency, leverage, liquidity)\n` +
              `- 3–5 bullet risks and 3–5 bullet positives\n` +
              `- Concise verdict: Strong / Mixed / Weak`,
          },
        },
      ],
    };
  }

  @Prompt({
    name: 'growth_outlook_analysis',
    title: 'Growth Outlook Analysis',
    description: 'Analyze growth potential and market expectations for {stock_isin}',
    parameters: GrowthOutlookAnalysisSchema,
    _meta: { 'unique.app/category': 'Research' },
  })
  public growthOutlookAnalysis({ stock_isin }: z.infer<typeof GrowthOutlookAnalysisSchema>) {
    return {
      description:
        'Blend history, street expectations, and segments to form a near-to-mid-term growth view.',
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text:
              `Task: Analyze growth potential and market expectations for "${stock_isin}".\n\n` +
              `Use tools to:\n` +
              `1) Fundamentals & Segments: historical growth (revenue, EPS) and drivers by segment/geography.\n` +
              `2) Estimates (consensus): forward revenue/EPS growth, revisions (1m/3m), dispersion, and broker count.\n` +
              `3) Estimates Reports/Metrics: consensus surprises history and trend in beats/misses.\n\n` +
              `Deliver:\n` +
              `- Growth drivers and headwinds (near/mid-term)\n` +
              `- Consensus vs. history gap and revisions trend\n` +
              `- Clear outlook rating: Positive / Neutral / Cautious`,
          },
        },
      ],
    };
  }

  @Prompt({
    name: 'timing_analysis',
    title: 'Timing Analysis (Technical & Events)',
    description:
      'Analyze optimal timing for trading {stock_isin} based on price patterns, volume, and corporate actions',
    parameters: TimingAnalysisSchema,
    _meta: { 'unique.app/category': 'Trading' },
  })
  public timingAnalysis({ stock_isin, timeframe }: z.infer<typeof TimingAnalysisSchema>) {
    return {
      description: 'Combine price/volume trend with known catalysts to inform trading timing.',
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text:
              `Task: Determine timing considerations for "${stock_isin}" over "${timeframe}".\n\n` +
              `Use tools to:\n` +
              `1) Global Prices: price and returns over the timeframe; trend, volatility, drawdowns.\n` +
              `2) Market Value/Shares Outstanding (if applicable): liquidity context.\n` +
              `3) Corporate Actions: recent or upcoming dividends, splits, or other actions that may affect timing.\n\n` +
              `Deliver:\n` +
              `- Price/volume trend summary and key levels\n` +
              `- Upcoming/recurring corporate action timing notes\n` +
              `- Practical timing guidance (enter/scale/avoid) with rationale`,
          },
        },
      ],
    };
  }

  @Prompt({
    name: 'comprehensive_investment_analysis',
    title: 'Comprehensive Investment Analysis',
    description:
      'Provide comprehensive investment recommendation for {stock_isin} including financial health, growth outlook, and timing',
    parameters: ComprehensiveInvestmentAnalysisSchema,
    _meta: { 'unique.app/category': 'Advisory' },
  })
  public comprehensiveInvestmentAnalysis({
    stock_isin,
    investment_objective,
  }: z.infer<typeof ComprehensiveInvestmentAnalysisSchema>) {
    return {
      description: 'Unify fundamentals, growth, and timing into a client-objective aligned view.',
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text:
              `Task: Provide a comprehensive investment view on "${stock_isin}" for a "${investment_objective}" investor.\n\n` +
              `Use tools to:\n` +
              `1) Financial Health: profitability, leverage, liquidity, quality indicators.\n` +
              `2) Growth Outlook: historical vs. consensus growth, revisions, surprise trends.\n` +
              `3) Timing: price trend, volatility, and corporate actions.\n\n` +
              `Deliver (structured):\n` +
              `- Thesis (2–3 sentences)\n` +
              `- Positives (3–5 bullets) and Risks (3–5 bullets)\n` +
              `- Time horizon and key catalysts\n` +
              `- Objective-aligned recommendation: Underweight / Hold / Overweight (with sizing guidance)`,
          },
        },
      ],
    };
  }

  @Prompt({
    name: 'earnings_preview',
    title: 'Earnings Preview',
    description:
      'Prepare a near-term earnings preview for {stock_isin} using consensus trends, surprises history, and segment drivers',
    parameters: EarningsPreviewSchema,
    _meta: { 'unique.app/category': 'Events' },
  })
  public earningsPreview({ stock_isin, event_window }: z.infer<typeof EarningsPreviewSchema>) {
    return {
      description: 'Focus on the next earnings: street setup, recent surprises, and what to watch.',
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text:
              `Task: Build an earnings preview for "${stock_isin}" (${event_window}).\n\n` +
              `Use tools to:\n` +
              `1) Estimates: current consensus (revenue/EPS), revisions (1m/3m), dispersion.\n` +
              `2) Estimates Reports: surprise history and post-earnings reaction context.\n` +
              `3) Segments/Fundamentals: product/segment drivers likely to shape results.\n\n` +
              `Deliver:\n` +
              `- Setup (street expectations vs. recent trend)\n` +
              `- Watch items (segments, margins, guidance)\n` +
              `- Balanced scenario: Beat / Inline / Miss with probabilities`,
          },
        },
      ],
    };
  }

  @Prompt({
    name: 'corporate_actions_impact',
    title: 'Corporate Actions Impact Brief',
    description:
      'Explain recent or upcoming corporate actions for {stock_isin} and their likely impact on trading and valuation',
    parameters: CorporateActionsImpactSchema,
    _meta: { 'unique.app/category': 'Corporate Actions' },
  })
  public corporateActionsImpact({
    stock_isin,
    lookback,
  }: z.infer<typeof CorporateActionsImpactSchema>) {
    return {
      description: 'Summarize key corporate actions and practical implications.',
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text:
              `Task: Summarize recent/upcoming corporate actions for "${stock_isin}" within "${lookback}" and assess impact.\n\n` +
              `Use tools to:\n` +
              `1) Corporate Actions: list dividends, splits, rights, and notable events.\n` +
              `2) Global Prices: show any price gaps or anomalies near action dates.\n\n` +
              `Deliver:\n` +
              `- Actions table (type, ex-date, record date, details)\n` +
              `- Expected effects on liquidity, price mechanics, and investor base\n` +
              `- Short guidance for traders and long-term investors`,
          },
        },
      ],
    };
  }
}
