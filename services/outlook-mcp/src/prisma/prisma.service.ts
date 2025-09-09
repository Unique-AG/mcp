import { Injectable, Type } from '@nestjs/common';
import { PrismaProvider } from './prisma.provider';

const ExtendedPrismaClient = class {
  public constructor(provider: PrismaProvider) {
    // biome-ignore lint/correctness/noConstructorReturn: To extend the PrismaClient we need to return the extended client here.
    return provider.withExtensions();
  }
} as Type<ReturnType<PrismaProvider['withExtensions']>>;

@Injectable()
export class PrismaService extends ExtendedPrismaClient {
  public constructor(provider: PrismaProvider) {
    super(provider);
  }
}
