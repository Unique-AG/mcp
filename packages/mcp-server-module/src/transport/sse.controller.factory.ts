/** biome-ignore-all lint/suspicious/noExplicitAny: Fork of @rekog-labs/MCP-Nest */
import {
  applyDecorators,
  Body,
  CanActivate,
  Controller,
  Get,
  Inject,
  OnModuleInit,
  Post,
  Req,
  Res,
  Type,
  UseGuards,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { type McpOptions } from '../interfaces';
import { McpSseService } from '../services/mcp-sse.service';
import { normalizeEndpoint } from '../utils/normalize-endpoint';

/**
 * Creates a controller for handling SSE connections and tool executions
 */
export function createSseController(
  sseEndpoint: string,
  messagesEndpoint: string,
  apiPrefix: string,
  guards: Type<CanActivate>[] = [],
  decorators: ClassDecorator[] = [],
) {
  @Controller({
    version: VERSION_NEUTRAL,
  })
  @applyDecorators(...decorators)
  class SseController implements OnModuleInit {
    public constructor(
      @Inject('MCP_OPTIONS') public readonly options: McpOptions,
      public readonly mcpSseService: McpSseService,
    ) {}

    /**
     * Initialize the controller and configure SSE service
     */
    public onModuleInit() {
      this.mcpSseService.initialize();
    }

    /**
     * SSE connection endpoint
     */
    @Get(normalizeEndpoint(`${apiPrefix}/${sseEndpoint}`))
    @UseGuards(...guards)
    public async sse(@Req() rawReq: any, @Res() rawRes: any) {
      return this.mcpSseService.createSseConnection(rawReq, rawRes, messagesEndpoint, apiPrefix);
    }

    /**
     * Tool execution endpoint - protected by the provided guards
     */
    @Post(normalizeEndpoint(`${apiPrefix}/${messagesEndpoint}`))
    @UseGuards(...guards)
    public async messages(
      @Req() rawReq: any,
      @Res() rawRes: any,
      @Body() body: unknown,
    ): Promise<void> {
      await this.mcpSseService.handleMessage(rawReq, rawRes, body);
    }
  }

  return SseController;
}
