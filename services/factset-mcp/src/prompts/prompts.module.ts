import { Module } from '@nestjs/common';
import { InvestmentPrompts } from './investment.prompts';

@Module({
  providers: [InvestmentPrompts],
})
export class PromptsModule {}
