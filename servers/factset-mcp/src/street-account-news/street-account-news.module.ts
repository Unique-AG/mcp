import { Module } from '@nestjs/common';
import { FactsetAuthModule } from '../auth/factset-auth.module';
import { FiltersTool } from './tools/filters.tool';
import { HeadlinesTool } from './tools/headlines.tool';
import { ViewsTool } from './tools/views.tool';

@Module({
  imports: [FactsetAuthModule],
  controllers: [],
  providers: [FiltersTool, HeadlinesTool, ViewsTool],
})
export class StreetAccountNewsModule {}
