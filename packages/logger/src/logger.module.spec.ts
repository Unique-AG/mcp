import { readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Test } from '@nestjs/testing';
import { Logger } from 'nestjs-pino';
import { LoggerModule } from './logger.module';
import { ILoggerModuleOptions } from './logger.module-definition';

describe('LoggerModule', () => {
  // eslint-disable-next-line no-process-env
  const originalEnv = process.env;

  beforeEach(() => {
    // eslint-disable-next-line no-process-env
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // eslint-disable-next-line no-process-env
    process.env = originalEnv;
  });

  describe('forRootAsync', () => {
    // this does not work when I add more tests to this file. I guess some state is not reset.
    it('should verify log level configuration is properly set', async () => {
      const logFile = path.join(os.tmpdir(), `test-${Date.now()}-${Math.random()}.log`);
      writeFileSync(logFile, '');

      const options: ILoggerModuleOptions = {
        LOG_LEVEL: 'warn',
        DESTINATION: logFile,
      };

      const module = LoggerModule.forRootAsync(options);

      // Create a test module with the logger
      const testModule = await Test.createTestingModule({
        imports: [module],
      }).compile();

      const logger = testModule.get(Logger);

      logger.debug('Debug message');
      logger.log('Info message');
      logger.warn('Warn message');
      logger.error('Error message');

      // Give some time for async logging
      await new Promise((resolve) => setTimeout(resolve, 100));

      const logFileContent = readFileSync(logFile, 'utf8')
        .split('\n')
        .filter((line) => line.trim() !== '');

      expect(logFileContent).toHaveLength(2);
      expect(logFileContent).not.toContain('Debug message');
      expect(logFileContent).not.toContain('Info message');
      expect(logFileContent[0]).toContain('Warn message');
      expect(logFileContent[1]).toContain('Error message');
    });
  });
});
