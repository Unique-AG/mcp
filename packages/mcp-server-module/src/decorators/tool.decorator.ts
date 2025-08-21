import { ToolAnnotations as SdkToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import { SetMetadata } from '@nestjs/common';
import { z } from 'zod';
import { MCP_TOOL_METADATA_KEY } from './constants';

export interface ToolMetadata {
  name: string;
  title?: string;
  description: string;
  parameters?: z.ZodTypeAny;
  outputSchema?: z.ZodTypeAny;
  annotations?: SdkToolAnnotations;
  _meta?: z.ZodTypeAny;
}

export interface ToolAnnotations extends SdkToolAnnotations {}

export interface ToolOptions {
  name?: string;
  title?: string;
  description?: string;
  parameters?: z.ZodTypeAny;
  outputSchema?: z.ZodTypeAny;
  annotations?: ToolAnnotations;
  _meta?: { [key: string]: unknown };
}

/**
 * Decorator that marks a controller method as an MCP tool.
 * @param {Object} options - The options for the decorator
 * @param {string} options.name - The name of the tool
 * @param {string} options.description - The description of the tool
 * @param {z.ZodTypeAny} [options.parameters] - The parameters of the tool
 * @param {z.ZodTypeAny} [options.outputSchema] - The output schema of the tool
 * @returns {MethodDecorator} - The decorator
 */
export const Tool = (options: ToolOptions) => {
  if (options.parameters === undefined) {
    options.parameters = z.object({});
  }

  return SetMetadata(MCP_TOOL_METADATA_KEY, options);
};
