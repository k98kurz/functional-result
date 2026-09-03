---
name: functional-result
description: >
  Functional error handling with the Result type. Use when you need to chain
  operations that may fail, collect validation errors, convert exception-based
  code to explicit error handling, or work with typed success/failure paths in
  TypeScript. Provides map, chain, pipe, tryCatch, tryCatchSync, validate,
  sequence, traverse, tap, tapError, and match/fold for composable error handling.
license: ISC
compatibility: >
  Designed for TypeScript projects. Exported to Claude Code, Cursor, OpenCode,
  and Codex agent platforms via @k98kurz/functional-result.
metadata:
  version: "0.0.4"
  last-updated: "2026-09-03"
  author: "Jonathan Voss"
  library-name: "@k98kurz/functional-result"
  repository: "https://github.com/k98kurz/functional-result"
---

## When to use this library

Use `@k98kurz/functional-result` when:

- Error handling logic is complex or has multiple error paths
- You need to chain multiple operations that may fail
- Error types matter for downstream logic (not just "error occurred")
- You're working with APIs or services that return structured errors
- You need to collect multiple validation errors (not just the first one)
- Converting exception-based code to explicit error handling

**Do NOT use for:**
- Simple try-catch scenarios where exceptions are sufficient
- Performance-critical code where Result allocation overhead matters
- Codebases already committed to a different error-handling paradigm

## Core patterns

### Creating Results

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

### Transforming with map (success-only)

Use `map` when the transformation cannot fail:

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

### Chaining with chain (may fail)

Use `chain` when the transformation returns a Result:

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

### Composing with pipe

Use `pipe` for readable operation chains. Failures skip subsequent operations:

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

`pipe` always returns a `Promise`. For pure synchronous flows, compose the
curried combinators directly instead — no `Promise` wrapper, same typed error
channel:

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

### Side effects with tap and tapError

Both are curried and return the original Result unchanged, making them safe in pipelines:

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

## Migration from exception-based code

### Pattern 1: Wrap existing code with tryCatch

Use `tryCatch` for operations that may be async or sync. For synchronous-only
operations where you want to avoid Promise overhead, use `tryCatchSync`:

<!-- example: try-catch -->
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
  (error) =>
    `Operation failed: ${error instanceof Error ? error.message : String(error)}`
);
```

<!-- example: try-catch-sync -->
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
  (error) =>
    `Operation failed: ${error instanceof Error ? error.message : String(error)}`
);
```

### Pattern 2: Converting existing error handling

**Before (exception-based):**
<!-- example: skill-conversion-before -->
```typescript
function getUser(id: number): User {
  const user = db.find(id);
  if (!user) throw new Error('User not found');
  return user;
}

function getPosts(user: User): Post[] {
  return db.posts.filter(p => p.userId === user.id);
}

function getUserPosts(id: number): Post[] | undefined {
  try {
    const user = getUser(id);
    const posts = getPosts(user);
    return posts;
  } catch (error) {
    handleError(error);
  }
}
```

**After (Result-based):**
<!-- example: skill-conversion-after -->
```typescript
import { pipe, chain, match, success, failure } from '@k98kurz/functional-result';

function getUser(id: number): Result<User, string> {
  const user = db.find(id);
  return user ? success(user) : failure('User not found');
}

function getPosts(user: User): Result<Post[], string> {
  return success(db.posts.filter(p => p.userId === user.id));
}

async function somePipeline() {
  const result = await pipe(
    success(1),
    chain(getUser),
    chain(getPosts)
  );

  return match(
    (posts) => posts,
    (error) => handleError(error)
  )(result);
}
```

## Working with arrays

### Sequence: Handle arrays of Results

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

### Traverse: Map arrays with functions that return Results

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

Annotate the callback parameter (`(x: string)`): `traverse` is curried, so the
callback is typed at partial application before `items` is in scope, and an
unannotated parameter infers as `unknown`. `sequence(items.map(fn))` is an
equivalent that types the callback from the array instead.

### PartitionResults: Collect all successes and failures

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

## Validation with multiple errors

Use `validate` when you need to collect all validation errors:

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

## Extracting values

### Pattern matching with match/fold

Both are curried. `fold` is an alias of `match` for semantic clarity:

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

Annotate the handler parameters: `match`/`fold` handlers are typed at
application time, so unannotated parameters infer as `unknown`.

### Default values with getOrElse

<!-- example: get-or-else -->
```typescript
import { getOrElse } from '@k98kurz/functional-result';

const successResult = success(42);
const value = getOrElse(0)(successResult);
// 42

const failureResult = failure('error');
const fallback = getOrElse(0)(failureResult);
// 0

// defaults need not match the success type exactly (returns T | D):
const maybeNull = getOrElse(null)(maybeNullableResult); // string | null
```

### Exiting the Result paradigm with unwrapResult

Use `unwrapResult` (alias: `getOrThrow`) to convert Results back to
exception-based code:

<!-- example: skill-unwrap -->
```typescript
import { unwrapResult, tryCatch } from '@k98kurz/functional-result';

const result = await someFunctionReturnsResult();

// Throws if result is a failure
const data = unwrapResult(result);

// Use case: integrating with exception-based frameworks
app.get('/users/:id', async (req, res) => {
  const userResult = await getUser(Number(req.params.id));
  const user = unwrapResult(userResult); // throws if not found
  res.json(user);
});
```

Note: When using `unwrapResult`, consider converting custom error types to proper
`Error` instances first to preserve stack traces:

<!-- example: map-error-stack-trace -->
```typescript
const result = await someFunctionReturnsResult();
const ensureError = mapError((err: CustomError) => {
  const error = new Error(err.message);
  if (err.stack) error.stack = err.stack;
  return error;
});
const data = unwrapResult(ensureError(result));
```

## Type guards

Use type guards to narrow Result types in conditionals:

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

## Gotchas

- **Currying style**: Some functions are curried - call them as `fn(args)(result)`, not `fn(args, result)`
  - `map`, `mapError`, `chain`, `match`, `fold`, `traverse`, `validate`, `getOrElse`, `tap`, `tapError`
- **Annotate curried callbacks**: `traverse`, `match`, and `fold` handlers are typed at partial application, before the data is in scope — annotate parameters (`traverse((x: number) => ...)`) or they infer as `unknown`. `sequence(items.map(fn))` types the callback from the array instead
- **Sync composition**: `pipe` is async-only; for pure sync flows, compose `map`/`chain`/`mapError` directly without the `Promise` wrapper
- **Async pipe**: The `pipe` function always returns a Promise, even for synchronous operations
- **tryCatch vs tryCatchSync**: Use `tryCatch` for async or unknown operations; use `tryCatchSync` for sync-only to avoid Promise overhead
- **Type inference**: Specify error types explicitly when needed: `Result<string, ApiError>`
- **Validation error format**: `validate` requires `ValidationError` interface: `{ field: string; message: string }`
- **Array operations**: `sequence` stops at first failure; use `partitionResults` if you need all failures. `sequence` and `traverse` accept `readonly` arrays; `partitionResults` takes a mutable array
- **mapError exists**: Use `mapError` to transform error values, not `map` (which only transforms success values). A `mapError`/`tapError` handler must cover the full union of errors it may encounter
- **getOrElse defaults**: `getOrElse(defaultValue)` returns `T | D`, so the default need not match the success type exactly (e.g. `getOrElse(null)` on `Result<string | null, E>`)
- **Error widening**: `chain` unions its step's errors with the input's (`Result<T, E>` + step returning `Result<U, F>` → `Result<U, E | F>`); `map` and `tap` preserve the input error type
- **Error propagation**: `pipe` invokes every operation even after a failure — `map`/`chain`/`tap` no-op on a failed Result (while `mapError`/`tapError` still run), which makes steps *appear* skipped
- **Default error type**: `Result<T, E>` defaults `E` to `unknown`; `success(x)` types as `Result<T, never>`, which is assignable to any error type
- **Do NOT nest pipes**: nested calls bypass the typed overloads (ops degrade to `Result<any, any>`) and add needless Promise layers; to carry multiple values across steps, thread a state object (e.g. `{ user, orders }`) — use `map` to update it and `chain` for fallible steps

## Common templates

### API call wrapper

<!-- example: skill-api-call-wrapper -->
```typescript
import { tryCatch, map } from '@k98kurz/functional-result';

const fetchApi = async <T>(url: string): Promise<Result<T, string>> => {
  return await tryCatch(
    async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json() as T;
    },
    (error) =>
      `API request failed: ${error instanceof Error
        ? error.message
        : String(error)}`
  );
};
```

### Validation pipeline

<!-- example: skill-validation-pipeline -->
```typescript
import { pipe, validate, map, chain } from '@k98kurz/functional-result';

const validateAndProcessUser = (input: unknown) => {
  return pipe(
    success(input),
    chain(validateUser), // Returns Result<ValidatedUser, ValidationError[]>
    map(addDefaults),    // Cannot fail, so use map
    chain(saveToDb)      // May fail, so use chain
  );
};
```

### Partial batch processing

<!-- example: skill-batch-processing -->
```typescript
import { partitionResults } from '@k98kurz/functional-result';

const processBatch = (items: string[]) => {
  // Map each item to a Result
  const outcomes = items.map(processItem);

  // Collect successes and failures separately
  const { successes, failures } = partitionResults(outcomes);

  // Report results
  return {
    succeeded: successes.length,
    failed: failures.length,
    errors: failures,
    data: successes
  };
};
```

## Anti-patterns to avoid

<!-- example: anti-patterns -->
```typescript
// DON'T: Use map for operations that return Results
const bad = map(x => success(x * 2))(result); // Returns Result<Result<number, E>, E>

// DO: Use chain for operations that return Results
const good = chain(x => success(x * 2))(result); // Returns Result<number, E>

// DON'T: Forget that pipe is async
const bad = pipe(success(1), map(x => x * 2)); // Returns Promise, not Result
const value = bad.data; // Error: value is Promise, not Result

// DO: Await the pipe result
const good = await pipe(success(1), map(x => x * 2));
const value = good.data; // Correct

// DON'T: Use unwrapResult without try-catch
const bad = unwrapResult(mayFail()); // Could throw

// DO: Handle errors appropriately
try {
  const good = unwrapResult(mayFail());
} catch (error) {
  handleError(error);
}
```
