import { PrismaClient } from '@generated/prisma';
import { Injectable } from '@nestjs/common';
import { idPrefixExtension } from './id-prefix.extension';

@Injectable()
export class PrismaProvider extends PrismaClient {
  public withExtensions() {
    return this.$extends(idPrefixExtension);
  }
}
