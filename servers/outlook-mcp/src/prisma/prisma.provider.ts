import { PrismaClient } from '@generated/prisma';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { AppConfig, AppSettings } from '../app-settings.enum';
import { idPrefixExtension } from './id-prefix.extension';

@Injectable()
export class PrismaProvider extends PrismaClient {
  public constructor(config: ConfigService<AppConfig, true>) {
    const adapter = new PrismaPg({ connectionString: config.get(AppSettings.DATABASE_URL) });
    super({ adapter });
  }

  public withExtensions() {
    return this.$extends(idPrefixExtension);
  }
}
