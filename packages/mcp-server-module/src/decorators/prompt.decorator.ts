import { SetMetadata } from '@nestjs/common';
import * as z from 'zod';
import { MCP_PROMPT_METADATA_KEY } from './constants';
export interface PromptMetadata {
  name: string;
  title?: string;
  description: string;
  parameters?: z.ZodObject;
}

export interface PromptOptions {
  name?: string;
  description: string;
  parameters?: z.ZodObject;
}

export const Prompt = (options: PromptOptions) => {
  return SetMetadata(MCP_PROMPT_METADATA_KEY, options);
};
