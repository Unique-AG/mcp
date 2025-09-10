import { TerminusModule } from '@nestjs/terminus';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { HealthConfig, healthConfig } from './health.config';
import { HealthController } from './health.controller';
import { VersionHealthIndicator } from './version-health.service';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const mockHealthConfig: HealthConfig = {
      maxHeapMb: 150,
      version: '1.0.0',
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [TerminusModule],
      controllers: [HealthController],
      providers: [
        {
          provide: healthConfig.KEY,
          useValue: mockHealthConfig,
        },
        VersionHealthIndicator,
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });
});
