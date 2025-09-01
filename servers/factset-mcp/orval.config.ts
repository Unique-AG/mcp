import { defineConfig } from 'orval';

export default defineConfig({
  fundamentals: {
    input: {
      target: './src/fundamentals/factset_fundamentals_api-v2.yml',
    },
    output: {
      client: 'fetch',
      mode: 'tags-split',
      target: './src/fundamentals/@generated',
      baseUrl: {
        getBaseUrlFromSpecification: true,
      },
    },
  },
  fundametalsZod: {
    input: {
      target: './src/fundamentals/factset_fundamentals_api-v2.yml',
    },
    output: {
      client: 'zod',
      mode: 'tags-split',
      target: './src/fundamentals/@generated',
      fileExtension: '.zod.ts',
    },
  },
});
