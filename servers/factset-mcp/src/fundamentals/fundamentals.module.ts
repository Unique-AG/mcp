import { Module } from "@nestjs/common";
import { HelloWorldPrompt } from "./prompts/hello-world.prompt";

@Module({
  imports: [],
  controllers: [],
  providers: [HelloWorldPrompt],
})
export class FundamentalsModule {}