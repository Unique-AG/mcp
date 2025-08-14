import { PrismaClient } from '@generated/prisma';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { idPrefixExtension } from './id-prefix.extension';

@Injectable()
export class PrismaProvider extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  public async onModuleInit() {
    await this.$connect();
  }

  public async onModuleDestroy() {
    await this.$disconnect();
  }

  public withExtensions() {
    return this.$extends(idPrefixExtension);
  }
}
