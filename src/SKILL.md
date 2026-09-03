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
  version: "0.0.2"
  last-updated: "2026-08-15"
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

```typescript
import { success, failure } from '@k98kurz/functional-result';

// Success with data
const result = success(42);

// Failure with error
const result = failure('Database connection failed');
```

### Transforming with map (success-only)

Use `map` when the transformation cannot fail:

```typescript
import { map } from '@k98kurz/functional-result';

const result = success('  hello  ');
const trimmed = map(s => s.trim())(result); // success('hello')

// Failures pass through unchanged
const failed = failure('error');
const unchanged = map(s => s.trim())(failed); // still failure('error')
```

### Chaining with chain (may fail)

Use `chain` when the transformation returns a Result:

```typescript
import { chain, success, failure } from '@k98kurz/functional-result';

const parseNumber = (str: string) => {
  const num = Number(str);
  return isNaN(num) ? failure('Invalid number') : success(num);
};

const result = success('42');
const chained = chain(parseNumber)(result); // success(42)

// If chain fails, the failure propagates
const badResult = success('abc');
const failedChain = chain(parseNumber)(badResult); // failure('Invalid number')
```

### Composing with pipe

Use `pipe` for readable operation chains. Failures skip subsequent operations:

```typescript
import { pipe, map, chain, success, failure } from '@k98kurz/functional-result';

const processInput = await pipe(
  success('  5  '),
  map(s => s.trim()),
  map(s => parseInt(s, 10)),
  chain(n => isNaN(n) ? failure('Invalid number') : success(n)),
  map(n => n * 2)
);
// Returns: success(10)

const processInvalid = await pipe(
  success('abc'),
  map(s => s.trim()),
  map(s => parseInt(s, 10)),
  chain(n => isNaN(n) ? failure('Invalid number') : success(n)),
  map(n => n * 2)
);
// Returns: failure('Invalid number')
```

`pipe` always returns a `Promise`. For pure synchronous flows, compose the
curried combinators directly instead — no `Promise` wrapper, same typed error
channel:

```typescript
import { chain, failure, mapError, success } from '@k98kurz/functional-result';
import type { Result } from '@k98kurz/functional-result';

type ParseError = { code: string };
type ApiError = { code: string; message: string };

const parse = (s: string): Result<number, ParseError> =>
  isNaN(Number(s)) ? failure({ code: 'parse' }) : success(Number(s));

const checkRange = (n: number): Result<number, ApiError> =>
  n > 100 ? failure({ code: 'range', message: 'out of range' }) : success(n);

const toApiError = (e: ParseError): ApiError => ({ code: e.code, message: 'invalid' });

const process = (s: string): Result<number, ApiError> =>
  chain(checkRange)(mapError(toApiError)(parse(s)));
```

### Side effects with tap and tapError

Both are curried and return the original Result unchanged, making them safe in pipelines:

```typescript
import { tap, tapError, pipe, map, success, failure } from '@k98kurz/functional-result';

const logSuccess = tap((data) => console.log('Success:', data));
const logFailure = tapError((err) => console.error(err));

const result = await pipe(
  success('  hello  '),
  logSuccess,                   // logs "Success:   hello  "
  logFailure,                   // does nothing
  map(s => s.trim().toUpperCase()),
  logSuccess                    // logs "Success: HELLO"
);

const failed = await pipe(
  failure('db timeout'),
  logSuccess,                   // does nothing
  logFailure                    // logs "db timeout"
);
```

## Migration from exception-based code

### Pattern 1: Wrap existing code with tryCatch

Use `tryCatch` for operations that may be async or sync. For synchronous-only
operations where you want to avoid Promise overhead, use `tryCatchSync`:

```typescript
import { tryCatch, tryCatchSync } from '@k98kurz/functional-result';

// Wrap both async and sync operations with tryCatch
const fetchData = async () =>
  await tryCatch(async () => {
    const response = await fetch('https://api.example.com');
    return response.json();
  });

const parseJson = async (json: string) =>
  await tryCatch(() => JSON.parse(json));

// Wrap sync operations with tryCatchSync (returns Result directly, no await)
const parseJsonSync = (json: string) =>
  tryCatchSync(() => JSON.parse(json));

// Provide a transformer for richer error context
const safeParse = (json: string) =>
  tryCatchSync(
    () => JSON.parse(json),
    (error) => ({
      type: 'parse_error',
      message: error instanceof Error ? error.message : String(error),
      input: json
    })
  );
```

### Pattern 2: Converting existing error handling

**Before (exception-based):**
```typescript
function getUser(id: number): User {
  const user = db.find(id);
  if (!user) throw new Error('User not found');
  return user;
}

function getPosts(user: User): Post[] {
  return db.posts.filter(p => p.userId === user.id);
}

try {
  const user = getUser(1);
  const posts = getPosts(user);
  return posts;
} catch (error) {
  handleError(error);
}
```

**After (Result-based):**
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

```typescript
import { sequence, success, failure } from '@k98kurz/functional-result';

const results = [
  success(1),
  success(2),
  success(3)
];

const sequenced = sequence(results);
// success([1, 2, 3])

// First failure stops execution
const withFailure = [
  success(1),
  failure('second failed'),
  success(3)
];

const failed = sequence(withFailure);
// failure('second failed') - third item never processes
```

### Traverse: Map arrays with functions that return Results

```typescript
import { traverse } from '@k98kurz/functional-result';

const items = ['1', '2', '3'];
const result = traverse((x: string) => {
  const num = Number(x);
  return isNaN(num) ? failure('Invalid') : success(num * 2);
})(items);
// success([2, 4, 6])
```

Annotate the callback parameter (`(x: string)`): `traverse` is curried, so the
callback is typed at partial application before `items` is in scope, and an
unannotated parameter infers as `unknown`. `sequence(items.map(fn))` is an
equivalent that types the callback from the array instead.

### PartitionResults: Collect all successes and failures

```typescript
import { partitionResults, success, failure } from '@k98kurz/functional-result';

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

```typescript
import { validate, type ValidationError } from '@k98kurz/functional-result';

const emailValidator = validate([
  (value: string) =>
    value.includes('@') ? null : { field: 'email', message: 'Must contain @' },
  (value: string) =>
    value.length >= 3 ? null : { field: 'email', message: 'Too short' }
]);

const valid = emailValidator('test@example.com');
// success('test@example.com')

const invalid = emailValidator('ab');
// failure([
//   { field: 'email', message: 'Must contain @' },
//   { field: 'email', message: 'Too short' }
// ])
```

## Extracting values

### Pattern matching with match/fold

Both are curried. `fold` is an alias of `match` for semantic clarity:

```typescript
import { match, fold } from '@k98kurz/functional-result';

const result = success(42);

const message = match(
  (data: number) => `Success! Got: ${data}`,
  (error: unknown) => `Failed with: ${error}`
)(result);

const finalValue = fold(
  (data: number) => data.toString(),
  (error: unknown) => 'default value'
)(result);
```

Annotate the handler parameters: `match`/`fold` handlers are typed at
application time, so unannotated parameters infer as `unknown`.

### Default values with getOrElse

```typescript
import { getOrElse } from '@k98kurz/functional-result';

const successResult = success(42);
const value = getOrElse(0)(successResult); // 42

const failureResult = failure('error');
const fallback = getOrElse(0)(failureResult); // 0

// defaults need not match the success type exactly (returns T | D):
const maybeNull = getOrElse(null)(maybeNullableResult); // string | null
```

### Exiting the Result paradigm with unwrapResult

Use `unwrapResult` (alias: `getOrThrow`) to convert Results back to
exception-based code:

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

```typescript
const result = await someFunctionReturnsResult();
const ensureError = mapError((err: CustomError) => {
  const error = new Error(err.message);
  error.stack = err.stack || error.stack;
  return error;
});
const data = unwrapResult(ensureError(result));
```

## Type guards

Use type guards to narrow Result types in conditionals:

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
- **Array operations**: `sequence` stops at first failure; use `partitionResults` if you need all failures. Both accept `readonly` arrays
- **mapError exists**: Use `mapError` to transform error values, not `map` (which only transforms success values). A `mapError`/`tapError` handler must cover the full union of errors it may encounter
- **getOrElse defaults**: `getOrElse(defaultValue)` returns `T | D`, so the default need not match the success type exactly (e.g. `getOrElse(null)` on `Result<string | null, E>`)
- **Error widening**: `chain` unions its step's errors with the input's (`Result<T, E>` + step returning `Result<U, F>` → `Result<U, E | F>`); `map` and `tap` preserve the input error type
- **Error propagation**: `pipe` invokes every operation even after a failure — `map`/`chain`/`tap` no-op on a failed Result (while `mapError`/`tapError` still run), which makes steps *appear* skipped
- **Default error type**: `Result<T, E>` defaults `E` to `unknown`; `success(x)` types as `Result<T, never>`, which is assignable to any error type
- **Do NOT nest pipes**: nested calls bypass the typed overloads (ops degrade to `Result<any, any>`) and add needless Promise layers; to carry multiple values across steps, thread a state object (e.g. `{ user, orders }`) — use `map` to update it and `chain` for fallible steps

## Common templates

### API call wrapper

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
    (error) => `API request failed: ${error instanceof Error ? error.message : String(error)}`
  );
};
```

### Validation pipeline

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

```typescript
import { traverse, partitionResults } from '@k98kurz/functional-result';

const processBatch = async (items: string[]) => {
  // Try to process all items
  const results = traverse(processItem)(items);

  // Collect successes and failures separately
  const { successes, failures } = partitionResults(results);

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
