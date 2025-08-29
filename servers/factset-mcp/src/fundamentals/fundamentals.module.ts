import { Module } from "@nestjs/common";
import { MetricsTool } from "./tools/metrics.tool";

@Module({
  imports: [],
  controllers: [],
  providers: [MetricsTool],
})
export class FundamentalsModule {}