import { SetMetadata } from '@nestjs/common';
import { ZodObject, ZodOptional, ZodType, ZodTypeDef } from 'zod';
import { MCP_PROMPT_METADATA_KEY } from './constants';

type PromptArgsRawShape = {
  [k: string]:
    | ZodType<string, ZodTypeDef, string>
    | ZodOptional<ZodType<string, ZodTypeDef, string>>;
};

export interface PromptMetadata {
  name: string;
  description: string;
  parameters?: ZodObject<PromptArgsRawShape>;
}

export interface PromptOptions {
  name?: string;
  description: string;
  parameters?: ZodObject<PromptArgsRawShape>;
}

export const Prompt = (options: PromptOptions) => {
  return SetMetadata(MCP_PROMPT_METADATA_KEY, options);
};
