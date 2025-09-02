import { Module } from '@nestjs/common';
import { FactsetAuthModule } from '../auth/factset-auth.module';
import { ActualsTool } from './tools/actuals.tool';
import { ConsensusTool } from './tools/consensus.tool';
import { GuidanceTool } from './tools/guidance.tool';
import { MetricsTool } from './tools/metrics.tool';
import { RatingsTool } from './tools/ratings.tool';
import { EstimatesSegmentsTool } from './tools/segments.tool';
import { SurpriseTool } from './tools/surprise.tool';

@Module({
  imports: [FactsetAuthModule],
  controllers: [],
  providers: [
    ActualsTool,
    ConsensusTool,
    MetricsTool,
    GuidanceTool,
    RatingsTool,
    EstimatesSegmentsTool,
    SurpriseTool,
  ],
})
export class EstimatesModule {}
