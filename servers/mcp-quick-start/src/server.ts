import express, { Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// Environment variables schema
const EnvSchema = z.object({
  PORT: z.string().optional().transform((val) => val ? parseInt(val, 10) : 51345)
    .refine((port) => port > 0 && port < 65536, {
      message: 'PORT must be between 1 and 65535'
    })
});

// JSON-RPC error response schema
const JsonRpcErrorSchema = z.object({
  jsonrpc: z.literal('2.0'),
  error: z.object({
    code: z.number(),
    message: z.string()
  }),
  id: z.null()
});

// MCP request body schema (basic structure)
const McpRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.string(),
  params: z.any().optional(),
  id: z.union([z.string(), z.number(), z.null()])
});

// Server configuration schema
const ServerConfigSchema = z.object({
  name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be in semver format')
});

// Parse and validate environment variables
const env = EnvSchema.parse(process.env);

// Create the MCP server with validated config
const serverConfig = ServerConfigSchema.parse({
  name: 'mcp-quick-start',
  version: '0.1.0'
});

const server = new McpServer(serverConfig);

// Define the addition tool schema
const AdditionToolSchema = z.object({
  a: z.number().describe('First number to add'),
  b: z.number().describe('Second number to add')
});

// Define the tool result schema
const ToolResultSchema = z.object({
  content: z.array(z.object({
    type: z.literal('text'),
    text: z.string()
  }))
});

// Register the addition tool
server.tool(
  'addition',
  'Adds two numbers together',
  {
    type: 'object',
    properties: {
      a: {
        type: 'number',
        description: 'First number to add'
      },
      b: {
        type: 'number',
        description: 'Second number to add'
      }
    },
    required: ['a', 'b']
  },
  async (args) => {
    const { a, b } = AdditionToolSchema.parse(args);
    const result = a + b;
    
    const response = ToolResultSchema.parse({
      content: [{
        type: 'text',
        text: `The sum of ${a} and ${b} is ${result}`
      }]
    });
    
    return response;
  }
);

// Function to get server instance
function getServer(): McpServer {
  return server;
}

// Setup function for the server
async function setupServer(): Promise<void> {
  // Set up stdio transport for CLI usage
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
  
  try {
    // Validate request body structure
    const validatedBody = McpRequestSchema.parse(req.body);
    
    const server = getServer(); 
    const transport: StreamableHTTPServerTransport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    res.on('close', () => {
      console.log('Request closed');
      transport.close();
      server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, validatedBody);
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      const errorResponse = JsonRpcErrorSchema.parse({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
      res.status(500).json(errorResponse);
    }
  }
});

// SSE notifications not supported in stateless mode
app.get('/mcp', async (req: Request, res: Response) => {
  console.log('Received GET MCP request');
  const errorResponse = JsonRpcErrorSchema.parse({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed."
    },
    id: null
  });
  res.writeHead(405).end(JSON.stringify(errorResponse));
});

// Session termination not needed in stateless mode
app.delete('/mcp', async (req: Request, res: Response) => {
  console.log('Received DELETE MCP request');
  const errorResponse = JsonRpcErrorSchema.parse({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed."
    },
    id: null
  });
  res.writeHead(405).end(JSON.stringify(errorResponse));
});

// Start the server
setupServer().then(() => {
  app.listen(env.PORT, (error?: Error) => {
    if (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
    console.log(`MCP Stateless Streamable HTTP Server listening on port ${env.PORT}`);
  });
}).catch(error => {
  console.error('Failed to set up the server:', error);
  process.exit(1);
});
