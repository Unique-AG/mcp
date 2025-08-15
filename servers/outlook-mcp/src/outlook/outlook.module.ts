import { Module } from '@nestjs/common';
import { MsGraphModule } from '../msgraph/msgraph.module';
import { ReadMailsTool } from './tools/read-mails.tool';
import { SendMailTool } from './tools/send-mail.tool';

@Module({
  imports: [MsGraphModule],
  providers: [ReadMailsTool, SendMailTool],
  exports: [],
})
export class OutlookModule {}
