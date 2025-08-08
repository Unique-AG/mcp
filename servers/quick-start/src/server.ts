import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express, { type Request, type Response } from 'express';
import { z } from 'zod';

// Environment variables schema
const EnvSchema = z.object({
  /**
   * The port that the MCP Server will listen on.
   */
  PORT: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 51345))
    .refine((port) => port > 0 && port < 65536, {
      message: 'PORT must be between 1 and 65535',
    }),
  /**
   * Allows modifing the MCP Server Name if desired.
   */
  SERVER_NAME: z.string().optional().default('mcp-server-quick-start'),
  /**
   * The version should be set at runtime and point to the package.json version (Singe Source of Truth).
   */
  VERSION: z
    .string()
    .optional()
    .default('local')
    .refine((version) => /^\d+\.\d+\.\d+$/.test(version) || /^[a-z]+$/.test(version), {
      message: 'VERSION must be in semver format (e.g., 0.1.0) or lowercase string',
    }),
});

// JSON-RPC error response schema
const JsonRpcErrorSchema = z.object({
  jsonrpc: z.literal('2.0'),
  error: z.object({
    code: z.number(),
    message: z.string(),
  }),
  id: z.union([z.string(), z.number(), z.null()]),
});

// MCP request body schema (basic structure)
const McpRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.string(),
  params: z.any().optional(),
  id: z.union([z.string(), z.number(), z.null()]).optional(),
});

// Server configuration schema
const ServerConfigSchema = z.object({
  name: z.string().min(1),
  version: z.string(),
});

// Parse and validate environment variables
const env = EnvSchema.parse(process.env);

// Server configuration
const serverConfig = ServerConfigSchema.parse({
  name: env.SERVER_NAME,
  version: env.VERSION,
});

// Function to create a new server instance with tools
function createServer(): McpServer {
  const server = new McpServer(serverConfig);

  server.tool('add', 'Add two numbers', { a: z.number(), b: z.number() }, async ({ a, b }) => ({
    content: [{ type: 'text', text: String(a + b) }],
  }));

  return server;
}

// Function to create error response
function createErrorResponse(code: number, message: string, requestId?: string | number | null) {
  return JsonRpcErrorSchema.parse({
    jsonrpc: '2.0',
    error: { code, message },
    id: requestId ?? null,
  });
}

// Function to send error response
function sendErrorResponse(
  res: Response,
  code: number,
  message: string,
  requestId?: string | number | null,
) {
  if (!res.headersSent) {
    const errorResponse = createErrorResponse(code, message, requestId);
    res.status(500).json(errorResponse);
  }
}

// Function to send method not allowed response
function sendMethodNotAllowedResponse(res: Response) {
  const errorResponse = createErrorResponse(-32000, 'Method not allowed.');
  res.writeHead(405).end(JSON.stringify(errorResponse));
}

// Setup function for the server (for stdio transport)
async function setupServer(): Promise<void> {
  // Set up stdio transport for CLI usage
  const server = createServer();
  const stdioTransport = new StdioServerTransport();
  await server.connect(stdioTransport);

  console.log('MCP Server setup complete');
}

// Express app setup
const app = express();
app.use(express.json());

app.post('/mcp', async (req: Request, res: Response) => {
  // In stateless mode, create a new instance of transport and server for each request
  // to ensure complete isolation. A single instance would cause request ID collisions
  // when multiple clients connect concurrently.

  let server: McpServer | null = null;
  let transport: StreamableHTTPServerTransport | null = null;

  try {
    // Validate request body structure
    const validatedBody = McpRequestSchema.parse(req.body);

    // Create fresh server and transport instances for each request
    server = createServer();
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    // Set up cleanup on response close
    res.on('close', () => {
      console.log('Request closed');
      if (transport) {
        transport.close();
      }
      if (server) {
        server.close();
      }
    });

    // Connect server to transport
    await server.connect(transport);

    // Handle the request
    await transport.handleRequest(req, res, validatedBody);
  } catch (error) {
    console.error('Error handling MCP request:', error);

    // Clean up resources
    if (transport) {
      transport.close();
    }
    if (server) {
      server.close();
    }

    sendErrorResponse(
      res,
      -32603,
      error instanceof Error ? error.message : 'Internal server error',
      req.body?.id,
    );
  }
});

// SSE notifications not supported in stateless mode
app.get('/mcp', async (req: Request, res: Response) => {
  console.log('Received GET MCP request');
  sendMethodNotAllowedResponse(res);
});

// Session termination not needed in stateless mode
app.delete('/mcp', async (req: Request, res: Response) => {
  console.log('Received DELETE MCP request');
  sendMethodNotAllowedResponse(res);
});

// Start the server
setupServer()
  .then(() => {
    app.listen(env.PORT, (error?: Error) => {
      if (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
      }
      console.log(
        `MCP Stateless Streamable HTTP Server listening on port [${env.PORT}] with server name [${env.SERVER_NAME}] and version [${env.VERSION}].`,
      );
    });
  })
  .catch((error) => {
    console.error('Failed to set up the server:', error);
    process.exit(1);
  });
