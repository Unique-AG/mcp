import { Module } from "@nestjs/common";
import { MsGraphModule } from "../msgraph/msgraph.module";
import { ReadMailsTool } from "./tools/read-mails.tool";

@Module({
  imports: [MsGraphModule],
  providers: [ReadMailsTool],
  exports: [],
})
export class OutlookModule {}