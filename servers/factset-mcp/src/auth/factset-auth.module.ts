import { Module } from '@nestjs/common';
import { FactsetClientCredentials } from './factset.client-credentials';

@Module({
  imports: [],
  providers: [FactsetClientCredentials],
  exports: [FactsetClientCredentials],
})
export class FactsetAuthModule {}
