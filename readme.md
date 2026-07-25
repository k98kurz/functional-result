# functional-result

A TypeScript library for handling Results, which can be either successes or
failures. Promotes a functional style of error handling and pipelining of operations.

## Features

- Result type for explicit error handling without exceptions
- Functional transformations with map, chain, and pipe for composing operations
- Pattern matching with match, fold, and getOrElse for handling both outcomes
- Array operations including sequence, traverse, and partitionResults
- Validation support for collecting multiple errors
- Interoperability between Result-based and exception-based code via tryCatch, tryCatchSync, and unwrapResult
- Side-effect operations (tap, tapError) for logging and debugging inside pipelines
- Type guards (isSuccess, isFailure) for TypeScript type narrowing

## When to use

Use this library when:
- Error handling logic is complex or has multiple error paths
- You need to chain multiple operations that may fail
- Error types matter for downstream logic (not just "error occurred")
- You're working with APIs or services that return structured errors
- You need to collect multiple validation errors (not just the first one)
- Converting exception-based code to explicit error handling

Do NOT use for:
- Simple try-catch scenarios where exceptions are sufficient
- Performance-critical code where Result allocation overhead matters
- Codebases already committed to a different error-handling paradigm

## Installation

### NPM

```bash
npm install @k98kurz/functional-result
```

### GitHub Package Registry

1. Go to https://github.com/settings/tokens/new and create a token with the
  `read:packages` scope.
2. Create a `.npmrc` file in your project with these contents:
```
//npm.pkg.github.com/:_authToken=TOKEN
@k98kurz:registry=https://npm.pkg.github.com
```
3. Install with npm:
```bash
npm install @k98kurz/functional-result
```

## Usage

### Basic Concepts

The `Result<T, E>` type represents either a successful operation with data of
type `T`, or a failed operation with an error of type `E`. This allows you to
handle errors explicitly without throwing exceptions.

#### Creating Results

```typescript
import { success, failure } from '@k98kurz/functional-result';

// Create a successful result
const successful = success(42);
// { success: true, data: 42 }

// Create a failed result
const failed = failure('Something went wrong');
// { success: false, error: 'Something went wrong' }
```

#### Transforming Success Values

Use `map` to transform success values while preserving failures:

```typescript
import { map } from '@k98kurz/functional-result';

const result = success(5);
const doubled = map(x => x * 2)(result);
// { success: true, data: 10 }

const failed = failure('error');
const unchanged = map(x => x * 2)(failed);
// { success: false, error: 'error' } - failures pass through unchanged
```

#### Chaining Operations

Use `chain` to sequence operations that may fail:

```typescript
import { chain, success, failure } from '@k98kurz/functional-result';

const parseAndDouble = (str: string) => {
  const num = Number(str);
  return isNaN(num) ? failure('Invalid number') : success(num * 2);
};

const result = success('5');
const chained = chain(parseAndDouble)(result);
// { success: true, data: 10 }

// chain may return a failure
const abc = success('abc');
const failedChain = chain(parseAndDouble)(abc);
// { success: false, error: 'Invalid number' }
```

Note that this is primarily useful within `pipe`s (see below).

#### Side Effects with tap and tapError

Use `tap` for side effects on success (e.g. logging) and `tapError` for side
effects on failure. Both return the original Result unchanged, so they fit in
pipelines:

```typescript
import { tap, tapError } from '@k98kurz/functional-result';

const logResult = tap((data) => console.log('Success:', data));
const logFailure = tapError((err) => console.error('Failure:', err));

const result = await pipe(
  success(42),
  logResult,   // logs "Success: 42" — result passes through
  map(x => x * 2)
);
// final result is still success(84)
```

### Pattern Matching and Extraction

#### Handling Both Cases

Use `match` or `fold` to handle both success and failure cases:

```typescript
import { match, fold, success } from '@k98kurz/functional-result';

const result = success(42);

const message = match(
  (data) => `Success! Got: ${data}`,
  (error) => `Failed with: ${error}`
)(result);
// 'Success! Got: 42'

// fold is an alias for match with more semantic meaning for final value extraction
const finalValue = fold(
  (data) => data.toString(),
  (error) => 'default value'
)(result);
// '42'
```

#### Unwrapping Result to a Default Value

Use `getOrElse` to unwrap a result with a fallback value on failure:

```typescript
import { getOrElse } from '@k98kurz/functional-result';

const successResult = success(42);
const value = getOrElse(0)(successResult);
// 42

const failureResult = failure('error');
const fallback = getOrElse(0)(failureResult);
// 0
```

### Composition and Pipelining

The `pipe` function allows you to compose operations in a readable way:

```typescript
import { pipe, map, chain } from '@k98kurz/functional-result';

const processInput = await pipe(
  success('5'),
  map(s => s.trim()),
  map(s => parseInt(s, 10)),
  chain(n => isNaN(n) ? failure('Invalid number') : success(n)),
  map(n => n * 2)
);
// Result: { success: true, data: 10 }

// If any operation fails, subsequent operations are skipped
const processInvalid = await pipe(
  success('abc'),
  map(s => s.trim()),
  map(s => parseInt(s, 10)),
  chain(n => isNaN(n) ? failure('Invalid number') : success(n)),
  map(n => n * 2)
);
// Result: { success: false, error: 'Invalid number' }
```

You can also create reusable operations in point-free style:

```typescript
const double = map((x: number) => x * 2);
const toString = map((x: number) => x.toString());

const result = await pipe(
  success(5),
  double,
  toString
);
// { success: true, data: '10' }
```

### Array Operations

#### Sequencing Multiple Results

Use `sequence` to handle arrays of Results:

```typescript
import { sequence } from '@k98kurz/functional-result';

const results = [
  success(1),
  success(2),
  success(3)
];

const sequenced = sequence(results);
// { success: true, data: [1, 2, 3] }

// Returns first failure if any operation fails
const withFailure = [
  success(1),
  failure('second failed'),
  success(3)
];

const failed = sequence(withFailure);
// { success: false, error: 'second failed' }
```

#### Mapping with Results

Use `traverse` to map arrays with functions that return Results:

```typescript
import { traverse } from '@k98kurz/functional-result';

const items = [1, 2, 3];
const result = traverse(x => success(x * 2))(items);
// { success: true, data: [2, 4, 6] }
```

#### Partitioning Results

Use `partitionResults` to collect all successes and failures separately:

```typescript
import { partitionResults } from '@k98kurz/functional-result';

const results = [
  success(1),
  failure('error1'),
  success(2),
  failure('error2')
];

const { successes, failures } = partitionResults(results);
// successes: [1, 2]
// failures: ['error1', 'error2']
```

### Validation

Use `validate` to collect multiple validation errors:

```typescript
import { validate } from '@k98kurz/functional-result';

const emailValidator = validate([
  (value: string) =>
    value.includes('@') ? null : { field: 'email', message: 'Must contain @' },
  (value: string) =>
    value.length >= 3 ? null : { field: 'email', message: 'Too short' }
]);

const valid = emailValidator('test@example.com');
// { success: true, data: 'test@example.com' }

const invalid = emailValidator('ab');
// { success: false, error: [
//   { field: 'email', message: 'Must contain @' },
//   { field: 'email', message: 'Too short' }
// ]}
```

### Error Handling and Interoperability

This library provides three main functions (and one alias) for interoperability
between the two error handling paradigms:
- `tryCatch` allows wrapping a function that may throw, with an optional error
  transformer function to transform any caught error
- `tryCatchSync` allows wrapping synchronous functions that may throw, with an
  optional error transformer function (no async/await; returns Result directly)
- `unwrapResult` extracts the data from a Result, throwing the error for failures
- `getOrThrow` is an alias for `unwrapResult`

#### Entering the Result Type Paradigm

The `tryCatch` function wraps both synchronous and asynchronous operations,
providing a unified interface for error handling. This makes it easy to integrate
existing code that uses exceptions. However, it must be used with `await`:

```typescript
import { tryCatch } from '@k98kurz/functional-result';

// Wrap synchronous operations
const syncResult = await tryCatch(() => {
  const data = JSON.parse('{"valid": true}');
  return data.valid;
});
// { success: true, data: true }

// Wrap asynchronous operations
const asyncResult = await tryCatch(async () => {
  const response = await fetch('https://api.example.com');
  return response.json();
});
// Result depends on fetch success/failure

// Transform errors for better context
const result = await tryCatch(
  () => sometimesThrows(),
  (error) => `Operation failed: ${error instanceof Error ? error.message : String(error)}`
);
```

#### Synchronous Error Handling

The `tryCatchSync` function is a sync-only version of `tryCatch` that returns a
`Result` directly (no async/Promise). Use it when you know the operation is
synchronous and want to avoid the overhead of `Promise` wrapping, or when you
can't use `await`:

```typescript
import { tryCatchSync } from '@k98kurz/functional-result';

// Wrap synchronous operations (no await needed)
const syncResult = tryCatchSync(() => {
  const data = JSON.parse('{"valid": true}');
  return data.valid;
});
// { success: true, data: true }

// Transform errors for better context
const result = tryCatchSync(
  () => sometimesThrows(),
  (error) => `Operation failed: ${error instanceof Error ? error.message : String(error)}`
);
```

**Important**: `tryCatchSync` is for synchronous operations only. If you need to
handle async operations, use `tryCatch` instead. Attempting to use async functions
within `tryCatchSync` will return a failure with an error message: "tryCatchSync
received a Promise - use tryCatch instead".

#### Exiting the Result Type Paradigm

The library provides seamless interoperability between Result-based error handling
and traditional try-catch systems. Use `unwrapResult` (alias: `getOrThrow`) to
convert a `Result` back to standard exception-based code:

```typescript
import { tryCatch, unwrapResult, getOrThrow } from '@k98kurz/functional-result';

// Convert Result-based code to use standard try-catch
const result = await someFunctionReturnsResult();
const data = unwrapResult(result); // throws if not success

// Or use the alias
const data2 = getOrThrow(result);
```

Note: If your error type is not already an `Error`, consider using `mapError` to
convert it before calling `unwrapResult` to ensure proper stack trace support:

```typescript
const result = await someFunctionReturnsResult();
const ensureError = mapError((err: CustomError) => {
  const error = new Error(err.message);
  error.stack = err.stack || error.stack;
  return error;
});
const data = unwrapResult(ensureError(result));
```

This allows gradual migration from exception-based to Result-based code:
- Use tryCatch to wrap existing exception-based code
- Use unwrapResult/getOrThrow to integrate Results back into exception-based contexts
- Build new code with pure Result-based error handling
- Mix both paradigms as needed during refactoring or writing glue code

### Advanced Usage

#### Type Guards

Use type guards to narrow Result types for imperative style:

```typescript
import { isSuccess, isFailure } from '@k98kurz/functional-result';

const result: Result<string, number> = success('test');

if (isSuccess(result)) {
  // TypeScript knows result.data is a string here
  console.log(result.data.toUpperCase());
} else {
  // TypeScript knows result.error is a number here
  console.log(`Error code: ${result.error}`);
}
```

#### Complex Type Transformations

```typescript
import { map, chain } from '@k98kurz/functional-result';

type User = { id: number; name: string };
type ApiError = { code: string; message: string };

const processUser = (user: User): Result<string, ApiError> => {
  return pipe(
    success(user),
    map(u => ({ ...u, email: `${u.name}@example.com` })),
    chain(u => u.id > 0 ? success(JSON.stringify(u)) : failure({ code: 'INVALID', message: 'Invalid ID' }))
  );
};
```

## Gotchas

- Currying style: Some functions are curried - call them as `fn(args)(result)`, not `fn(args, result)`
  - Affects: `map`, `mapError`, `chain`, `match`, `fold`, `traverse`, `validate`, `getOrElse`
- Async pipe: The `pipe` function always returns a Promise, even for synchronous operations
- Type inference: Specify error types explicitly when needed: `Result<string, ApiError>`
- Validation error format: `validate` requires `ValidationError` interface: `{ field: string; message: string }`
- Array operations: `sequence` stops at first failure; use `partitionResults` if you need all failures
- mapError exists: Use `mapError` to transform error values, not `map` (which only transforms success values)
- Error propagation: Once a failure occurs in a pipe, all subsequent operations are skipped
- Default error type: If you don't specify the error type, it defaults to `unknown`

## CLI Tool

The package includes a CLI tool for exporting the agent skill file to various AI
development platforms.

### Usage

Export skill to a specific platform:
```bash
npx export-functional-result-skill [platform]
```

Available platforms:
- `claude` - Export to `.claude/skills/functional-result/SKILL.md`
- `codex` - Export to `.agent/skills/functional-result/SKILL.md`
- `cursor` - Export to `.cursor/skills/functional-result/SKILL.md`
- `opencode` - Export to `.opencode/skills/functional-result/SKILL.md`
- `default` - Export to `.agent/skills/functional-result/SKILL.md` (default)

### Examples

```bash
# Export for Claude
npx export-functional-result-skill claude

# Export for Cursor
npx export-functional-result-skill cursor

# Show help
npx export-functional-result-skill help

# Use default platform
npx export-functional-result-skill
```

The CLI tool automatically creates the necessary directory structure and copies
the skill file to the specified location.

## Testing

```bash
npm test                    # just the tests
npm run test:coverage       # with coverage report
npm run test:watch          # in watch mode
```

### Testing Distribution

To test the package as it will be consumed by other projects:
```bash
npm run test:dist
```

This builds the package and runs tests against the built artifacts, ensuring that:
- Package imports work correctly
- Exports are properly configured
- No build or distribution issues exist

The test suite includes:
- Unit tests: Core library logic via common usage patterns
- Distribution tests: Package distribution verification

## Development Commands

```bash
npm run build
npm run dev             # build with file watching
npm run typecheck
npm run lint
npm run format
```

## ISC License

Copyright (c) 2026 Jonathan Voss

Permission to use, copy, modify, and/or distribute this software
for any purpose with or without fee is hereby granted, provided
that the above copyright notice and this permission notice appear in
all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL
WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE
AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR
CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT,
NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN
CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
