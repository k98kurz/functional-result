/**
 * Functional Result Library
 *
 * A type-safe functional programming library for error handling and
 * composition.
 * Provides Result type with discriminated unions for handling success/failure
 * cases without throwing exceptions.
 *
 * Features:
 * - Type-safe error handling with unknown default error type
 * - Curried functions for point-free style programming
 * - Functional programming operations: map, mapError, tap, tapError, chain,
 *     match, fold, sequence, traverse, validate, partitionResults
 * - Unified async pipe for composing operations
 * - Minimal type assertions
 */

// Core type definition with unknown default error type for better type safety
type Result<T, E = unknown> =
  { success: true; data: T } | { success: false; error: E };

// ValidationError interface for the validate operation
interface ValidationError {
  field: string;
  message: string;
}

/**
 * Creates a successful Result containing the provided data.
 * @template T - The type of the success value
 * @template E - The type of the error value (defaults to `never` because a
 *  success carries no error; `Result<T, never>` is assignable to any
 *  `Result<T, E>`)
 * @param data - The successful value to wrap
 * @returns A Result representing success
 */
const success = <T, E = never>(data: T): Result<T, E> => ({
  success: true,
  data,
});

/**
 * Creates a failed Result containing the provided error.
 * @template T - The type of the success value (defaults to never)
 * @template E - The type of the error value (defaults to unknown)
 * @param error - The error value to wrap
 * @returns A Result representing failure
 */
const failure = <T = never, E = unknown>(error: E): Result<T, E> => ({
  success: false,
  error,
});

/**
 * Transforms the success value of a Result using the provided function.
 * Curried function: first takes the transformation function, then the Result.
 * @template T - Input success type
 * @template U - Output success type
 * @template E - Error type (preserved; inferred when the Result is applied)
 * @param fn - Function to transform the success value
 * @returns Function that takes a Result and returns the transformed Result
 */
const map =
  <T, U>(fn: (data: T) => U) =>
  <E>(result: Result<T, E>): Result<U, E> =>
    result.success ? success(fn(result.data)) : result;

/**
 * Transforms the failure value of a Result using the provided function.
 * Curried function: first takes the transformation function, then the Result.
 * @template T - Input success type (preserved)
 * @template E - Input error type
 * @template F - Output error type
 * @param fn - Function to transform the error value
 * @returns Function that takes a Result and returns the transformed Result
 */
const mapError =
  <T, E, F>(fn: (error: E) => F) =>
  (result: Result<T, E>): Result<T, F> =>
    result.success ? result : failure(fn(result.error));

/**
 * Executes a side-effect callback on success, preserving the Result.
 * Curried function: first takes the callback, then the Result.
 * @template T - Success type
 * @template E - Error type (inferred when the Result is applied)
 * @param fn - Side-effect callback for success values
 * @returns Function that takes a Result and returns the same Result
 */
const tap =
  <T>(fn: (data: T) => void) =>
  <E>(result: Result<T, E>): Result<T, E> => {
    if (result.success) fn(result.data);
    return result;
  };

/**
 * Executes a side-effect callback on failure, preserving the Result.
 * Curried function: first takes the callback, then the Result.
 * @template T - Success type
 * @template E - Error type
 * @param fn - Side-effect callback for error values
 * @returns Function that takes a Result and returns the same Result
 */
const tapError =
  <T, E>(fn: (error: E) => void) =>
  (result: Result<T, E>): Result<T, E> => {
    if (!result.success) fn(result.error);
    return result;
  };

/**
 * Chains operations that may fail, flattening nested Results.
 * Curried function: first takes the chaining function, then the Result.
 * Error types widen: applying to `Result<T, E>` produces `Result<U, E | F>`
 * @template T - Input success type
 * @template U - Output success type
 * @template F - Error type introduced by `fn`
 * @template E - Error type of the input Result (unioned with `F` in output)
 * @param fn - Function that returns a Result
 * @returns Function that takes a Result and returns the chained Result
 */
const chain =
  <T, U, F>(fn: (data: T) => Result<U, F>) =>
  <E>(result: Result<T, E>): Result<U, E | F> =>
    result.success ? fn(result.data) : result;

/**
 * Pattern matching for Results - executes one of two functions based on Result
 * type.
 * Curried function: first takes success/failure handlers, then the Result.
 * @template T - Success type
 * @template E - Error type
 * @template R - Return type
 * @param onSuccess - Function to execute on success
 * @param onFailure - Function to execute on failure
 * @returns Function that takes a Result and returns the result of pattern
 *  matching
 */
const match =
  <T, E, R>(onSuccess: (data: T) => R, onFailure: (error: E) => R) =>
  (result: Result<T, E>): R =>
    result.success ? onSuccess(result.data) : onFailure(result.error);

/**
 * Folds a Result into a single value using the provided functions.
 * Curried function: first takes success/failure handlers, then the Result.
 * Alias for match with more semantic meaning for final value extraction.
 * @template T - Success type
 * @template E - Error type
 * @template R - Return type
 * @param onSuccess - Function to execute on success
 * @param onFailure - Function to execute on failure
 * @returns Function that takes a Result and returns the folded value
 */
const fold = match;

/**
 * Takes a sequence of Results, returning all success values or first failure.
 * @template T - Success type of individual Results
 * @template E - Error type
 * @param results - Array of Results to sequence
 * @returns Result containing array of success values or first failure
 *  encountered
 */
const sequence = <T, E>(results: Result<T, E>[]): Result<T[], E> => {
  const acc: T[] = [];
  for (const result of results) {
    if (!result.success) return result;
    acc.push(result.data);
  }
  return success(acc);
};

/**
 * Maps an array using a function that returns Results, then sequences the
 * results.
 * Curried function: first takes the mapping function, then the array.
 * @template T - Input array element type
 * @template U - Output Result success type
 * @template E - Error type
 * @param fn - Function that maps array elements to Results
 * @returns Function that takes an array and returns a sequenced Result
 */
const traverse =
  <T, U, E>(fn: (item: T) => Result<U, E>) =>
  (items: T[]): Result<U[], E> =>
    sequence(items.map(fn));

/**
 * Partitions an array of Results into successes and failures.
 * Useful when you want to collect all successful results while still handling
 * failures separately.
 * @template T - Success type of individual Results
 * @template E - Error type
 * @param results - Array of Results to partition
 * @returns {{ successes: T[], failures: E[] }} Object with `successes`
 *  array and `failures` array of error values
 */
const partitionResults = <T, E>(
  results: Result<T, E>[]
): {
  successes: T[];
  failures: E[];
} => {
  const successes: T[] = [];
  const failures: E[] = [];
  for (const result of results) {
    if (result.success) {
      successes.push(result.data);
    } else {
      failures.push(result.error);
    }
  }
  return { successes, failures };
};

/**
 * Validates a value against an array of validator functions.
 * Curried function: first takes validators, then the value to validate.
 * @template T - Type of value to validate
 * @param validators - Array of validator functions that return ValidationError
 *  or null
 * @returns Function that takes a value and returns a Result with success value
 *  T or an array of ValidationError on failure
 */
const validate =
  <T>(validators: ((t: T) => ValidationError | null)[]) =>
  (value: T): Result<T, ValidationError[]> => {
    const errors = validators
      .map(v => v(value))
      .filter((v): v is ValidationError => v !== null);
    return errors.length > 0 ? failure(errors) : success(value);
  };

/**
 * Type guard to check if a Result is successful and narrow its type.
 * @template T - Success type
 * @template E - Error type
 * @param result - Result to check
 * @returns True if Result is successful
 */
const isSuccess = <T, E>(
  result: Result<T, E>
): result is { success: true; data: T } => result.success;

/**
 * Type guard to check if a Result is a failure and narrow its type.
 * @template T - Success type
 * @template E - Error type
 * @param result - Result to check
 * @returns True if Result is a failure
 */
const isFailure = <T, E>(
  result: Result<T, E>
): result is { success: false; error: E } => !result.success;

/**
 * Wraps a function in a try-catch block, returning a Result.
 * Handles both synchronous and asynchronous functions with a unified interface.
 *
 * Without a transformer, the error type defaults to unknown for maximum type
 * safety. Provide a transformer to narrow the error type.
 *
 * @example
 * ```typescript
 * const syncResult = await tryCatch(() => 42)
 * const asyncResult = await tryCatch(async () => 42)
 * const result = await tryCatch(
 *   () => riskyOperation(),
 *   error => `Custom: ${error}`
 * )
 * ```
 *
 * @template T - Return type of the function
 * @template E - Error type (defaults to unknown without a transformer)
 * @param fn - Function to wrap (sync or async)
 * @param [errorTransformer] - Function to transform caught errors
 * @returns Promise resolving to a Result
 */
function tryCatch<T>(fn: () => Promise<T>): Promise<Result<T, unknown>>;
function tryCatch<T>(fn: () => T): Promise<Result<T, unknown>>;
function tryCatch<T, E>(
  fn: () => Promise<T>,
  errorTransformer: (error: unknown) => E
): Promise<Result<T, E>>;
function tryCatch<T, E>(
  fn: () => T,
  errorTransformer: (error: unknown) => E
): Promise<Result<T, E>>;

async function tryCatch<T, E = unknown>(
  fn: (() => T) | (() => Promise<T>),
  errorTransformer?: (error: unknown) => E
): Promise<Result<T, E>> {
  try {
    const data = await Promise.resolve(fn());
    return success<T, E>(data);
  } catch (error) {
    const transformedError = errorTransformer
      ? errorTransformer(error)
      : (error as E);
    return failure<T, E>(transformedError);
  }
}

/**
 * Wraps a function in a try-catch block, returning a Result.
 * Sync-only version of tryCatch; cannot use async within it.
 *
 * Example: `const result = tryCatchSync(() => 123)` (no `await`)
 *
 * @template T - Return type of the function
 * @template E - Error type (defaults to unknown without a transformer)
 * @param fn - Function to wrap (sync only)
 * @param [errorTransformer] - Function to transform caught errors
 * @returns Result
 */
function tryCatchSync<T>(fn: () => T): Result<T, unknown>;
function tryCatchSync<T, E>(
  fn: () => T,
  errorTransformer: (error: unknown) => E
): Result<T, E>;

function tryCatchSync<T, E = unknown>(
  fn: () => T,
  errorTransformer?: (error: unknown) => E
): Result<T, E> {
  try {
    const data = fn();
    if (data instanceof Promise)
      throw new Error('tryCatchSync received a Promise - use tryCatch instead');
    return success<T, E>(data);
  } catch (error) {
    const transformedError = errorTransformer
      ? errorTransformer(error)
      : (error as E);
    return failure<T, E>(transformedError);
  }
}

/**
 * Extracts the success value or returns a default value.
 * Curried function: first takes default value, then the Result.
 * @template T - Success type
 * @template E - Error type
 * @param defaultValue - Default value to return on failure
 * @returns Function that takes a Result and returns the value or default
 */
const getOrElse =
  <T>(defaultValue: T) =>
  <E>(result: Result<T, E>): T =>
    result.success ? result.data : defaultValue;

/**
 * Extracts the success value from a Result or throws the error.
 * @template T - Success type
 * @template E - Error type
 * @param result - The Result to extract from
 * @returns The success value
 * @throws The error value if Result is a failure
 */
const unwrapResult = <T, E>(result: Result<T, E>): T => {
  if (result.success) return result.data;
  // eslint-disable-next-line @typescript-eslint/only-throw-error
  throw result.error;
};

/**
 * Alias for unwrapResult - extracts the success value or throws the error.
 * @template T - Success type
 * @template E - Error type
 * @param result - The Result to extract from
 * @returns The success value
 * @throws The error value if Result is a failure
 */
const getOrThrow = unwrapResult;

/**
 * Unified pipe function for composing Result operations. Handles both
 * synchronous and asynchronous operations through Promise resolution. Provides
 * overloads for up to 10 operations for proper type inference through the
 * chain.
 * Falls back gracefully for longer chains (`Promise<Result<any, any>>`).
 * @template T - Initial success type
 * @template E - Error type of the initial Result; steps may widen it via
 *  `chain`, and the output error type tracks the final operation
 * @param initial - Initial Result or Promise<Result>
 * @param operations - Operations that transform Results
 * @returns Promise resolving to the final Result
 */
function pipe<T, E>(
  initial: Result<T, E> | Promise<Result<T, E>>
): Promise<Result<T, E>>;
function pipe<T, E, T1, E1>(
  initial: Result<T, E> | Promise<Result<T, E>>,
  op1: (r: Result<T, E>) => Result<T1, E1> | Promise<Result<T1, E1>>
): Promise<Result<T1, E1>>;
function pipe<T, E, T1, E1, T2, E2>(
  initial: Result<T, E> | Promise<Result<T, E>>,
  op1: (r: Result<T, E>) => Result<T1, E1> | Promise<Result<T1, E1>>,
  op2: (r: Result<T1, E1>) => Result<T2, E2> | Promise<Result<T2, E2>>
): Promise<Result<T2, E2>>;
function pipe<T, E, T1, E1, T2, E2, T3, E3>(
  initial: Result<T, E> | Promise<Result<T, E>>,
  op1: (r: Result<T, E>) => Result<T1, E1> | Promise<Result<T1, E1>>,
  op2: (r: Result<T1, E1>) => Result<T2, E2> | Promise<Result<T2, E2>>,
  op3: (r: Result<T2, E2>) => Result<T3, E3> | Promise<Result<T3, E3>>
): Promise<Result<T3, E3>>;
function pipe<T, E, T1, E1, T2, E2, T3, E3, T4, E4>(
  initial: Result<T, E> | Promise<Result<T, E>>,
  op1: (r: Result<T, E>) => Result<T1, E1> | Promise<Result<T1, E1>>,
  op2: (r: Result<T1, E1>) => Result<T2, E2> | Promise<Result<T2, E2>>,
  op3: (r: Result<T2, E2>) => Result<T3, E3> | Promise<Result<T3, E3>>,
  op4: (r: Result<T3, E3>) => Result<T4, E4> | Promise<Result<T4, E4>>
): Promise<Result<T4, E4>>;
function pipe<T, E, T1, E1, T2, E2, T3, E3, T4, E4, T5, E5>(
  initial: Result<T, E> | Promise<Result<T, E>>,
  op1: (r: Result<T, E>) => Result<T1, E1> | Promise<Result<T1, E1>>,
  op2: (r: Result<T1, E1>) => Result<T2, E2> | Promise<Result<T2, E2>>,
  op3: (r: Result<T2, E2>) => Result<T3, E3> | Promise<Result<T3, E3>>,
  op4: (r: Result<T3, E3>) => Result<T4, E4> | Promise<Result<T4, E4>>,
  op5: (r: Result<T4, E4>) => Result<T5, E5> | Promise<Result<T5, E5>>
): Promise<Result<T5, E5>>;
function pipe<T, E, T1, E1, T2, E2, T3, E3, T4, E4, T5, E5, T6, E6>(
  initial: Result<T, E> | Promise<Result<T, E>>,
  op1: (r: Result<T, E>) => Result<T1, E1> | Promise<Result<T1, E1>>,
  op2: (r: Result<T1, E1>) => Result<T2, E2> | Promise<Result<T2, E2>>,
  op3: (r: Result<T2, E2>) => Result<T3, E3> | Promise<Result<T3, E3>>,
  op4: (r: Result<T3, E3>) => Result<T4, E4> | Promise<Result<T4, E4>>,
  op5: (r: Result<T4, E4>) => Result<T5, E5> | Promise<Result<T5, E5>>,
  op6: (r: Result<T5, E5>) => Result<T6, E6> | Promise<Result<T6, E6>>
): Promise<Result<T6, E6>>;
function pipe<T, E, T1, E1, T2, E2, T3, E3, T4, E4, T5, E5, T6, E6, T7, E7>(
  initial: Result<T, E> | Promise<Result<T, E>>,
  op1: (r: Result<T, E>) => Result<T1, E1> | Promise<Result<T1, E1>>,
  op2: (r: Result<T1, E1>) => Result<T2, E2> | Promise<Result<T2, E2>>,
  op3: (r: Result<T2, E2>) => Result<T3, E3> | Promise<Result<T3, E3>>,
  op4: (r: Result<T3, E3>) => Result<T4, E4> | Promise<Result<T4, E4>>,
  op5: (r: Result<T4, E4>) => Result<T5, E5> | Promise<Result<T5, E5>>,
  op6: (r: Result<T5, E5>) => Result<T6, E6> | Promise<Result<T6, E6>>,
  op7: (r: Result<T6, E6>) => Result<T7, E7> | Promise<Result<T7, E7>>
): Promise<Result<T7, E7>>;
function pipe<
  T,
  E,
  T1,
  E1,
  T2,
  E2,
  T3,
  E3,
  T4,
  E4,
  T5,
  E5,
  T6,
  E6,
  T7,
  E7,
  T8,
  E8,
>(
  initial: Result<T, E> | Promise<Result<T, E>>,
  op1: (r: Result<T, E>) => Result<T1, E1> | Promise<Result<T1, E1>>,
  op2: (r: Result<T1, E1>) => Result<T2, E2> | Promise<Result<T2, E2>>,
  op3: (r: Result<T2, E2>) => Result<T3, E3> | Promise<Result<T3, E3>>,
  op4: (r: Result<T3, E3>) => Result<T4, E4> | Promise<Result<T4, E4>>,
  op5: (r: Result<T4, E4>) => Result<T5, E5> | Promise<Result<T5, E5>>,
  op6: (r: Result<T5, E5>) => Result<T6, E6> | Promise<Result<T6, E6>>,
  op7: (r: Result<T6, E6>) => Result<T7, E7> | Promise<Result<T7, E7>>,
  op8: (r: Result<T7, E7>) => Result<T8, E8> | Promise<Result<T8, E8>>
): Promise<Result<T8, E8>>;
function pipe<
  T,
  E,
  T1,
  E1,
  T2,
  E2,
  T3,
  E3,
  T4,
  E4,
  T5,
  E5,
  T6,
  E6,
  T7,
  E7,
  T8,
  E8,
  T9,
  E9,
>(
  initial: Result<T, E> | Promise<Result<T, E>>,
  op1: (r: Result<T, E>) => Result<T1, E1> | Promise<Result<T1, E1>>,
  op2: (r: Result<T1, E1>) => Result<T2, E2> | Promise<Result<T2, E2>>,
  op3: (r: Result<T2, E2>) => Result<T3, E3> | Promise<Result<T3, E3>>,
  op4: (r: Result<T3, E3>) => Result<T4, E4> | Promise<Result<T4, E4>>,
  op5: (r: Result<T4, E4>) => Result<T5, E5> | Promise<Result<T5, E5>>,
  op6: (r: Result<T5, E5>) => Result<T6, E6> | Promise<Result<T6, E6>>,
  op7: (r: Result<T6, E6>) => Result<T7, E7> | Promise<Result<T7, E7>>,
  op8: (r: Result<T7, E7>) => Result<T8, E8> | Promise<Result<T8, E8>>,
  op9: (r: Result<T8, E8>) => Result<T9, E9> | Promise<Result<T9, E9>>
): Promise<Result<T9, E9>>;
function pipe<
  T,
  E,
  T1,
  E1,
  T2,
  E2,
  T3,
  E3,
  T4,
  E4,
  T5,
  E5,
  T6,
  E6,
  T7,
  E7,
  T8,
  E8,
  T9,
  E9,
  T10,
  E10,
>(
  initial: Result<T, E> | Promise<Result<T, E>>,
  op1: (r: Result<T, E>) => Result<T1, E1> | Promise<Result<T1, E1>>,
  op2: (r: Result<T1, E1>) => Result<T2, E2> | Promise<Result<T2, E2>>,
  op3: (r: Result<T2, E2>) => Result<T3, E3> | Promise<Result<T3, E3>>,
  op4: (r: Result<T3, E3>) => Result<T4, E4> | Promise<Result<T4, E4>>,
  op5: (r: Result<T4, E4>) => Result<T5, E5> | Promise<Result<T5, E5>>,
  op6: (r: Result<T5, E5>) => Result<T6, E6> | Promise<Result<T6, E6>>,
  op7: (r: Result<T6, E6>) => Result<T7, E7> | Promise<Result<T7, E7>>,
  op8: (r: Result<T7, E7>) => Result<T8, E8> | Promise<Result<T8, E8>>,
  op9: (r: Result<T8, E8>) => Result<T9, E9> | Promise<Result<T9, E9>>,
  op10: (r: Result<T9, E9>) => Result<T10, E10> | Promise<Result<T10, E10>>
): Promise<Result<T10, E10>>;

/* eslint-disable @typescript-eslint/no-explicit-any */
async function pipe<T, E>(
  initial: Result<T, E> | Promise<Result<T, E>>,
  ...operations: Array<
    (result: Result<any, any>) => Result<any, any> | Promise<Result<any, any>>
  >
): Promise<Result<any, any>> {
  /* eslint-enable @typescript-eslint/no-explicit-any */
  let current = await Promise.resolve(initial);
  for (const operation of operations) {
    current = await Promise.resolve(operation(current));
  }
  return current;
}

// Export everything
export type { Result, ValidationError };
export {
  success,
  failure,
  map,
  mapError,
  tap,
  tapError,
  chain,
  match,
  fold,
  sequence,
  traverse,
  partitionResults,
  validate,
  isSuccess,
  isFailure,
  tryCatch,
  tryCatchSync,
  getOrElse,
  getOrThrow,
  unwrapResult,
  pipe,
};
