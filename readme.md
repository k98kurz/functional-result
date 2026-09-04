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

<!-- example: creating-results -->
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

<!-- example: map-basic -->
```typescript
import { map } from '@k98kurz/functional-result';

const result = success('  hello  ');
const trimmed = map((s: string) => s.trim())(result);
// { success: true, data: 'hello' }

// Failures pass through unchanged
const failed = failure('error');
const unchanged = map((s: string) => s.trim())(failed);
// { success: false, error: 'error' }
```

#### Chaining Operations

Use `chain` to sequence operations that may fail:

<!-- example: chain-basic -->
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

Error types widen through `chain`: applying it to a `Result<T, E>` with a step
that returns `Result<U, F>` produces `Result<U, E | F>`, so steps may introduce
their own error types without casts.

#### Side Effects with tap and tapError

Use `tap` for side effects on success (e.g. logging) and `tapError` for side
effects on failure. Both return the original Result unchanged, so they fit in
pipelines:

<!-- example: tap-tap-error -->
```typescript
import {
  tap, tapError, pipe, map, success, failure
} from '@k98kurz/functional-result';

const logSuccess = tap((data: string) => console.log('Success:', data));
const logFailure = tapError((err: string) => console.error(err));

const result = await pipe(
  success('  hello  '),
  logSuccess,   // logs "Success:   hello  " — result passes through
  logFailure,   // does nothing
  map(s => s.trim().toUpperCase()),
  logSuccess    // logs "Success: HELLO"
);

// Failures skip success taps and run error taps
const failed = await pipe(
  failure('db timeout'),
  logSuccess,   // does nothing
  logFailure    // logs "db timeout"
);
```

### Pattern Matching and Extraction

#### Handling Both Cases

Use `match` or `fold` to handle both success and failure cases:

<!-- example: match-fold -->
```typescript
import { match, fold, success } from '@k98kurz/functional-result';

const result = success(42);

const message = match(
  (data: number) => `Success! Got: ${data}`,
  (error: unknown) => `Failed with: ${error}`
)(result);
// 'Success! Got: 42'

// fold is an alias for match with more semantic meaning for final value extraction
const finalValue = fold(
  (data: number) => data.toString(),
  (error: unknown) => 'default value'
)(result);
// '42'
```

As with `traverse` (see below), annotate the handler parameters: `match`/`fold`
are curried, so the handlers are typed at application time and their parameters
would otherwise default to `unknown`.

#### Unwrapping Result to a Default Value

Use `getOrElse` to unwrap a result with a fallback value on failure:

<!-- example: get-or-else -->
```typescript
import { getOrElse } from '@k98kurz/functional-result';
import type { Result } from '@k98kurz/functional-result';

const successResult = success(42);
const value = getOrElse(0)(successResult);
// 42

const failureResult = failure('error');
const fallback = getOrElse(0)(failureResult);
// 0

// defaults need not match the success type exactly (returns T | D):
const maybeNullableResult: Result<string | null, Error> = success('x');
const maybeNull = getOrElse(null)(maybeNullableResult); // string | null
```

### Composition and Pipelining

The `pipe` function allows you to compose operations in a readable way:

<!-- example: pipe-composition -->
```typescript
import { pipe, map, chain } from '@k98kurz/functional-result';

const processInput = await pipe(
  success('  5  '),
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

<!-- example: pipe-pointfree -->
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

#### Synchronous Composition (without pipe)

`pipe` always returns a `Promise`, even when every step is synchronous. For
pure synchronous flows — where you don't want to introduce `async`/`await` into
the call chain — compose the combinators directly instead. The curried
combinators compose like ordinary functions:

<!-- example: sync-composition -->
```typescript
import { chain, failure, mapError, success } from '@k98kurz/functional-result';
import type { Result } from '@k98kurz/functional-result';

type ParseError = { code: string };
type ApiError = { code: string; message: string };

const parse = (input: string): Result<number, ParseError> => {
  const n = Number(input);
  return isNaN(n) ? failure({ code: 'parse' }) : success(n);
};

const checkRange = (n: number): Result<number, ApiError> =>
  n > 100 ? failure({ code: 'range', message: `${n} is out of range` }) : success(n);

// a synchronous multi-step flow, with a typed error channel throughout
const toApiError = (e: ParseError): ApiError => ({
  code: e.code,
  message: 'Invalid input'
});

const processInput = (input: string): Result<number, ApiError> =>
  chain(checkRange)(mapError(toApiError)(parse(input)));

const result = processInput('21'); // { success: true, data: 21 }
```

Each combinator's error type is preserved or widened as it flows through, so
you get the same type safety as `pipe` without the `Promise` wrapper. Reach for
`pipe` when a flow mixes async steps; use direct composition when every step is
synchronous.

### Array Operations

#### Sequencing Multiple Results

Use `sequence` to handle arrays of Results:

<!-- example: sequence -->
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

<!-- example: traverse-basic -->
```typescript
import { traverse } from '@k98kurz/functional-result';

const items = ['1', '2', '3'];
const result = traverse((x: string) => {
  const num = Number(x);
  return isNaN(num) ? failure('Invalid') : success(num * 2);
})(items);
// { success: true, data: [2, 4, 6] }
```

Note the `(x: number)` annotation: `traverse` is curried, so its callback is
typed when the function is applied, before `items` is in scope. Without the
annotation, `x` is inferred as `unknown` and the body won't type-check under
strict mode. If you prefer contextual typing from the array, `sequence(items.map(fn))`
is equivalent — `items.map` types the callback from the array elements directly.

#### Partitioning Results

Use `partitionResults` to collect all successes and failures separately:

<!-- example: partition-results -->
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

// Use case: partial failure processing
if (successes.length > 0) {
  console.log(`Processed ${successes.length} items`);
}
if (failures.length > 0) {
  console.log(`${failures.length} items failed`);
}
```

### Validation

Use `validate` to collect multiple validation errors:

<!-- example: validate-basic -->
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

<!-- example: try-catch -->
```typescript
import { tryCatch } from '@k98kurz/functional-result';

const sometimesThrows = (): unknown => {
  const input = Math.random() < 0.5 ? '{"valid": true}' : 'not json';
  return JSON.parse(input);
};

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
  (error) =>
    `Operation failed: ${error instanceof Error ? error.message : String(error)}`
);
```

#### Synchronous Error Handling

The `tryCatchSync` function is a sync-only version of `tryCatch` that returns a
`Result` directly (no async/Promise). Use it when you know the operation is
synchronous and want to avoid the overhead of `Promise` wrapping, or when you
can't use `await`:

<!-- example: try-catch-sync -->
```typescript
import { tryCatchSync } from '@k98kurz/functional-result';

const sometimesThrows = (): unknown => {
  const input = Math.random() < 0.5 ? '{"valid": true}' : 'not json';
  return JSON.parse(input);
};

// Wrap synchronous operations (no await needed)
const syncResult = tryCatchSync(() => {
  const data = JSON.parse('{"valid": true}');
  return data.valid;
});
// { success: true, data: true }

// Transform errors for better context
const result = tryCatchSync(
  () => sometimesThrows(),
  (error) =>
    `Operation failed: ${error instanceof Error ? error.message : String(error)}`
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

<!-- example: unwrap-get-orthrow -->
```typescript
import { unwrapResult, getOrThrow, success } from '@k98kurz/functional-result';
import type { Result } from '@k98kurz/functional-result';

const someFunctionReturnsResult = (): Result<number, Error> => success(1);

// Convert Result-based code to use standard try-catch
const result = someFunctionReturnsResult();
const data = unwrapResult(result); // throws if not success

// Or use the alias
const data2 = getOrThrow(result);
```

Note: If your error type is not already an `Error`, consider using `mapError` to
convert it before calling `unwrapResult` to ensure proper stack trace support:

<!-- example: map-error-stack-trace -->
```typescript
import { mapError, unwrapResult, success } from '@k98kurz/functional-result';
import type { Result } from '@k98kurz/functional-result';

type CustomError = { message: string; stack?: string };
const someFunctionReturnsResult = (): Result<string, CustomError> =>
  success('x');

const result = someFunctionReturnsResult();
const ensureError = mapError((err: CustomError) => {
  const error = new Error(err.message);
  if (err.stack) error.stack = err.stack;
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

<!-- example: type-guards -->
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

// isFailure is the inverse
if (isFailure(result)) {
  console.log(`Error: ${result.error}`);
}
```

#### Complex Type Transformations

<!-- example: complex-type-transform -->
```typescript
import { pipe, map, chain, success, failure } from '@k98kurz/functional-result';
import type { Result } from '@k98kurz/functional-result';

type User = { id: number; name: string };
type ApiError = { code: string; message: string };

const processUser = (user: User): Promise<Result<string, ApiError>> => {
  return pipe(
    success(user),
    map(u => ({ ...u, email: `${u.name}@example.com` })),
    chain(u => u.id > 0
      ? success(JSON.stringify(u))
      : failure({ code: 'INVALID', message: 'Invalid ID' }))
  );
};
```

## Gotchas

- Currying style: Combinators are curried (data-last) — call them as `fn(args)(result)`. They are designed to fit into `pipe` as unary operations
  - Affects: `map`, `mapError`, `tap`, `tapError`, `chain`, `match`, `fold`, `traverse`, `validate`, `getOrElse`
- Annotate curried callbacks: For `traverse`, `match`, and `fold`, the callback/handler parameters are typed at the first (partial) application, before the data argument is in scope. Annotate them — e.g. `traverse((x: number) => ...)` — or they infer as `unknown`. `sequence(items.map(fn))` is a contextual-typing-friendly equivalent to `traverse`
- Async pipe: The `pipe` function always returns a Promise, even for synchronous operations. For pure sync flows, compose `map`/`chain`/`mapError` directly (see Synchronous Composition)
- Type inference: Specify error types explicitly when needed: `Result<string, ApiError>`
- Validation error format: `validate` requires `ValidationError` interface: `{ field: string; message: string }`
- Array operations: `sequence` stops at first failure; use `partitionResults` if you need all failures. `sequence` and `traverse` accept `readonly` arrays; `partitionResults` takes a mutable array
- mapError exists: Use `mapError` to transform error values, not `map` (which only transforms success values). A `mapError`/`tapError` handler must cover the full union of errors it may encounter
- Error propagation: Once a failure occurs in a pipe, all subsequent operations are skipped
- Default error type: `Result<T, E>` defaults `E` to `unknown`; `success(x)` types as `Result<T, never>`, which is assignable to any error type
- getOrElse defaults: `getOrElse(defaultValue)` returns `T | D`, so a default need not be the exact success type — e.g. `getOrElse(null)` works on `Result<string | null, E>`

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
