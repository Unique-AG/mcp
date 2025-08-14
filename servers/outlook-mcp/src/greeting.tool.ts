import { Injectable } from '@nestjs/common';
import { type Context, Tool } from '@rekog/mcp-nest';
import { z } from 'zod';

const GreetingSchema = z.object({
  name: z.string().describe('The name of the user to greet').default('World'),
});

@Injectable()
export class GreetingTool {
  @Tool({
    name: 'greet',
    description: 'Returns a greeting to the user with progress',
    parameters: GreetingSchema,
  })
  public async greet({ name }: z.infer<typeof GreetingSchema>, context: Context) {
    await context.reportProgress({ progress: 50, total: 100 });
    return `Hello, ${name}!`;
  }
}
