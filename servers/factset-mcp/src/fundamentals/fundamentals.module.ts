import { Module } from '@nestjs/common';
import { FactsetAuthModule } from '../auth/factset-auth.module';
import { CompanyFundamentalsTool } from './tools/company-fundamentals.tool';
import { CompanyProfileTool } from './tools/company-profile.tool';
import { FinancialStatementsTool } from './tools/financial-statements.tool';
import { FundamentalsTool } from './tools/fundamentals.tool';
import { MetricsTool } from './tools/metrics.tool';
import { SegmentsTool } from './tools/segments.tool';

@Module({
  imports: [FactsetAuthModule],
  controllers: [],
  providers: [
    CompanyFundamentalsTool,
    CompanyProfileTool,
    FinancialStatementsTool,
    FundamentalsTool,
    MetricsTool,
    SegmentsTool,
  ],
})
export class FundamentalsModule {}
