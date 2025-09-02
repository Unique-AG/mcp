import { Module } from '@nestjs/common';
import { FactsetAuthModule } from '../auth/factset-auth.module';
import { CorporateActionsTool } from './tools/corporate-actions.tool';
import { MarketValueTool } from './tools/market-value.tool';
import { PricesTool } from './tools/prices.tool';
import { ReturnsTool } from './tools/returns.tool';
import { SharesOutstandingTool } from './tools/shares-outstanding.tool';

@Module({
  imports: [FactsetAuthModule],
  controllers: [],
  providers: [
    CorporateActionsTool,
    MarketValueTool,
    PricesTool,
    ReturnsTool,
    SharesOutstandingTool,
  ],
})
export class GlobalPricesModule {}
