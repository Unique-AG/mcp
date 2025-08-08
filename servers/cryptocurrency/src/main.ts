import { randomUUID } from 'node:crypto';
import http from 'node:http';
import { CoinMarketCapAPI } from '@unique/coin-market-cap';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

const EnvSchema = z.object({
  PORT: z.coerce.number().min(0).max(65535).default(3000),
});

const env = await EnvSchema.parseAsync(process.env);

const mcpServer = new McpServer({
  name: 'cryptocurrency',
  version: '1.0.0',
});

const api = new CoinMarketCapAPI('');

mcpServer.resource('listCurrencies', 'crypto://currencies', async (uri) => {
  const symbols = await api.listCurrencies();

  return {
    contents: [
      {
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(symbols),
      },
    ],
  };
});

const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: randomUUID,
});

await mcpServer.connect(transport);

const httpServer = http.createServer((req, res) => {
  transport.handleRequest(req, res);
});

httpServer.listen(env.PORT, () => {
  console.log(`Server is running on http://localhost:${env.PORT}`);
});
