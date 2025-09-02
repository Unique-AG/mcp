# MCP NestJS Module to turn a NestJS application into an MCP server

This module implements the MCP server interface for NestJS applications.

This is an extension of the MCP-Nest module developed by [@rekog-labs/MCP-Nest](https://github.com/rekog-labs/MCP-Nest/tree/main).

## Prompts

Example:
```ts
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
```

## Credits

- [@rekog-labs/MCP-Nest](https://github.com/rekog-labs/MCP-Nest/tree/main)