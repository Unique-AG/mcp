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
  estimates: {
    input: {
      target: './src/estimates/factset_estimates_api-v2.yml',
    },
    output: {
      client: 'fetch',
      mode: 'tags-split',
      target: './src/estimates/@generated',
      baseUrl: {
        getBaseUrlFromSpecification: true,
      },
    },
  },
  estimatesZod: {
    input: {
      target: './src/estimates/factset_estimates_api-v2.yml',
    },
    output: {
      client: 'zod',
      mode: 'tags-split',
      target: './src/estimates/@generated',
      fileExtension: '.zod.ts',
    },
  },
  globalPrices: {
    input: {
      target: './src/global-prices/factset_global_prices_api-v1.yaml',
    },
    output: {
      client: 'fetch',
      mode: 'tags-split',
      target: './src/global-prices/@generated',
      baseUrl: {
        getBaseUrlFromSpecification: true,
      },
    },
  },
  globalPricesZod: {
    input: {
      target: './src/global-prices/factset_global_prices_api-v1.yaml',
    },
    output: {
      client: 'zod',
      mode: 'tags-split',
      target: './src/global-prices/@generated',
      fileExtension: '.zod.ts',
    },
  },
  streetAccountNews: {
    input: {
      target: './src/street-account-news/streetaccount_news_api-v1.yml',
    },
    output: {
      client: 'fetch',
      mode: 'tags-split',
      target: './src/street-account-news/@generated',
      baseUrl: {
        getBaseUrlFromSpecification: true,
      },
    },
  },
  streetAccountNewsZod: {
    input: {
      target: './src/street-account-news/streetaccount_news_api-v1.yml',
    },
    output: {
      client: 'zod',
      mode: 'tags-split',
      target: './src/street-account-news/@generated',
      fileExtension: '.zod.ts',
    },
  },
});
