# Project Instructions

## Code Comments
- Keep comments minimal - code should be self-explanatory
- Only add comments for complex algorithms, unexpected behavior, or non-obvious business logic
- Add JSDoc comments only for complex methods with multiple parameters or intricate logic
- Avoid obvious comments that just restate what the code does
- Prefer clear variable and function names over explanatory comments

## Code Style
- Write clean, readable code that minimizes the need for comments
- Use descriptive naming conventions
- Keep functions focused and single-purpose
- Avoid the use of `any`. Always use proper types or `unknown` with a type guard.

## Generated Files
- Don't create README files for generated code

## Tests
- When writing tests, avoid the word 'should' in the 'it' function name. Use present tense instead, e.g. instead of `it('should register a client')`, write `it('registers a client')`
- Follow the guidelines in https://www.betterspecs.org/ but adapted to what is possible with vitest.