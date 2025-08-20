import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GraphClientFactory } from './graph-client.factory';

@Module({
  imports: [PrismaModule],
  providers: [GraphClientFactory],
  exports: [GraphClientFactory],
})
export class MsGraphModule {}
