/** biome-ignore-all lint/suspicious/noExplicitAny: Fork of @rekog-labs/MCP-Nest */
import {
  applyDecorators,
  Body,
  CanActivate,
  Controller,
  Delete,
  Get,
  Inject,
  Post,
  Req,
  Res,
  Type,
  UseGuards,
} from '@nestjs/common';
import { type McpOptions } from '../interfaces';
import { McpStreamableHttpService } from '../services/mcp-streamable-http.service';
import { normalizeEndpoint } from '../utils/normalize-endpoint';

/**
 * Creates a controller for handling Streamable HTTP connections and tool executions
 */
export function createStreamableHttpController(
  endpoint: string,
  apiPrefix: string,
  guards: Type<CanActivate>[] = [],
  decorators: ClassDecorator[] = [],
) {
  @Controller()
  @applyDecorators(...decorators)
  class StreamableHttpController {
    public constructor(
      @Inject('MCP_OPTIONS') public readonly options: McpOptions,
      public readonly mcpStreamableHttpService: McpStreamableHttpService,
    ) {}

    /**
     * Main HTTP endpoint for both initialization and subsequent requests
     */
    @Post(`${normalizeEndpoint(`${apiPrefix}/${endpoint}`)}`)
    @UseGuards(...guards)
    public async handlePostRequest(
      @Req() req: any,
      @Res() res: any,
      @Body() body: unknown,
    ): Promise<void> {
      await this.mcpStreamableHttpService.handlePostRequest(req, res, body);
    }

    /**
     * GET endpoint for SSE streams - not supported in stateless mode
     */
    @Get(`${normalizeEndpoint(`${apiPrefix}/${endpoint}`)}`)
    @UseGuards(...guards)
    public async handleGetRequest(@Req() req: any, @Res() res: any): Promise<void> {
      await this.mcpStreamableHttpService.handleGetRequest(req, res);
    }

    /**
     * DELETE endpoint for terminating sessions - not supported in stateless mode
     */
    @Delete(`${normalizeEndpoint(`${apiPrefix}/${endpoint}`)}`)
    @UseGuards(...guards)
    public async handleDeleteRequest(@Req() req: any, @Res() res: any): Promise<void> {
      await this.mcpStreamableHttpService.handleDeleteRequest(req, res);
    }
  }

  return StreamableHttpController;
}
