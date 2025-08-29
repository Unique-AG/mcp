import { Module } from '@nestjs/common';
import { FactsetAuthModule } from '../auth/factset-auth.module';
import { MetricsTool } from './tools/metrics.tool';

@Module({
  imports: [FactsetAuthModule],
  controllers: [],
  providers: [MetricsTool],
})
export class FundamentalsModule {}
