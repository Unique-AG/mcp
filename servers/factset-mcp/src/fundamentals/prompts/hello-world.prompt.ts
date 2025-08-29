import { Prompt } from '@unique-ag/mcp-server-module';
import { type GetPromptResult } from '@modelcontextprotocol/sdk/types.js';
import { Injectable } from '@nestjs/common';
import * as z from 'zod';

const HelloWorldPromptSchema = z.object({
  planet: z.string().prefault('World').meta({
    id: 'planet',
    title: 'Planet',
    description: 'The planet to say hello to',
    examples: ['Earth', 'Moon', 'Mars']
  }),
  what: z.string().prefault('Hello').meta({
    id: 'what',
    title: 'What',
    description: 'The word to say hello with',
    examples: ['Hello', 'Hi', 'Hey']
  })
});

@Injectable()
export class HelloWorldPrompt {
  @Prompt({
    name: 'foo',
    description: 'bar',
    parameters: HelloWorldPromptSchema
  })
  public helloWorld({ planet, what }: z.infer<typeof HelloWorldPromptSchema>): GetPromptResult {
    return {
      description: 'Says Hello World!',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `${what} ${planet}!`,
          },
        },
      ],
    };
  }
}
